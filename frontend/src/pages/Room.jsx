import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import BlackjackTable from '../BlackjackTable.jsx';
import PlayerBlackjackTable from '../PlayerBlackjackTable.jsx';
import { API_BASE, buildWsUrl } from '../utils/env.js';
import { clearRoomIdentity, loadRoomIdentity, storeRoomIdentity } from '../utils/roomStorage.js';

const Room = ({ strings, tableTexts }) => {
  const { roomCode: rawCode } = useParams();
  const roomCode = (rawCode || '').toUpperCase();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [identity, setIdentity] = useState(() => loadRoomIdentity(roomCode));
  const [roomData, setRoomData] = useState(null);
  const [players, setPlayers] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = loadRoomIdentity(roomCode);
    if (!stored) {
      const queryName = (searchParams.get('name') || '').trim();
      if (queryName) {
        // We will attempt to join from inside /room (see effect below), so do not redirect to /join
        setIdentity(null);
      } else {
        navigate('/join/' + roomCode);
      }
    } else {
      setIdentity(stored);
    }
  }, [roomCode, navigate, searchParams]);

  // If no identity yet and we have ?name in URL, attempt to join silently here
  useEffect(() => {
    const attemptInlineJoin = async () => {
      if (identity && identity.playerId) return; // already have identity
      const queryName = (searchParams.get('name') || '').trim();
      if (!queryName) return; // nothing to do
      try {
        const resp = await fetch(API_BASE + '/rooms/' + roomCode + '/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: queryName }),
        });
        const body = await resp.json().catch(() => ({}));
        if (resp.ok && body?.playerId) {
          storeRoomIdentity(roomCode, { playerId: body.playerId, name: queryName });
          setIdentity({ playerId: body.playerId, name: queryName });
        }
      } catch (_) {
        // ignore and let the normal redirect logic handle if needed
      }
    };
    attemptInlineJoin();
  }, [identity, roomCode, searchParams]);

  useEffect(() => {
    let cancelled = false;
    const fetchRoom = async () => {
      try {
        const response = await fetch(API_BASE + '/rooms/' + roomCode);
        if (!response.ok) {
          throw new Error('Room not found');
        }
        const data = await response.json();
        if (!cancelled) {
          setRoomData(data);
          setPlayers(Array.isArray(data.players) ? data.players : []);
        }
      } catch (fetchError) {
        console.error(fetchError);
        if (!cancelled) {
          setError(strings?.errors?.loadFailed || 'Unable to load room.');
        }
      }
    };
    fetchRoom();
    return () => {
      cancelled = true;
    };
  }, [roomCode, strings?.errors?.loadFailed]);

  // Ensure the stored identity actually exists in the room players. If not, try to (re)join with stored name.
  useEffect(() => {
    const repairIdentityIfNeeded = async () => {
      if (!roomData || !Array.isArray(players)) return;
      const current = identity;
      if (!current || !current.playerId) return;
      const exists = players.some((p) => p.playerId === current.playerId);
      if (exists) return;
      const name = (current.name || '').trim();
      if (!name) return;
      try {
        const resp = await fetch(API_BASE + '/rooms/' + roomCode + '/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        const body = await resp.json().catch(() => ({}));
        if (resp.ok && body?.playerId) {
          storeRoomIdentity(roomCode, { playerId: body.playerId, name });
          setIdentity({ playerId: body.playerId, name });
        }
      } catch (_) {
        // ignore; the normal onclose handler will route to /join if truly invalid
      }
    };
    repairIdentityIfNeeded();
  }, [roomData, players, identity, roomCode]);

  const canConnect = useMemo(() => {
    if (!identity?.playerId) return false;
    if (!Array.isArray(players) || players.length === 0) return false;
    return players.some((p) => p.playerId === identity.playerId);
  }, [identity?.playerId, players]);

  useEffect(() => {
    if (!canConnect) {
      return undefined;
    }
    const url = buildWsUrl(roomCode, identity.playerId);
    let socket;
    try {
      socket = new WebSocket(url);
    } catch (wsError) {
      console.error(wsError);
      setConnectionStatus('disconnected');
      return undefined;
    }

    const handleOpen = () => setConnectionStatus('connected');
    const handleMessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload && payload.type === 'room_state' && payload.room) {
          setRoomData(payload.room);
          setPlayers(Array.isArray(payload.room.players) ? payload.room.players : []);
        }
      } catch (parseError) {
        console.warn('Unexpected WS payload', parseError);
      }
    };
    const handleClose = (event) => {
      setConnectionStatus('disconnected');
      if (event?.code === 4403 || event?.code === 4404) {
        clearRoomIdentity(roomCode);
        setError(strings?.errors?.sessionExpired || 'Session expired, please rejoin.');
        navigate('/join/' + roomCode);
      }
    };
    const handleError = () => {
      setConnectionStatus('disconnected');
    };

    socket.addEventListener('open', handleOpen);
    socket.addEventListener('message', handleMessage);
    socket.addEventListener('close', handleClose);
    socket.addEventListener('error', handleError);

    return () => {
      socket.removeEventListener('open', handleOpen);
      socket.removeEventListener('message', handleMessage);
      socket.removeEventListener('close', handleClose);
      socket.removeEventListener('error', handleError);
      socket.close(1000);
    };
  }, [canConnect, identity?.playerId, roomCode, navigate, strings?.errors?.sessionExpired]);

  const leaveRoom = () => {
    clearRoomIdentity(roomCode);
    navigate('/');
  };

  const roomTitle = strings?.title?.(roomCode) || ('Room ' + roomCode);
  const presenceLabels = strings?.presence || { online: 'Online', offline: 'Offline' };
  const hostName = roomData?.hostName;
  const playerApiBase = identity?.playerId ? `${API_BASE}/rooms/${roomCode}/players/${identity.playerId}` : null;

  const connectionLabel = useMemo(() => {
    if (!strings || !strings.connection) {
      if (connectionStatus === 'connected') return 'Connected';
      if (connectionStatus === 'disconnected') return 'Disconnected';
      return 'Connecting...';
    }
    switch (connectionStatus) {
      case 'connected':
        return strings.connection.connected || 'Connected';
      case 'disconnected':
        return strings.connection.disconnected || 'Disconnected';
      default:
        return strings.connection.connecting || 'Connecting...';
    }
  }, [connectionStatus, strings]);

  const connectionClass = 'room-connection status-' + connectionStatus;

  return (
    <div className="room-view">
      <div className="room-sidebar">
        <button type="button" className="ghost-button" onClick={leaveRoom}>
          {strings?.actions?.leave}
        </button>
        <h1>{roomTitle}</h1>
        <p className="room-host">
          {strings?.hostLabel}: <strong>{hostName || '-'}</strong>
        </p>
        <div className={connectionClass}>
          <span>{strings?.connectionLabel}</span>
          <strong>{connectionLabel}</strong>
        </div>
        <h2 className="room-players-title">{strings?.playersTitle}</h2>
        <ul className="room-player-list">
          {players.length === 0 && <li className="room-player-empty">{strings?.empty}</li>}
          {players.map((player) => {
            const isSelf = player.playerId === (identity && identity.playerId);
            const statusClass = player.online ? 'online' : 'offline';
            const selfClass = isSelf ? ' self' : '';
            const itemClass = 'room-player-item ' + statusClass + selfClass;
            return (
              <li key={player.playerId} className={itemClass}>
                <div className="player-main">
                  <span className="player-name">{player.name}</span>
                  <div className="player-tags">
                    {isSelf && <span className="player-tag self-tag">{strings?.badges?.you}</span>}
                    {player.name === hostName && <span className="player-tag host-tag">{strings?.badges?.host}</span>}
                  </div>
                </div>
                <span className="player-status">{player.online ? presenceLabels.online : presenceLabels.offline}</span>
              </li>
            );
          })}
        </ul>
        {error && <p className="room-error">{error}</p>}
      </div>
      <div className="room-table">
        <h2 className="room-table-title">{strings?.tableTitle}</h2>
        <PlayerBlackjackTable texts={tableTexts} playerApiBase={playerApiBase} />
      </div>
    </div>
  );
};

export default Room;
