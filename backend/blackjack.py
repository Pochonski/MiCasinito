from __future__ import annotations

import random
from typing import Dict, List, Optional

RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "jack", "queen", "king", "ace"]
SUITS = ["clubs", "diamonds", "hearts", "spades"]
MIN_DECK_CARDS = 13
MIN_BET = 5


class BlackjackError(Exception):
    """Lightweight domain error for invalid gameplay actions."""


def _rank_points(rank: str) -> int:
    if rank in {"jack", "queen", "king"}:
        return 10
    if rank == "ace":
        return 11
    return int(rank)


class Deck:
    def __init__(self) -> None:
        self.cards: List[str] = []
        self._build()

    def _build(self) -> None:
        self.cards = [f"{rank}_of_{suit}" for suit in SUITS for rank in RANKS]
        random.shuffle(self.cards)

    def draw(self) -> str:
        if not self.cards:
            self._build()
        return self.cards.pop()

    def ensure_depth(self) -> None:
        if len(self.cards) < MIN_DECK_CARDS:
            self._build()


class Hand:
    def __init__(self) -> None:
        self.cards: List[str] = []

    def add_card(self, card: str) -> None:
        self.cards.append(card)

    @property
    def value(self) -> int:
        total = 0
        aces = 0
        for card in self.cards:
            rank = card.split("_of_")[0]
            total += _rank_points(rank)
            if rank == "ace":
                aces += 1
        while total > 21 and aces:
            total -= 10
            aces -= 1
        return total

    def visible_value(self, hide_hole: bool) -> int:
        if not hide_hole or not self.cards:
            return self.value
        first_rank = self.cards[0].split("_of_")[0]
        return _rank_points(first_rank)

    def is_blackjack(self) -> bool:
        return len(self.cards) == 2 and self.value == 21

    def clear(self) -> None:
        self.cards.clear()


class BlackjackEngine:
    def __init__(self, bankroll: float = 5000.0) -> None:
        self.initial_bankroll = float(bankroll)
        self.deck = Deck()
        self.player = Hand()
        self.dealer = Hand()
        self.bankroll: float = float(bankroll)
        self.bet: int = 0
        self.active: bool = False
        self.outcome: Optional[str] = None
        self.natural_blackjack: bool = False

    def reset(self, bankroll: Optional[float] = None) -> None:
        self.deck = Deck()
        self.player = Hand()
        self.dealer = Hand()
        if bankroll is not None:
            self.initial_bankroll = float(bankroll)
        self.bankroll = float(self.initial_bankroll)
        self.bet = 0
        self.active = False
        self.outcome = None
        self.natural_blackjack = False

    def start_round(self, bet: int) -> Dict[str, object]:
        if self.active:
            raise BlackjackError("Round already in progress")
        if bet < MIN_BET:
            raise BlackjackError("Bet below table minimum")
        if bet > self.bankroll:
            raise BlackjackError("Insufficient bankroll")

        self.deck.ensure_depth()
        self.player = Hand()
        self.dealer = Hand()
        self.bet = bet
        self.bankroll -= bet
        self.outcome = None
        self.natural_blackjack = False

        for _ in range(2):
            self.player.add_card(self.deck.draw())
            self.dealer.add_card(self.deck.draw())

        self.active = True

        if self.player.is_blackjack():
            if self.dealer.is_blackjack():
                self.natural_blackjack = True
                self._push(natural=True)
            else:
                self._win(natural=True)
            self.active = False

        return self.state()

    def hit(self) -> Dict[str, object]:
        if not self.active:
            raise BlackjackError("No active round")
        self.deck.ensure_depth()
        self.player.add_card(self.deck.draw())
        if self.player.value > 21:
            self._lose()
            self.active = False
        return self.state()

    def stand(self) -> Dict[str, object]:
        if not self.active:
            raise BlackjackError("No active round")
        self._dealer_play()
        self._settle()
        self.active = False
        return self.state()

    def double(self) -> Dict[str, object]:
        if not self.active:
            raise BlackjackError("No active round")
        if self.bankroll < self.bet:
            raise BlackjackError("Insufficient bankroll to double")
        self.bankroll -= self.bet
        self.bet *= 2
        self.deck.ensure_depth()
        self.player.add_card(self.deck.draw())
        if self.player.value > 21:
            self._lose()
        else:
            self._dealer_play()
            self._settle()
        self.active = False
        return self.state()

    def _dealer_play(self) -> None:
        while self.dealer.value < 17:
            self.deck.ensure_depth()
            self.dealer.add_card(self.deck.draw())

    def _settle(self) -> None:
        player_value = self.player.value
        dealer_value = self.dealer.value
        if dealer_value > 21 or player_value > dealer_value:
            self._win()
        elif player_value == dealer_value:
            self._push()
        else:
            self._lose()

    def _win(self, natural: bool = False) -> None:
        multiplier = 2.5 if natural else 2.0
        payout = self.bet * multiplier
        self.bankroll += payout
        self.outcome = "win"
        self.natural_blackjack = natural

    def _push(self, natural: bool = False) -> None:
        self.bankroll += self.bet
        self.outcome = "push"
        self.natural_blackjack = natural

    def _lose(self) -> None:
        self.outcome = "lose"
        self.natural_blackjack = False

    def state(self) -> Dict[str, object]:
        hide_hole = self.active and self.outcome is None
        dealer_cards = self.dealer.cards.copy()
        if hide_hole and len(dealer_cards) > 1:
            dealer_cards = [dealer_cards[0]] + ["BACK"] * (len(dealer_cards) - 1)

        dealer_value = self.dealer.visible_value(hide_hole)
        bankroll_display = int(self.bankroll) if self.bankroll.is_integer() else round(self.bankroll, 2)
        return {
            "bankroll": bankroll_display,
            "bet": self.bet,
            "player": self.player.cards.copy(),
            "dealer": dealer_cards,
            "playerValue": self.player.value,
            "dealerValue": dealer_value,
            "active": self.active and self.outcome is None,
            "outcome": self.outcome,
            "blackjack": self.natural_blackjack,
            "minBet": MIN_BET,
        }

    def snapshot(self, mask_player: bool = False) -> Dict[str, object]:
        state = self.state()
        if mask_player and state.get("active"):
            cards = list(state.get("player", []))
            if cards:
                cards = [cards[0]] + ["BACK"] * (len(cards) - 1)
            state["player"] = cards
            state["playerValue"] = None
        return state


engine = BlackjackEngine()


