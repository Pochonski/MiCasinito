const fs = require('fs');
const path = 'frontend/src/BlackjackTable.jsx';
let code = fs.readFileSync(path, 'utf8');

const stateOld = `  const [gameState, setGameState] = useState(null);\r\n  const [placedChips, setPlacedChips] = useState([]);\r\n  const [loading, setLoading] = useState(false);\r\n  const [feedback, setFeedback] = useState('');\r\n  const [outcomeInfo, setOutcomeInfo] = useState({ text: '', type: '' });\r\n  const [draggingChip, setDraggingChip] = useState(null);\r\n  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });\r\n  const [dragStart, setDragStart] = useState(null);\r\n  const [roundSeed, setRoundSeed] = useState(0);\r\n  const [showCelebration, setShowCelebration] = useState(false);\r\n\r\n  const betSpotRef = useRef(null);\r\n  const lastActiveRef = useRef(false);\r\n\r\n  const confettiPieces`;
const stateNew = `  const [gameState, setGameState] = useState(null);\r\n  const [placedChips, setPlacedChips] = useState([]);\r\n  const [loading, setLoading] = useState(false);\r\n  const [outcomeInfo, setOutcomeInfo] = useState({ text: '', type: '' });\r\n  const [draggingChip, setDraggingChip] = useState(null);\r\n  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });\r\n  const [dragStart, setDragStart] = useState(null);\r\n  const [roundSeed, setRoundSeed] = useState(0);\r\n\r\n  const betSpotRef = useRef(null);\r\n  const lastActiveRef = useRef(false);\r\n  const popupTimerRef = useRef(null);\r\n  const overlayTimerRef = useRef(null);\r\n\r\n  const [messagePopup, setMessagePopup] = useState({ text: '', tone: 'info', visible: false, key: 0 });\r\n  const [resolutionOverlay, setResolutionOverlay] = useState({ text: '', type: '', visible: false });\r\n\r\n  const confettiPieces`;
if (!code.includes(stateOld)) {
  throw new Error('failed to find state block');
}
code = code.replace(stateOld, stateNew);

const confettiBlock = `  const confettiPieces = useMemo(\r\n    () =>\r\n      Array.from({ length: CONFETTI_COUNT }, (_, index) => {\r\n        const drift = (index - CONFETTI_COUNT / 2) * 6;\r\n        const rotate = (index % 2 === 0 ? -1 : 1) * (12 + (index % 5) * 4);\r\n        const scale = (0.85 + (index % 4) * 0.05).toFixed(2);\r\n        return {\r\n          index: \`${index}\`,\r\n          color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],\r\n          drift: \`${drift}%\`,\r\n          rotation: \`${rotate}deg\`,\r\n          scale,\r\n        };\r\n      }),\r\n    [],\r\n  );`;
const messageInsert = `\r\n  const dismissLabel = locale.startsWith('es') ? 'Cerrar' : 'Close';\r\n\r\n  const pushMessage = useCallback((text, tone = 'info', duration = 3400) => {\r\n    if (!text) {\r\n      return;\r\n    }\r\n    if (popupTimerRef.current) {\r\n      window.clearTimeout(popupTimerRef.current);\r\n    }\r\n    const key = Date.now();\r\n    setMessagePopup({ text, tone, visible: true, key });\r\n    popupTimerRef.current = window.setTimeout(() => {\r\n      setMessagePopup((current) => (current.key === key ? { ...current, visible: false } : current));\r\n    }, duration);\r\n  }, []);\r\n\r\n  const clearMessage = useCallback(() => {\r\n    if (popupTimerRef.current) {\r\n      window.clearTimeout(popupTimerRef.current);\r\n      popupTimerRef.current = null;\r\n    }\r\n    setMessagePopup((current) => (current.visible ? { ...current, visible: false } : current));\r\n  }, []);`;
if (!code.includes(messageInsert.trim())) {
  code = code.replace(confettiBlock, `${confettiBlock}${messageInsert}`);
}

