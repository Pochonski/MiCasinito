import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { API_BASE } from '../utils/env.js';
import { loadRoomIdentity, storeRoomIdentity } from '../utils/roomStorage.js';

const JoinRoom = ({ strings }) => {
  const { roomCode: rawRoomCode } = useParams();
  const roomCode = (rawRoomCode || '').toUpperCase();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoJoin, setAutoJoin] = useState(false);
  const [error, setError] = useState('');
  const [roomInfo, setRoomInfo] = useState({ ready: false, notFound: false, data: null });

  useEffect(() => {
    const stored = loadRoomIdentity(roomCode);
    if (stored && stored.name) {
      setName(stored.name);
    }
    const queryName = searchParams.get('name');
    if (queryName) {
      setName(queryName);
      setAutoJoin(true);
    }
  }, [roomCode, searchParams]);

  useEffect(() => {
    let cancelled = false;
    const fetchRoom = async () => {
      try {
        const response = await fetch(API_BASE + '/rooms/' + roomCode);
        if (!response.ok) {
          throw new Error('Not found');
        }
        const data = await response.json();
        if (!cancelled) {
          setRoomInfo({ ready: true, notFound: false, data });
        }
      } catch (fetchError) {
        if (!cancelled) {
          setRoomInfo({ ready: true, notFound: true, data: null });
          setError(strings?.errors?.notFound || 'Room not found.');
        }
      }
    };
    fetchRoom();
    return () => {
      cancelled = true;
    };
  }, [roomCode, strings?.errors?.notFound]);

  const joinRoom = useCallback(
    async (automatic = false) => {
      const trimmed = name.trim();
      if (!trimmed) {
        setError(strings?.errors?.nameRequired || 'Please enter your name.');
        setAutoJoin(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const response = await fetch(API_BASE + '/rooms/' + roomCode + '/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmed }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(body?.detail || strings?.errors?.joinFailed || 'Unable to join room.');
        }
        storeRoomIdentity(roomCode, { playerId: body.playerId, name: trimmed });
        navigate('/room/' + roomCode);
      } catch (joinError) {
        const message = joinError?.message || strings?.errors?.joinFailed || 'Unable to join room.';
        setError(message);
      } finally {
        setLoading(false);
        setAutoJoin(false);
      }
    },
    [name, navigate, roomCode, strings?.errors?.joinFailed, strings?.errors?.nameRequired],
  );

  useEffect(() => {
    if (autoJoin && roomInfo.ready && !roomInfo.notFound && name.trim() && !loading) {
      joinRoom(true);
    }
  }, [autoJoin, roomInfo.ready, roomInfo.notFound, name, loading, joinRoom]);

  const handleSubmit = (event) => {
    event.preventDefault();
    joinRoom(false);
  };

  const visibilityLabel = useMemo(() => {
    if (!roomInfo.data) {
      return '';
    }
    const visibility = roomInfo.data.visibility;
    return visibility === 'public' ? strings?.visibility?.public : strings?.visibility?.private;
  }, [roomInfo.data, strings?.visibility?.private, strings?.visibility?.public]);

  const heading = strings?.title?.(roomCode) || ('Join room ' + roomCode);

  return (
    <div className="join-room">
      <div className="join-card">
        <button
          type="button"
          className="ghost-button"
          onClick={() => navigate('/')}
          aria-label={strings?.actions?.back || 'Back to lobby'}
        >
          {strings?.actions?.back}
        </button>
        <h1>{heading}</h1>
        <p className="join-subtitle">{strings?.subtitle}</p>
        <div className="join-summary">
          <span className="join-code">{roomCode}</span>
          {roomInfo.ready && !roomInfo.notFound && (
            <div className="join-meta">
              <span>
                {strings?.hostLabel}: <strong>{roomInfo.data?.hostName}</strong>
              </span>
              <span>{visibilityLabel}</span>
            </div>
          )}
        </div>

        <form className="join-form" onSubmit={handleSubmit}>
          <label className="modal-field">
            <span className="modal-label">{strings?.nameLabel}</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={24}
              placeholder={strings?.namePlaceholder}
              disabled={loading}
            />
          </label>
          {error && <p className="modal-error">{error}</p>}
          <button type="submit" className="primary-button" disabled={loading || roomInfo.notFound}>
            {loading ? strings?.actions?.joining : strings?.actions?.confirm}
          </button>
        </form>
      </div>
    </div>
  );
};

export default JoinRoom;
