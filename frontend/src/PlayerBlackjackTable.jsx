import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE } from './utils/env.js';

const CHIP_VALUES = [5, 10, 25, 50];
const CHIP_IMAGES = {
  5: '/chips/casino-chip-5.png',
  10: '/chips/casino-chip-10.png',
  25: '/chips/casino-chip-25.png',
  50: '/chips/poker-chip-50.png',
};

const DEAL_STEP_MS = 140;
const CONFETTI_COLORS = ['#ffd166', '#06d6a0', '#ef476f', '#118ab2', '#f78c6b', '#9b5de5'];
const CONFETTI_COUNT = 16;

const defaultTexts = {
  locale: 'es-ES',
  labels: {
    bankroll: 'Bankroll',
    currentBet: 'Apuesta en juego',
    preparedBet: 'Apuesta preparada',
    dealer: 'Crupier',
    player: 'Jugador',
  },
  prompts: {
    dealerEmpty: 'Sin cartas',
    playerEmpty: 'Haz tu apuesta para jugar',
    place: 'Arrastra fichas aqui',
  },
  actions: {
    deal: 'Repartir',
    hit: 'Pedir',
    stand: 'Plantarse',
    double: 'Doblar',
    remove: 'Retirar ultima',
    clear: 'Limpiar apuesta',
    back: 'Volver',
  },
  messages: {
    loadError: 'No se pudo cargar el estado inicial del juego.',
    balanceShort: 'No tienes saldo suficiente para esa apuesta.',
    dropOutside: 'Suelta la ficha sobre el circulo central para apostar.',
    startError: 'No se pudo iniciar la ronda.',
    startException: 'Ocurrio un error al iniciar la ronda.',
    actionError: 'Accion no disponible.',
    actionException: 'Ocurrio un error de comunicacion con el servidor.',
  },
  outcomes: {
    blackjack: 'Blackjack! Pago 3:2',
    win: 'Ganaste la mano!',
    push: 'Empate, apuesta devuelta.',
    lose: 'La casa gana esta vez.',
  },
  formatMinBet: (amount) => `La apuesta minima es ${amount}.`,
  describeChip: (value) => `Ficha de ${value}`,
};

const makeChipId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const getCardSrc = (code) => {
  if (!code || code === 'BACK') {
    return '/cards/BACK.png';
  }
  // Accept already-normalized filenames
  if (code.includes('of_') || code.endsWith('.png')) {
    const name = code.replace(/\.png$/i, '');
    return `/cards/${name}.png`;
  }
  // Convert engine code like 'A_S' to 'ace_of_spades.png'
  const [rankRaw, suitRaw] = String(code).split('_');
  const rankMap = {
    A: 'ace', J: 'jack', Q: 'queen', K: 'king',
    '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', '10': '10',
  };
  const suitMap = { S: 'spades', H: 'hearts', D: 'diamonds', C: 'clubs' };
  const rank = rankMap[rankRaw] || String(rankRaw).toLowerCase();
  const suit = suitMap[suitRaw] || String(suitRaw || '').toLowerCase();
  return `/cards/${rank}_of_${suit}.png`;
};

const getCardAlt = (code, fallback) => {
  if (!code || code === 'BACK') {
    return fallback;
  }
  return code.replace(/_/g, ' ');
};

