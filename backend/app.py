from __future__ import annotations

import asyncio
import os
import secrets
import string
import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.websockets import WebSocketState
from pydantic import BaseModel, Field, validator

from blackjack import BlackjackError, BlackjackEngine, engine

_raw_origins = os.getenv("CORS_ALLOW_ORIGINS", "")
_configured_origins = [origin.strip() for origin in _raw_origins.split(",") if origin.strip()]
DEFAULT_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]
ALLOWED_ORIGINS = _configured_origins or DEFAULT_ORIGINS

app = FastAPI(title="Casinito Blackjack API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|192\.168\.[0-9]{1,3}\.[0-9]{1,3})(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class StartRequest(BaseModel):
    amount: int


@app.get("/state")
def get_state():
    return engine.state()


@app.post("/start")
def start_round(payload: StartRequest):
    try:
        return engine.start_round(payload.amount)
    except BlackjackError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/hit")
def hit():
    try:
        return engine.hit()
    except BlackjackError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/stand")
def stand():
    try:
        return engine.stand()
    except BlackjackError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/double")
def double_down():
    try:
        return engine.double()
    except BlackjackError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


ROOM_CODE_ALPHABET = string.ascii_uppercase + string.digits
ROOM_CODE_LENGTH = 4
PLAYER_NAME_MAX = 20


def _generate_room_code() -> str:
    return "".join(secrets.choice(ROOM_CODE_ALPHABET) for _ in range(ROOM_CODE_LENGTH))


def _sanitize_name(name: str) -> str:
    clean = name.strip()
    if not clean:
        raise HTTPException(status_code=400, detail="Name is required")
    if len(clean) > PLAYER_NAME_MAX:
        clean = clean[:PLAYER_NAME_MAX]
    return clean


@dataclass
class Player:
    player_id: str
    name: str
    online: bool = False


@dataclass
class Room:
    code: str
    visibility: str
    host_name: str
    players: Dict[str, Player] = field(default_factory=dict)
    player_engines: Dict[str, BlackjackEngine] = field(default_factory=dict)
    # Shared round mechanics
    min_bet: int = 5
    active: bool = False
    deck: List[str] = field(default_factory=list)
    dealer: List[str] = field(default_factory=list)
    order: List[str] = field(default_factory=list)
    turn_index: int = -1
    # per-player seat state
    seats: Dict[str, "Seat"] = field(default_factory=dict)
    # outcomes at end of round: player_id -> { outcome: 'win'|'push'|'lose', blackjack: bool }
    outcomes: Dict[str, Dict[str, object]] = field(default_factory=dict)
    # betting and phase control
    phase: str = "betting"  # 'betting' | 'playing' | 'settled'
    bet_order: List[str] = field(default_factory=list)
    bet_index: int = 0

    def serialise(self, include_games: bool = False) -> Dict[str, object]:
        players_payload: List[Dict[str, object]] = []
        for player in self.players.values():
            entry: Dict[str, object] = {
                "playerId": player.player_id,
                "name": player.name,
                "online": player.online,
            }
            if include_games:
                engine_instance = self.player_engines.get(player.player_id)
                if engine_instance:
                    entry["state"] = engine_instance.snapshot(mask_player=False)
                    entry["publicState"] = engine_instance.snapshot(mask_player=True)
                else:
                    entry["state"] = None
                    entry["publicState"] = None
            players_payload.append(entry)
        return {
            "roomCode": self.code,
            "visibility": self.visibility,
            "hostName": self.host_name,
            "players": players_payload,
        }



class CreateRoomRequest(BaseModel):
    # Optional now; default to private if omitted
    visibility: Optional[str] = Field(default=None, pattern=r"^(public|private)$")
    hostName: str

    @validator("hostName")
    def validate_name(cls, value: str) -> str:
        clean = value.strip()
        if not clean:
            raise ValueError("hostName required")
        if len(clean) > PLAYER_NAME_MAX:
            clean = clean[:PLAYER_NAME_MAX]
        return clean


class CreateRoomResponse(BaseModel):
    roomCode: str
    joinUrlPath: str


class JoinRoomRequest(BaseModel):
    name: str

    @validator("name")
    def validate_join_name(cls, value: str) -> str:
        clean = value.strip()
        if not clean:
            raise ValueError("name required")
        if len(clean) > PLAYER_NAME_MAX:
            clean = clean[:PLAYER_NAME_MAX]
        return clean


class JoinRoomResponse(BaseModel):
    roomCode: str
    playerId: str


class RoomInfoResponse(BaseModel):
    roomCode: str
    visibility: str
    hostName: str
    players: List[Dict[str, object]]


rooms: Dict[str, Room] = {}
room_lock = asyncio.Lock()
room_connections: Dict[str, Dict[str, WebSocket]] = {}


async def _broadcast_room_state(room_code: str) -> None:
    room = rooms.get(room_code)
    if not room:
        return
    payload = {"type": "room_state", "room": room.serialise(include_games=True)}
    for ws in list(room_connections.get(room_code, {}).values()):
        if ws.application_state == WebSocketState.CONNECTED:
            await ws.send_json(payload)


@app.post("/rooms", response_model=CreateRoomResponse)
async def create_room(payload: CreateRoomRequest):
    async with room_lock:
        for _ in range(10):
            code = _generate_room_code()
            if code not in rooms:
                break
        else:
            raise HTTPException(status_code=500, detail="Could not allocate room code")

        visibility = payload.visibility or "private"
        room = Room(code=code, visibility=visibility, host_name=payload.hostName)
        rooms[code] = room
        room_connections.setdefault(code, {})

    return CreateRoomResponse(roomCode=code, joinUrlPath=f"/join/{code}")


@app.get("/rooms/{room_code}", response_model=RoomInfoResponse)
async def get_room(room_code: str):
    room = rooms.get(room_code.upper())
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return RoomInfoResponse(**room.serialise())


@app.post("/rooms/{room_code}/join", response_model=JoinRoomResponse)
async def join_room(room_code: str, payload: JoinRoomRequest):
    code = room_code.upper()
    room = rooms.get(code)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    player_name = _sanitize_name(payload.name)

    async with room_lock:
        reusable = None
        for existing in room.players.values():
            if existing.name.lower() == player_name.lower():
                reusable = existing
                break

        if reusable:
            player_id = reusable.player_id
            reusable.name = player_name
            reusable.online = False
        else:
            player_id = uuid.uuid4().hex
            room.players[player_id] = Player(player_id=player_id, name=player_name, online=False)

    await _broadcast_room_state(code)
    return JoinRoomResponse(roomCode=code, playerId=player_id)


@app.websocket("/ws/{room_code}")
async def websocket_room(room_code: str, websocket: WebSocket, playerId: str):
    code = room_code.upper()
    room = rooms.get(code)
    if not room:
        await websocket.close(code=4404)
        return

    player = room.players.get(playerId)
    if not player:
        await websocket.close(code=4403)
        return

    await websocket.accept()
    player.online = True
    room_connections.setdefault(code, {})[playerId] = websocket
    await _broadcast_room_state(code)

    try:
        while True:
            message = await websocket.receive_json()
            await websocket.send_json({"type": "ack", "received": message})
    except WebSocketDisconnect:
        pass
    finally:
        if room_connections.get(code, {}).get(playerId) is websocket:
            room_connections[code].pop(playerId, None)
        player.online = False
        await _broadcast_room_state(code)


def _get_room_or_404(room_code: str) -> Room:
    code = room_code.upper()
    room = rooms.get(code)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room


def _get_player_or_404(room: Room, player_id: str) -> Player:
    player = room.players.get(player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player


def _get_player_engine(room: Room, player_id: str) -> BlackjackEngine:
    eng = room.player_engines.get(player_id)
    if eng is None:
        eng = BlackjackEngine()
        room.player_engines[player_id] = eng
    return eng


# ---------------------- Shared round utilities ----------------------

@dataclass
class Seat:
    player_id: str
    name: str
    bankroll: int = 5000
    bet: int = 0
    cards: List[str] = field(default_factory=list)
    standing: bool = False
    busted: bool = False


def _build_deck() -> List[str]:
    ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
    suits = ["S", "H", "D", "C"]
    deck = [f"{r}_{s}" for r in ranks for s in suits]
    import random

    random.shuffle(deck)
    return deck


def _card_value(code: str) -> int:
    r = code.split("_")[0]
    if r in ("J", "Q", "K"):
        return 10
    if r == "A":
        return 11
    return int(r)


def _hand_value(cards: List[str]) -> int:
    total = 0
    aces = 0
    for c in cards:
        if c == "BACK":
            continue
        v = _card_value(c)
        if v == 11:
            aces += 1
        total += v
    while total > 21 and aces > 0:
        total -= 10
        aces -= 1
    return total


def _ensure_seat(room: Room, player: Player) -> Seat:
    seat = room.seats.get(player.player_id)
    if not seat:
        seat = Seat(player_id=player.player_id, name=player.name)
        room.seats[player.player_id] = seat
    # Keep name in sync
    seat.name = player.name
    return seat


def _current_player(room: Room) -> Optional[Seat]:
    if not room.active or room.turn_index < 0 or room.turn_index >= len(room.order):
        return None
    pid = room.order[room.turn_index]
    return room.seats.get(pid)


def _deal_one(room: Room) -> str:
    if not room.deck:
        room.deck = _build_deck()
    return room.deck.pop()


def _all_ready(room: Room) -> bool:
    active_players = [p for p in room.players.values() if _ensure_seat(room, p).bankroll > 0]
    if not active_players:
        return False
    return all(_ensure_seat(room, p).bet >= room.min_bet for p in active_players)


def _is_host(room: Room, player: Player) -> bool:
    return player.name.strip().lower() == (room.host_name or "").strip().lower()


def _build_client_state(room: Room, me: Player) -> Dict[str, object]:
    seat = _ensure_seat(room, me)
    turn = _current_player(room)
    # Dealer masking: if active and has 2+, mask second
    dealer_cards = list(room.dealer)
    if room.active and len(dealer_cards) >= 2:
        dealer_cards = dealer_cards[:]
        dealer_cards[1] = "BACK"

    others: List[Dict[str, object]] = []
    for pid, p in room.players.items():
        if pid == me.player_id:
            continue
        s = _ensure_seat(room, p)
        c1 = s.cards[0] if len(s.cards) > 0 else "BACK"
        c2 = s.cards[1] if len(s.cards) > 1 else "BACK"
        # Reveal others if their turn already passed or round finished
        finished_index = (room.turn_index if room.turn_index is not None else 0)
        try:
            idx = room.order.index(p.player_id)
        except ValueError:
            idx = 999
        reveal_now = (room.phase != "playing") or (idx < room.turn_index)
        others.append({
            "id": s.player_id,
            "name": s.name,
            "cards": [c1, c2],
            "revealed": bool(reveal_now),
        })

    # Betting turn info
    current_bettor_name = ""
    my_bet_turn = False
    if room.phase == "betting":
        if room.bet_order:
            if 0 <= room.bet_index < len(room.bet_order):
                curr_id = room.bet_order[room.bet_index]
                my_bet_turn = (curr_id == me.player_id)
                p_curr = room.players.get(curr_id)
                current_bettor_name = p_curr.name if p_curr else ""
        else:
            # No one has bet yet: host starts
            host_pid = None
            host_name = room.host_name or ""
            for pid, p in room.players.items():
                if _is_host(room, p):
                    host_pid = pid
                    current_bettor_name = p.name
                    break
            if host_pid:
                my_bet_turn = (host_pid == me.player_id)

    payload = {
        "bankroll": seat.bankroll,
        "bet": seat.bet,
        "minBet": room.min_bet,
        "dealer": dealer_cards,
        "dealerValue": _hand_value([c for c in dealer_cards if c != "BACK"]),
        "player": list(seat.cards),
        "playerValue": _hand_value(seat.cards),
        "others": others,
        "myTurn": room.active and turn is not None and turn.player_id == seat.player_id,
        "currentPlayerName": (turn.name if room.active and turn is not None else ""),
        "active": room.active,
        "phase": room.phase,
        "myBetTurn": my_bet_turn,
        "currentBettorName": current_bettor_name,
        "isHost": (me.name.strip().lower() == (room.host_name or "").strip().lower()),
    }
    # attach outcome if available at end of round
    result = room.outcomes.get(seat.player_id)
    if result:
        payload["outcome"] = result.get("outcome")
        payload["blackjack"] = bool(result.get("blackjack"))
    return payload


@app.get("/rooms/{room_code}/players/{player_id}/state")
async def get_player_state(room_code: str, player_id: str):
    room = _get_room_or_404(room_code)
    player = _get_player_or_404(room, player_id)
    # Ensure seat exists
    _ensure_seat(room, player)
    return _build_client_state(room, player)


@app.post("/rooms/{room_code}/players/{player_id}/start")
async def player_start_round(room_code: str, player_id: str, payload: StartRequest, force: bool = False):
    room = _get_room_or_404(room_code)
    player = _get_player_or_404(room, player_id)
    seat = _ensure_seat(room, player)
    # Betting phase only
    if room.phase not in ("betting", "settled"):
        raise HTTPException(status_code=400, detail="Cannot bet now")
    if room.phase == "settled":
        # reset to betting for a new round, host starts again
        room.phase = "betting"
        room.bet_order = []
        room.bet_index = 0
        room.dealer = []
        room.active = False
        room.turn_index = -1
        room.order = []
    if payload.amount < room.min_bet:
        raise HTTPException(status_code=400, detail="Bet below minimum")
    if payload.amount > seat.bankroll:
        raise HTTPException(status_code=400, detail="Insufficient bankroll")
    # Establish bet order with host first on first bet
    if not room.bet_order:
        # host first, then others by name
        host_pid = None
        for pid, p in room.players.items():
            if _is_host(room, p):
                host_pid = pid
                break
        other_pids = [pid for pid in room.players.keys() if pid != host_pid]
        room.bet_order = [pid for pid in ([host_pid] + other_pids) if pid]
        room.bet_index = 0
    # Enforce betting turn unless host forces
    if room.bet_order and 0 <= room.bet_index < len(room.bet_order):
        expected = room.bet_order[room.bet_index]
        if expected != player.player_id and not (_is_host(room, player) and force):
            raise HTTPException(status_code=400, detail="Not your betting turn")
    seat.bet = payload.amount
    # Advance betting cursor
    room.bet_index += 1
    # If still betting pending, just broadcast state
    if room.bet_index < len(room.bet_order):
        await _broadcast_room_state(room.code)
        return _build_client_state(room, player)

    # All bets collected -> start playing
    room.active = True
    room.phase = "playing"
    room.deck = _build_deck()
    room.outcomes = {}
    # Prepare seats
    participants: List[Seat] = []
    for pid in room.bet_order:
        p = room.players.get(pid)
        if not p:
            continue
        s = _ensure_seat(room, p)
        s.cards = []
        s.standing = False
        s.busted = False
        if s.bet >= room.min_bet:
            participants.append(s)
    if not participants:
        raise HTTPException(status_code=400, detail="No participants ready")
    # Initial deal: 2 to each, 2 to dealer
    for _ in range(2):
        for s in participants:
            s.cards.append(_deal_one(room))
    room.dealer = [_deal_one(room), _deal_one(room)]
    room.order = [s.player_id for s in participants]
    room.turn_index = 0

    await _broadcast_room_state(room.code)
    return _build_client_state(room, player)


@app.post("/rooms/{room_code}/players/{player_id}/hit")
async def player_hit(room_code: str, player_id: str):
    room = _get_room_or_404(room_code)
    player = _get_player_or_404(room, player_id)
    if not room.active:
        raise HTTPException(status_code=400, detail="No active round")
    seat = _ensure_seat(room, player)
    turn = _current_player(room)
    if not turn or turn.player_id != seat.player_id:
        raise HTTPException(status_code=400, detail="Not your turn")
    seat.cards.append(_deal_one(room))
    if _hand_value(seat.cards) >= 21:
        # advance
        room.turn_index += 1
        if room.turn_index >= len(room.order):
            _finish_dealer_and_settle(room)
    await _broadcast_room_state(room.code)
    return _build_client_state(room, player)


@app.post("/rooms/{room_code}/players/{player_id}/stand")
async def player_stand(room_code: str, player_id: str):
    room = _get_room_or_404(room_code)
    player = _get_player_or_404(room, player_id)
    if not room.active:
        raise HTTPException(status_code=400, detail="No active round")
    seat = _ensure_seat(room, player)
    turn = _current_player(room)
    if not turn or turn.player_id != seat.player_id:
        raise HTTPException(status_code=400, detail="Not your turn")
    seat.standing = True
    room.turn_index += 1
    if room.turn_index >= len(room.order):
        _finish_dealer_and_settle(room)
    await _broadcast_room_state(room.code)
    return _build_client_state(room, player)


@app.post("/rooms/{room_code}/players/{player_id}/double")
async def player_double(room_code: str, player_id: str):
    room = _get_room_or_404(room_code)
    player = _get_player_or_404(room, player_id)
    if not room.active:
        raise HTTPException(status_code=400, detail="No active round")
    seat = _ensure_seat(room, player)
    turn = _current_player(room)
    if not turn or turn.player_id != seat.player_id:
        raise HTTPException(status_code=400, detail="Not your turn")
    if len(seat.cards) != 2:
        raise HTTPException(status_code=400, detail="Can only double on first turn")
    if seat.bankroll < seat.bet:
        raise HTTPException(status_code=400, detail="Insufficient bankroll to double")
    seat.bet *= 2
    seat.cards.append(_deal_one(room))
    room.turn_index += 1
    if room.turn_index >= len(room.order):
        _finish_dealer_and_settle(room)
    await _broadcast_room_state(room.code)
    return _build_client_state(room, player)


def _finish_dealer_and_settle(room: Room) -> None:
    # Dealer reveals; check blackjack
    dealer_val = _hand_value(room.dealer)
    dealer_blackjack = (len(room.dealer) == 2 and dealer_val == 21)

    if not dealer_blackjack:
        # Dealer plays to 17 only if no blackjack
        while _hand_value(room.dealer) < 17:
            room.dealer.append(_deal_one(room))
        dealer_val = _hand_value(room.dealer)

    # Settle bets with blackjack 3:2
    room.outcomes = {}
    for pid in room.order:
        seat = room.seats.get(pid)
        if not seat:
            continue
        player_val = _hand_value(seat.cards)
        player_blackjack = (len(seat.cards) == 2 and player_val == 21)

        outcome = "push"
        bj_flag = False

        if dealer_blackjack or player_blackjack:
            if dealer_blackjack and player_blackjack:
                outcome = "push"
            elif player_blackjack and not dealer_blackjack:
                # Pay 3:2
                win_amt = int(round(seat.bet * 1.5))
                seat.bankroll += win_amt
                outcome = "win"
                bj_flag = True
            else:
                # dealer blackjack only
                seat.bankroll -= seat.bet
                outcome = "lose"
        else:
            # normal resolution
            if player_val > 21:
                seat.bankroll -= seat.bet
                outcome = "lose"
            elif dealer_val > 21 or player_val > dealer_val:
                seat.bankroll += seat.bet
                outcome = "win"
            elif player_val < dealer_val:
                seat.bankroll -= seat.bet
                outcome = "lose"
            else:
                outcome = "push"

        room.outcomes[pid] = {"outcome": outcome, "blackjack": bj_flag}
        # reset apuesta para siguiente ronda
        seat.bet = 0
    room.active = False
    room.turn_index = -1
    room.order = []
    room.phase = "settled"
    # Reset betting cursor so next round starts with host again
    room.bet_index = 0

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)