const formatAnchor = `  const formatAmount = useCallback(`;
const cleanupInsert = `  useEffect(() => {\r\n    return () => {\r\n      if (popupTimerRef.current) {\r\n        window.clearTimeout(popupTimerRef.current);\r\n      }\r\n      if (overlayTimerRef.current) {\r\n        window.clearTimeout(overlayTimerRef.current);\r\n      }\r\n    };\r\n  }, []);\r\n\r\n`;
if (!code.includes(cleanupInsert)) {
  code = code.replace(formatAnchor, `${cleanupInsert}${formatAnchor}`);
}

const refreshOld = `  const refreshState = useCallback(async () => {\r\n    try {\r\n      const response = await fetch(\`${API_BASE}/state\`);\r\n      const data = await response.json();\r\n      setGameState(data);\r\n    } catch (error) {\r\n      console.error('Failed to load state', error);\r\n      setFeedback(messages.loadError);\r\n    }\r\n  }, [messages.loadError]);`;
if (code.includes(refreshOld)) {
  code = code.replace(refreshOld, `  const refreshState = useCallback(async () => {\r\n    try {\r\n      const response = await fetch(\`${API_BASE}/state\`);\r\n      const data = await response.json();\r\n      setGameState(data);\r\n    } catch (error) {\r\n      console.error('Failed to load state', error);\r\n      pushMessage(messages.loadError, 'error', 5200);\r\n    }\r\n  }, [messages.loadError, pushMessage]);`);
}

const celebrationEffect = `  useEffect(() => {\r\n    if (outcomeInfo.type.includes('win')) {\r\n      setShowCelebration(true);\r\n      const timer = setTimeout(() => setShowCelebration(false), 2600);\r\n      return () => clearTimeout(timer);\r\n    }\r\n    if (showCelebration) {\r\n      setShowCelebration(false);\r\n    }\r\n    return undefined;\r\n  }, [outcomeInfo.type, showCelebration]);`;
const overlayEffect = `  useEffect(() => {\r\n    if (overlayTimerRef.current) {\r\n      window.clearTimeout(overlayTimerRef.current);\r\n      overlayTimerRef.current = null;\r\n    }\r\n\r\n    if (!outcomeInfo.type || !outcomeInfo.text) {\r\n      setResolutionOverlay((current) => (current.visible ? { ...current, visible: false } : current));\r\n      return undefined;\r\n    }\r\n\r\n    const overlayType = outcomeInfo.type.trim();\r\n    const overlayText = outcomeInfo.text;\r\n\r\n    setResolutionOverlay({ text: overlayText, type: overlayType, visible: true });\r\n\r\n    const timeoutDuration = overlayType.includes('lose') ? 3400 : overlayType.includes('push') ? 3000 : 2800;\r\n    overlayTimerRef.current = window.setTimeout(() => {\r\n      setResolutionOverlay((current) => (current.type === overlayType ? { ...current, visible: false } : current));\r\n    }, timeoutDuration);\r\n\r\n    return () => {\r\n      if (overlayTimerRef.current) {\r\n        window.clearTimeout(overlayTimerRef.current);\r\n        overlayTimerRef.current = null;\r\n      }\r\n    };\r\n  }, [outcomeInfo]);`;
if (code.includes(celebrationEffect)) {
  code = code.replace(celebrationEffect, overlayEffect);
} else if (!code.includes(overlayEffect)) {
  code = code.replace(`  useEffect(() => {\r\n    const isActive = Boolean(gameState?.active);\r\n    if (isActive && !lastActiveRef.current) {\r\n      setRoundSeed((seed) => seed + 1);\r\n    }\r\n    lastActiveRef.current = isActive;\r\n  }, [gameState?.active]);`, `$&\r\n\r\n${overlayEffect}`);
}

const replacements = [
  { from: `setFeedback(messages.balanceShort);`, to: `pushMessage(messages.balanceShort, 'warning');` },
  { from: `setFeedback('');`, to: `clearMessage();` },
  { from: `setFeedback(messages.dropOutside);`, to: `pushMessage(messages.dropOutside, 'warning');` },
  { from: `setFeedback(formatMinBet(formatAmount(minBet)));`, to: `pushMessage(formatMinBet(formatAmount(minBet)), 'warning');` },
  { from: `setFeedback(messages.startException);`, to reflects => ``, to };
