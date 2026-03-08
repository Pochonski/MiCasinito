const PREFIX = 'casinito.room';

const makeKey = (roomCode) => {
  return PREFIX + ':' + String(roomCode || '').toUpperCase();
};

const hasSessionStorage = () => typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

export const storeRoomIdentity = (roomCode, identity) => {
  if (!hasSessionStorage()) return;
  try {
    window.sessionStorage.setItem(makeKey(roomCode), JSON.stringify(identity));
  } catch (error) {
    console.warn('Unable to persist room identity', error);
  }
};

export const loadRoomIdentity = (roomCode) => {
  if (!hasSessionStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(makeKey(roomCode));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.playerId === 'string') {
      return parsed;
    }
  } catch (error) {
    console.warn('Unable to read stored room identity', error);
  }
  return null;
};

export const clearRoomIdentity = (roomCode) => {
  if (!hasSessionStorage()) return;
  try {
    window.sessionStorage.removeItem(makeKey(roomCode));
  } catch (error) {
    console.warn('Unable to clear stored room identity', error);
  }
};
