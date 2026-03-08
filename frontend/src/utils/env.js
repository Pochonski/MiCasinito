const trimTrailingSlash = (value = '') => value.replace(/\/+$/, '');

const detectProtocol = () => {
  if (typeof window === 'undefined') {
    return 'http';
  }
  return window.location.protocol === 'https:' ? 'https' : 'http';
};

const detectHostname = () => {
  if (typeof window === 'undefined') {
    return 'localhost';
  }
  return window.location.hostname || 'localhost';
};

const rawPort = import.meta.env.VITE_API_PORT ?? '8000';
const normalisedPort = (() => {
  if (!rawPort) return '';
  const trimmed = String(rawPort).trim();
  if (!trimmed) return '';
  return trimmed.startsWith(':') ? trimmed : ':' + trimmed;
})();

const protocol = import.meta.env.VITE_API_PROTOCOL ?? detectProtocol();
const host = import.meta.env.VITE_API_HOST ?? detectHostname();
const fallbackApiBase = protocol + '://' + host + normalisedPort;

export const API_BASE = (() => {
  const configured = import.meta.env.VITE_API_BASE;
  const base = configured && configured.trim() ? configured.trim() : fallbackApiBase;
  return trimTrailingSlash(base);
})();

export const PUBLIC_BASE_URL = (() => {
  const configured = import.meta.env.VITE_PUBLIC_BASE_URL;
  if (configured && configured.trim()) {
    return trimTrailingSlash(configured.trim());
  }
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin;
  }
  return 'http://localhost:5173';
})();

export const buildInviteUrl = (roomCode, name) => {
  const base = trimTrailingSlash(PUBLIC_BASE_URL);
  const url = base + '/join/' + roomCode;
  if (name && name.trim()) {
    const separator = url.includes('?') ? '&' : '?';
    return url + separator + 'name=' + encodeURIComponent(name.trim());
  }
  return url;
};

export const buildWsUrl = (roomCode, playerId) => {
  const wsBase = API_BASE.replace(/^http/i, 'ws');
  const cleanBase = trimTrailingSlash(wsBase);
  const query = playerId ? '?playerId=' + encodeURIComponent(playerId) : '';
  return cleanBase + '/ws/' + roomCode + query;
};
