import { useMemo, useState } from 'react';
import CreateRoomModal from './CreateRoomModal.jsx';
import InviteModal from './InviteModal.jsx';
import { API_BASE, buildInviteUrl } from '../utils/env.js';
import { storeRoomIdentity, loadRoomIdentity } from '../utils/roomStorage.js';

const getErrorMessage = (error, fallback) => {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  return fallback;
};

const RoomActions = ({ strings, onPlaySolo, onOpenRoom }) => {
  const [showCreate, setShowCreate] = useState(false);
  const [inviteDetails, setInviteDetails] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusTone, setStatusTone] = useState('info');
  const [opening, setOpening] = useState(false);

  const defaults = useMemo(
    () => ({
      errors: {
        create: strings?.messages?.createError || 'Could not create room.',
      },
    }),
    [strings?.messages?.createError],
  );

  // Remember the last host name used when creating a room, for reliable auto-join
  const [lastHostName, setLastHostName] = useState('');

  const handleCreateRequest = async ({ hostName }) => {
    setStatusMessage('');
    try {
      const response = await fetch(API_BASE + '/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = data?.detail || defaults.errors.create;
        throw new Error(message);
      }
      return data;
    } catch (error) {
      const message = getErrorMessage(error, defaults.errors.create);
      setStatusMessage(message);
      setStatusTone('error');
      throw error;
    }
  };

  const handleCreated = (data, payload) => {
    if (!data?.roomCode) {
      setStatusMessage(defaults.errors.create);
      setStatusTone('error');
      return;
    }
    // Build invite URL WITHOUT embedding the host name to avoid guests reusing it
    const inviteUrl = buildInviteUrl(data.roomCode);
    setInviteDetails({
      roomCode: data.roomCode,
      joinUrlPath: data.joinUrlPath,
      inviteUrl,
      hostName: payload?.hostName,
    });
    setLastHostName((payload?.hostName || '').trim());
    setShowCreate(false);
    setStatusMessage(strings?.messages?.createdSuccess || 'Room ready to share.');
    setStatusTone('success');

    // Auto-join host silently so they don't have to enter the name again
    (async () => {
      try {
        const resp = await fetch(API_BASE + '/rooms/' + data.roomCode + '/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: (payload?.hostName || '').trim() }),
        });
        const body = await resp.json().catch(() => ({}));
        if (resp.ok && body?.playerId) {
          storeRoomIdentity(data.roomCode, { playerId: body.playerId, name: (payload?.hostName || '').trim() });
        }
      } catch (_) {
        // No-op: even if auto-join fails, user can join manually from /join/:code
      }
    })();
  };

  const handleOpenRoom = (roomCode) => {
    const identity = loadRoomIdentity(roomCode);
    const proceedToRoom = () => {
      setInviteDetails(null);
      if (typeof onOpenRoom === 'function') {
        onOpenRoom(roomCode);
      }
    };
    // If identity is not yet persisted, perform a quick join with host name, then navigate directly to /room/:code
    if (!identity || !identity.playerId) {
      const hostName = (inviteDetails?.hostName || lastHostName || '').trim();
      if (hostName) {
        setOpening(true);
        (async () => {
          try {
            const attemptJoin = async () => {
              const resp = await fetch(API_BASE + '/rooms/' + roomCode + '/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: hostName }),
              });
              const body = await resp.json().catch(() => ({}));
              if (resp.ok && body?.playerId) {
                storeRoomIdentity(roomCode, { playerId: body.playerId, name: hostName });
                return true;
              }
              return false;
            };

            // Try twice with a short delay, to avoid races
            let joined = await attemptJoin();
            if (!joined) {
              await new Promise((r) => setTimeout(r, 200));
              joined = await attemptJoin();
            }
            if (joined) {
              proceedToRoom();
              return;
            }
          } catch (_) {
            // ignore and fallback below
          }
          // Fallback: open join URL with prefilled name to auto-join there
          const joinUrl = buildInviteUrl(roomCode, hostName);
          window.location.assign(joinUrl);
        })().finally(() => setOpening(false));
        return;
      }
    }
    proceedToRoom();
  };

  return (
    <div className="room-actions">
      <div className="room-actions-header">
        <h2>{strings?.title}</h2>
        <p>{strings?.subtitle}</p>
      </div>
      <div className="room-actions-buttons">
        <button
          type="button"
          className="primary-button"
          onClick={() => setShowCreate(true)}
        >
          {strings?.actions?.create}
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={onPlaySolo}
        >
          {strings?.actions?.solo}
        </button>
      </div>
      {statusMessage && (
        <div className={'room-status room-status-' + statusTone} role="status">
          {statusMessage}
        </div>
      )}

      <CreateRoomModal
        open={showCreate}
        strings={strings?.createModal}
        onCancel={() => setShowCreate(false)}
        onCreate={handleCreateRequest}
        onCreated={handleCreated}
      />

      <InviteModal
        open={Boolean(inviteDetails)}
        strings={strings?.inviteModal}
        roomCode={inviteDetails?.roomCode}
        inviteUrl={inviteDetails?.inviteUrl}
        hostName={inviteDetails?.hostName}
        opening={opening}
        onDismiss={() => setInviteDetails(null)}
        onOpenRoom={() => handleOpenRoom(inviteDetails?.roomCode)}
      />
    </div>
  );
};

export default RoomActions;