// Player-scoped variant of the table. If playerApiBase is provided, all API calls
// are issued against that base (e.g., /rooms/:code/players/:playerId)
const PlayerBlackjackTable = ({ texts = defaultTexts, playerApiBase }) => {
  const locale = texts.locale ?? 'es-ES';
  const labels = texts.labels ?? defaultTexts.labels;
  const prompts = texts.prompts ?? defaultTexts.prompts;
  const actions = texts.actions ?? defaultTexts.actions;
  const messages = texts.messages ?? defaultTexts.messages;
  const outcomes = texts.outcomes ?? defaultTexts.outcomes;
  const formatMinBet = texts.formatMinBet ?? defaultTexts.formatMinBet;
  const describeChip = texts.describeChip ?? defaultTexts.describeChip;

  const [gameState, setGameState] = useState(null);
  const [placedChips, setPlacedChips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [outcomeInfo, setOutcomeInfo] = useState({ text: '', type: '' });
  const [draggingChip, setDraggingChip] = useState(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState(null);
  const [roundSeed, setRoundSeed] = useState(0);

  const betSpotRef = useRef(null);
  const lastActiveRef = useRef(false);
  const popupTimerRef = useRef(null);
  const overlayTimerRef = useRef(null);

  const [messagePopup, setMessagePopup] = useState({ text: '', tone: 'info', visible: false, key: 0 });
  const [revealPulse, setRevealPulse] = useState({}); // id -> true briefly when revealed flips to true
  const [resolutionOverlay, setResolutionOverlay] = useState({ text: '', type: '', visible: false });

  const dismissLabel = locale.startsWith('es') ? 'Cerrar' : 'Close';

  const confettiPieces = useMemo(
    () =>
      Array.from({ length: CONFETTI_COUNT }, (_, index) => {
        const drift = (index - CONFETTI_COUNT / 2) * 6;
        const rotate = (index % 2 === 0 ? -1 : 1) * (12 + (index % 5) * 4);
        const scale = (0.85 + (index % 4) * 0.05).toFixed(2);
        return {
          index: `${index}`,
          color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
          drift: `${drift}%`,
          rotation: `${rotate}deg`,
          scale,
        };
      }),
    [],
  );

  const active = gameState?.active ?? false;
  const bankroll = useMemo(() => (gameState ? Number(gameState.bankroll) : 0), [gameState]);
  const minBet = gameState?.minBet ?? 5;
  const currentBet = gameState?.bet ?? 0;
  const preparedBet = useMemo(
    () => placedChips.reduce((sum, chip) => sum + chip.value, 0),
    [placedChips],
  );

  const formatAmount = useCallback(
    (value) => {
      if (value === null || value === undefined || Number.isNaN(Number(value))) {
        return '-';
      }
      const numeric = Number(value);
      return `$${numeric.toLocaleString(locale, {
        minimumFractionDigits: numeric % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
      })}`;
    },
    [locale],
  );

  // Phase/betting state needed by callbacks defined below
  const phase = gameState?.phase || 'betting';
  const myBetTurn = Boolean(gameState?.myBetTurn);
  const currentBettorName = gameState?.currentBettorName || '';

  useEffect(() => {
    return () => {
      if (popupTimerRef.current) {
        window.clearTimeout(popupTimerRef.current);
      }
      if (overlayTimerRef.current) {
        window.clearTimeout(overlayTimerRef.current);
      }
    };
  }, []);

  const pushMessage = useCallback((text, tone = 'info', duration = 3400) => {
    if (!text) {
      return;
    }
    if (popupTimerRef.current) {
      window.clearTimeout(popupTimerRef.current);
    }
    const key = Date.now();
    setMessagePopup({ text, tone, visible: true, key });
    popupTimerRef.current = window.setTimeout(() => {
      setMessagePopup((current) => (current.key === key ? { ...current, visible: false } : current));
      popupTimerRef.current = null;
    }, duration);
  }, []);

  const clearMessage = useCallback(() => {
    if (popupTimerRef.current) {
      window.clearTimeout(popupTimerRef.current);
      popupTimerRef.current = null;
    }
    setMessagePopup((current) => (current.visible ? { ...current, visible: false } : current));
  }, []);

  const buildOutcomeInfo = useCallback(
    (state) => {
      if (!state?.outcome) {
        return { text: '', type: '' };
      }
      if (state.outcome === 'win') {
        return {
          text: state.blackjack ? outcomes.blackjack : outcomes.win,
          type: state.blackjack ? 'win blackjack' : 'win',
        };
      }
      if (state.outcome === 'push') {
        return { text: outcomes.push, type: 'push' };
      }
      return { text: outcomes.lose, type: 'lose' };
    },
    [outcomes],
  );

  const apiBase = useMemo(() => playerApiBase || `${API_BASE}` , [playerApiBase]);

  const refreshState = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/state`);
      const data = await response.json();
      setGameState(data);
    } catch (error) {
      console.error('Failed to load state', error);
      pushMessage(messages.loadError, 'error', 5200);
    }
  }, [messages.loadError, pushMessage, apiBase]);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  useEffect(() => {
    setOutcomeInfo(buildOutcomeInfo(gameState));
  }, [buildOutcomeInfo, gameState]);

  useEffect(() => {
    const isActive = Boolean(gameState?.active);
    if (isActive && !lastActiveRef.current) {
      setRoundSeed((seed) => seed + 1);
    }
    lastActiveRef.current = isActive;
  }, [gameState?.active]);

  useEffect(() => {
    if (overlayTimerRef.current) {
      window.clearTimeout(overlayTimerRef.current);
      overlayTimerRef.current = null;
    }

    if (!outcomeInfo.type || !outcomeInfo.text) {
      setResolutionOverlay((current) => (current.visible ? { ...current, visible: false } : current));
      return undefined;
    }

    const overlayType = outcomeInfo.type.trim();
    const overlayText = outcomeInfo.text;

    setResolutionOverlay({ text: overlayText, type: overlayType, visible: true });

    const timeoutDuration = overlayType.includes('lose') ? 3400 : overlayType.includes('push') ? 3000 : 2800;
    overlayTimerRef.current = window.setTimeout(() => {
      setResolutionOverlay((current) => (current.type === overlayType ? { ...current, visible: false } : current));
    }, timeoutDuration);

    return () => {
      if (overlayTimerRef.current) {
        window.clearTimeout(overlayTimerRef.current);
        overlayTimerRef.current = null;
      }
    };
  }, [outcomeInfo]);

  const placeChip = useCallback(
    (value) => {
      if (!gameState || active || loading) {
        return;
      }
      if (phase !== 'betting' || !myBetTurn) {
        return;
      }
      const nextBet = preparedBet + value;
      if (nextBet > bankroll) {
        pushMessage(messages.balanceShort, 'warning');
        return;
      }
      setPlacedChips((chips) => [...chips, { id: makeChipId(), value }]);
      clearMessage();
    },
    [active, bankroll, gameState, loading, messages.balanceShort, preparedBet, pushMessage, clearMessage, phase, myBetTurn],
  );

  const removeLastChip = useCallback(() => {
    if (active || loading) {
      return;
    }
    setPlacedChips((chips) => chips.slice(0, -1));
  }, [active, loading]);

  const clearBets = useCallback(() => {
    if (active || loading) {
      return;
    }
    setPlacedChips([]);
    clearMessage();
  }, [active, loading, clearMessage]);

  const getCardDelay = useCallback(
    (index, role) => {
      const base = role === 'dealer' ? 0.5 : 0;
      const normalized = Math.max(0, index);
      return Math.min(420, Math.round((normalized + base) * DEAL_STEP_MS));
    },
    [],
  );

  // Dynamic fan overlap: tighter when there are more players at the table to save space
  const getFanOverlap = useCallback((count, slots = 1) => {
    const base = (() => {
      if (!count || count <= 1) return 0;
      if (count === 2) return 18; // separa un poco más con 2 cartas
      if (count === 3) return 26; // 3 cartas, menos solapadas
      if (count === 4) return 34;
      return 38; // 5+
    })();
    // Increase overlap slightly only when there are many players
    const extra = slots >= 5 ? 6 : slots === 4 ? 2 : 0;
    return `-${base + extra}px`;
  }, []);

  // Dynamic arc span: close for 1-2, open wider for 3-4+ players
  const computeArcSpan = useCallback((slots) => {
    if (slots <= 2) return 80;        // self only or self + 1
    if (slots === 3) return 180;      // self + 2 others: abrir más para separarlos
    if (slots === 4) return 160;      // 3 others
    return 160;                        // 4+ others
  }, []);

  // Dynamic radius for the hands arc based on total participants (self + others)
  const computeArcRadius = useCallback((slots) => {
    if (slots <= 2) return 200;
    if (slots === 3) return 260; // aleja un poco más con 3 jugadores
    if (slots === 4) return 260;
    if (slots === 5) return 270;
    return 280;
  }, []);

  const finalizeDrop = useCallback(
    (event, chip) => {
      if (!chip) {
        return;
      }
      const betRect = betSpotRef.current?.getBoundingClientRect();
      const droppedInside = Boolean(
        betRect &&
        event.clientX >= betRect.left &&
        event.clientX <= betRect.right &&
        event.clientY >= betRect.top &&
        event.clientY <= betRect.bottom,
      );

      const dragDistance = dragStart
        ? Math.hypot(event.clientX - dragStart.x, event.clientY - dragStart.y)
        : Infinity;

      if (droppedInside || dragDistance < 8) {
        placeChip(chip.value);
      } else {
        pushMessage(messages.dropOutside, 'warning');
      }

      setDraggingChip(null);
      setDragStart(null);
    },
    [dragStart, messages.dropOutside, placeChip, pushMessage],
  );

  useEffect(() => {
    if (!draggingChip) {
      return undefined;
    }

    const handlePointerMove = (event) => {
      setDragPosition({ x: event.clientX, y: event.clientY });
    };

    const handlePointerUp = (event) => {
      finalizeDrop(event, draggingChip);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [draggingChip, finalizeDrop]);

  const handleChipPointerDown = (event, value) => {
    if (!gameState || active || loading) {
      return;
    }
    event.preventDefault();
    setDraggingChip({ value });
    setDragStart({ x: event.clientX, y: event.clientY });
    setDragPosition({ x: event.clientX, y: event.clientY });
  };

  const startRound = async () => {
    if (!gameState || active || loading) {
      return;
    }
    if (preparedBet < minBet) {
      pushMessage(formatMinBet(formatAmount(minBet)), 'warning');
      return;
    }
    if (preparedBet > bankroll) {
      pushMessage(messages.balanceShort, 'warning');
      return;
    }

    setLoading(true);
    clearMessage();
    try {
      const force = gameState?.isHost ? '?force=true' : '';
      const response = await fetch(`${apiBase}/start${force}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: preparedBet }),
      });
      const payload = await response.json();
      if (!response.ok) {
        pushMessage(payload?.detail ?? messages.startError, 'error');
        return;
      }
      setGameState(payload);
      setPlacedChips([]);
      setOutcomeInfo({ text: '', type: '' });
    } catch (error) {
      console.error('Error starting round', error);
      pushMessage(messages.startException, 'error');
    } finally {
      setLoading(false);
      refreshState();
    }
  };

  const sendAction = async (path) => {
    if (!gameState || loading) {
      return;
    }
    setLoading(true);
    clearMessage();
    try {
      const response = await fetch(`${apiBase}/${path}`, { method: 'POST' });
      const payload = await response.json();
      if (!response.ok) {
        pushMessage(payload?.detail ?? messages.actionError, 'error');
        return;
      }
      setGameState(payload);
    } catch (error) {
      console.error('Error performing action', error);
      pushMessage(messages.actionException, 'error');
    } finally {
      setLoading(false);
      refreshState();
    }
  };

  const dealerCards = gameState?.dealer ?? [];
  const playerCards = gameState?.player ?? [];
  const others = gameState?.others ?? [];
  const myTurn = Boolean(gameState?.myTurn);
  const currentPlayerName = gameState?.currentPlayerName || '';

  // Detect reveal transitions to animate others' second card
  const prevOthersRef = useRef([]);
  useEffect(() => {
    const prevMap = new Map((prevOthersRef.current || []).map((p) => [p.id, !!p.revealed]));
    const nextMap = new Map((others || []).map((p) => [p.id, !!p.revealed]));
    const pulse = {};
    nextMap.forEach((revealed, id) => {
      if (revealed && prevMap.get(id) === false) {
        pulse[id] = true;
      }
    });
    if (Object.keys(pulse).length) {
      setRevealPulse((old) => ({ ...old, ...pulse }));
      // Clear pulses shortly after animation ends (fallback timer)
      window.setTimeout(() => {
        setRevealPulse((old) => {
          const copy = { ...old };
          Object.keys(pulse).forEach((id) => delete copy[id]);
          return copy;
        });
      }, 1000);
    }
    prevOthersRef.current = others || [];
  }, [others]);

  return (
    <div className="table-shell">
      {resolutionOverlay.visible && resolutionOverlay.text && (
        <div className={`resolution-overlay ${resolutionOverlay.type}`}>
          {(resolutionOverlay.type.includes('win') || resolutionOverlay.type.includes('blackjack')) && (
            <div className="resolution-confetti" aria-hidden>
              {confettiPieces.map((piece) => (
                <span
                  key={piece.index}
                  className="confetti-piece"
                  style={{
                    '--confetti-index': piece.index,
                    '--confetti-color': piece.color,
                    '--confetti-drift': piece.drift,
                    '--confetti-rotation': piece.rotation,
                    '--confetti-scale': piece.scale,
                  }}
                />
              ))}
            </div>
          )}
          <div className="resolution-banner">
            <span>{resolutionOverlay.text}</span>
          </div>
        </div>
      )}

      {messagePopup.visible && (
        <div className={`message-popup ${messagePopup.tone}`} role="status" aria-live="assertive">
          <span className="message-text">{messagePopup.text}</span>
          <button type="button" className="message-close" onClick={clearMessage} aria-label={dismissLabel}>
            ×
          </button>
        </div>
      )}

      {draggingChip && (
        <div
          className="floating-chip"
          style={{
            left: `${dragPosition.x}px`,
            top: `${dragPosition.y}px`,
            backgroundImage: `url(${CHIP_IMAGES[draggingChip.value]})`,
          }}
          aria-hidden
        />
      )}

      <div className="table-surface">
        <div className="table-top-info">
          <div className="info-pill">
            <span>{labels.bankroll}</span>
            <strong>{formatAmount(bankroll)}</strong>
          </div>
          <div className="info-pill">
            <span>{labels.currentBet}</span>
            <strong>{formatAmount(currentBet)}</strong>
          </div>
          <div className="info-pill">
            <span>{labels.preparedBet}</span>
            <strong>{formatAmount(preparedBet)}</strong>
          </div>
        </div>
        <div className="table-content">
          {phase === 'betting' && !myBetTurn && currentBettorName && (
            <div className="waiting-banner">Esperando la apuesta de {currentBettorName}...</div>
          )}
          {active && phase === 'playing' && !myTurn && currentPlayerName && (
            <div className="waiting-banner">Esperando a {currentPlayerName}...</div>
          )}

          <div className={`card-lane dealer${myTurn ? ' my-turn' : ''} ${!active && phase==='settled' ? 'dealer-reveal' : ''}`}>
            <h2 className="lane-title">{labels.dealer}</h2>
            <div className="card-row fanned dealer-fan" style={{ '--fan-overlap': getFanOverlap(dealerCards.length) }}>
              {dealerCards.length === 0 && <span className="card-placeholder">{prompts.dealerEmpty}</span>}
              {dealerCards.map((card, index) => {
                const isFaceDown = card === 'BACK';
                return (
                  <img
                    key={`${roundSeed}-${card}-${index}`}
                    src={getCardSrc(card)}
                    alt={getCardAlt(card, prompts.dealerEmpty)}
                    className={`card-image dealer-card${isFaceDown ? ' card-face-down' : ''}`}
                    style={{ '--deal-delay': `${getCardDelay(index, 'dealer')}ms` }}
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = '/cards/BACK.png';
                      event.currentTarget.classList.add('fallback-card');
                    }}
                  />
                );
              })}
            </div>
            <div className="hand-value">Valor: <strong>{gameState ? gameState.dealerValue : '-'}</strong></div>
          </div>

          {/* Otros jugadores: se renderizan en arco dentro de play-zone (ver más abajo) */}

          <div className="play-zone">
          <div className="arc-zone">
          <div className={`bet-zone ${draggingChip ? 'dragging' : ''}`}>
            <div
              className={`bet-circle ${draggingChip ? 'ready' : ''}`}
              ref={betSpotRef}
              onDoubleClick={removeLastChip}
            >
              {!active && placedChips.length === 0 && (
                <span className="bet-placeholder">{prompts.place}</span>
              )}
              {!active && placedChips.map((chip, index) => (
                <div
                  key={chip.id}
                  className="bet-chip"
                  style={{
                    backgroundImage: `url(${CHIP_IMAGES[chip.value]})`,
                    transform: `translate(-50%, -50%) translate(${index * 6}px, ${-index * 5}px)`,
                    zIndex: 10 + index,
                  }}
                  aria-label={describeChip(chip.value)}
                />
              ))}
              {active && (
                <div className="bet-locked">
                  <span>{labels.currentBet}</span>
                  <strong>{formatAmount(currentBet)}</strong>
                </div>
              )}
            </div>
            <div className="chip-carousel" role="group" aria-label="Betting chips">
              {CHIP_VALUES.map((chipValue) => {
                const disabled = active || loading || preparedBet + chipValue > bankroll;
                return (
                  <button
                    key={chipValue}
                    type="button"
                    className="chip-token"
                    style={{ backgroundImage: `url(${CHIP_IMAGES[chipValue]})` }}
                    onPointerDown={(event) => handleChipPointerDown(event, chipValue)}
                    disabled={disabled}
                    aria-label={describeChip(chipValue)}
                  >
                    <span className="sr-only">{describeChip(chipValue)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Semicírculo de manos alrededor del pote */}
          <div className="hands-arc" aria-hidden={false} style={{ '--radius': `${computeArcRadius((others?.length || 0) + 1)}px` }}>
            {/* Mano del usuario (trabajo, 90deg) */}
            <div className="hand-slot self" style={{ '--angle': '90deg', '--radial-offset': '20px' }}>
              <div className="card-lane">
                <h2 className="lane-title">{labels.player}</h2>
              <div className="card-row fanned player-fan" style={{ '--fan-overlap': getFanOverlap(playerCards.length, (others?.length || 0) + 1) }}>
                {playerCards.length === 0 && <span className="card-placeholder">{prompts.playerEmpty}</span>}
                {playerCards.map((card, index) => (
                  <img
                    key={`${roundSeed}-${card}-${index}`}
                    src={getCardSrc(card)}
                    alt={getCardAlt(card, prompts.playerEmpty)}
                    className="card-image player-card"
                    style={{ '--deal-delay': `${getCardDelay(index, 'player')}ms` }}
                    onError={(e)=>{ e.currentTarget.onerror=null; e.currentTarget.src='/cards/BACK.png'; e.currentTarget.classList.add('fallback-card'); }}
                  />
                ))}
              </div>
              <div className="hand-value">Valor: <strong>{gameState ? gameState.playerValue : '-'}</strong></div>
              <div className="chip-base">
                <div className="chip-spot" />
                {currentBet > 0 && <div className="chip-amount">{formatAmount(currentBet)}</div>}
              </div>
            </div>
            </div>

            {/* Otros jugadores distribuidos en arco (-40..40 grados) */}
            {Array.isArray(others) && others.length > 0 && (
              others.map((p, idx) => {
                const name = p?.name ?? 'Jugador';
                const ocards = Array.isArray(p?.cards) ? p.cards : [];
                const first = ocards[0] ?? 'BACK';
                const secondRevealed = !!p?.revealed;
                const second = (secondRevealed ? ocards[1] : 'BACK') ?? 'BACK';
                const nOthers = others.length;
                const span = computeArcSpan(nOthers + 1); // ancho del arco dinámico
                // Repartir n manos evitando exactamente 90° (self). Usamos n+1 segmentos y ubicamos en sus centros
                const step = span / (nOthers + 1);
                const angle = 90 - span / 2 + step * (idx + 1);
                return (
                  <div key={p?.id ?? name} className="hand-slot other" style={{ '--angle': `${angle}deg`, '--radial-offset': '20px' }}>
                    <div className="card-lane">
                      <div className="other-name">{name}</div>
                      <div className="card-row fanned" style={{ '--fan-overlap': getFanOverlap(ocards.length, (others?.length || 0) + 1) }}>
                        <img
                          src={getCardSrc(first)}
                          alt={getCardAlt(first, name)}
                          className="card-image other-card"
                          onError={(e)=>{ e.currentTarget.onerror=null; e.currentTarget.src='/cards/BACK.png'; }}
                        />
                        <img
                          src={getCardSrc(second)}
                          alt={getCardAlt(second, name)}
                          className={`card-image other-card${secondRevealed ? ' revealed' : ''}${revealPulse[p?.id] ? ' pulse' : ''}`}
                          onAnimationEnd={() => {
                            if (p?.id && revealPulse[p.id]) {
                              setRevealPulse((old) => {
                                const copy = { ...old };
                                delete copy[p.id];
                                return copy;
                              });
                            }
                          }}
                          onError={(e)=>{ e.currentTarget.onerror=null; e.currentTarget.src='/cards/BACK.png'; }}
                        />
                      </div>
                      {(typeof p?.bet === 'number') && (
                        <div className="chip-base">
                          <div className="chip-spot" />
                          {p.bet > 0 && <div className="chip-amount">{formatAmount(p.bet)}</div>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      {/* close table-content */}
      </div>
      {/* close table-surface */}
      </div>
      <div className="bottom-panel">
        <div className="bottom-left">
          <div className="aux-controls">
            <button
              type="button"
              className="secondary-button"
              onClick={removeLastChip}
              disabled={active || placedChips.length === 0 || loading}
            >
              {actions.remove}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={clearBets}
              disabled={active || placedChips.length === 0 || loading}
            >
              {actions.clear}
            </button>
          </div>
        </div>

        <div className="bottom-right">
          <div className="controls-row">
            <button
              type="button"
              className="primary-button"
              onClick={startRound}
              disabled={active || preparedBet <= 0 || loading || phase !== 'betting' || !myBetTurn}
            >
              {actions.deal}
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => sendAction('hit')}
              disabled={!active || !myTurn || loading}
            >
              {actions.hit}
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => sendAction('stand')}
              disabled={!active || !myTurn || loading}
            >
              {actions.stand}
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => sendAction('double')}
              disabled={!active || !myTurn || loading || (gameState && gameState.player?.length !== 2) || (gameState && gameState.bankroll < gameState.bet)}
            >
              {actions.double}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerBlackjackTable;
