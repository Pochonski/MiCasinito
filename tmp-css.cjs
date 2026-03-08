const fs = require('fs');
const path = 'src/main.css';
let css = fs.readFileSync(path, 'utf8');
const tableShellSearch = ".table-shell {\r\n  flex: 1;\r\n  display: flex;\r\n  flex-direction: column;\r\n  justify-content: space-between;\r\n  gap: 18px;\r\n  height: 100%;\r\n}";
const tableShellReplace = ".table-shell {\r\n  flex: 1;\r\n  display: flex;\r\n  flex-direction: column;\r\n  justify-content: space-between;\r\n  gap: 18px;\r\n  height: 100%;\r\n  position: relative;\r\n  overflow: hidden;\r\n}";
if (!css.includes(tableShellSearch)) {
  throw new Error('table-shell block not found');
}
css = css.replace(tableShellSearch, tableShellReplace);

const cardImageSearch = ".card-image {\r\n  height: 130px;\r\n  width: auto;\r\n  border-radius: 12px;\r\n  box-shadow: 0 14px 24px rgba(0, 0, 0, 0.45);\r\n  background: rgba(255, 255, 255, 0.08);\r\n}";
const cardImageReplace = ".card-image {\r\n  --deal-delay: 0ms;\r\n  --card-tilt: 0deg;\r\n  height: 130px;\r\n  width: auto;\r\n  border-radius: 12px;\r\n  box-shadow: 0 18px 32px rgba(0, 0, 0, 0.45);\r\n  background: rgba(255, 255, 255, 0.08);\r\n  opacity: 0;\r\n  transform: translate3d(0, -18px, 0) scale(0.92) rotate(var(--card-tilt));\r\n  animation: deal-card 0.42s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;\r\n  animation-delay: var(--deal-delay);\r\n  will-change: transform, opacity;\r\n}";
if (!css.includes(cardImageSearch)) {
  throw new Error('card-image block not found');
}
css = css.replace(cardImageSearch, cardImageReplace);

const insertAfter = ".card-image.fallback-card {\r\n  filter: grayscale(0.2);\r\n  border: 2px dashed rgba(255, 255, 255, 0.35);\r\n}";
const additions = "\r\n.card-image.player-card {\r\n  --card-tilt: -2.5deg;\r\n}\r\n\r\n.card-image.dealer-card {\r\n  --card-tilt: 2.5deg;\r\n}\r\n\r\n.card-image.card-face-down {\r\n  filter: brightness(0.92);\r\n}\r\n";
if (!css.includes(insertAfter)) {
  throw new Error('fallback block not found');
}
css = css.replace(insertAfter, insertAfter + additions);

const celebrationBlocks = `\r\n.celebration-overlay {\r\n  position: absolute;\r\n  inset: 0;\r\n  pointer-events: none;\r\n  display: flex;\r\n  align-items: center;\r\n  justify-content: center;\r\n  z-index: 40;\r\n  animation: celebration-fade 2.6s ease forwards;\r\n}\r\n\r\n.celebration-overlay.win .celebration-banner {\r\n  background: linear-gradient(135deg, rgba(46, 204, 113, 0.9), rgba(34, 153, 84, 0.85));\r\n  color: #10291b;\r\n}\r\n\r\n.celebration-overlay.blackjack .celebration-banner {\r\n  background: linear-gradient(135deg, rgba(255, 209, 102, 0.95), rgba(255, 159, 28, 0.92));\r\n  color: #2c1a00;\r\n  box-shadow: 0 0 35px rgba(255, 209, 102, 0.45);\r\n}\r\n\r\n.celebration-confetti {\r\n  position: absolute;\r\n  inset: 0;\r\n  overflow: hidden;\r\n}\r\n\r\n.confetti-piece {\r\n  position: absolute;\r\n  top: -12%;\r\n  left: 50%;\r\n  width: 12px;\r\n  height: 18px;\r\n  border-radius: 4px;\r\n  opacity: 0;\r\n  background: var(--confetti-color, #ffd166);\r\n  transform: translate3d(0, -40px, 0) rotate(var(--confetti-rotation, 0deg)) scale(var(--confetti-scale, 1));\r\n  animation: confetti-fall 1.6s ease-out forwards;\r\n  animation-delay: calc(var(--confetti-index, 0) * 80ms);\r\n}\r\n\r\n.celebration-banner {\r\n  padding: 18px 36px;\r\n  border-radius: 999px;\r\n  background: linear-gradient(135deg, rgba(0, 0, 0, 0.68), rgba(0, 0, 0, 0.88));\r\n  border: 1px solid rgba(255, 255, 255, 0.22);\r\n  box-shadow: 0 22px 38px rgba(0, 0, 0, 0.45);\r\n  display: inline-flex;\r\n  align-items: center;\r\n  justify-content: center;\r\n  gap: 12px;\r\n  font-size: 1.35rem;\r\n  letter-spacing: 0.12em;\r\n  text-transform: uppercase;\r\n  animation: celebration-pop 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;\r\n}\r\n\r\n.celebration-banner span {\r\n  white-space: nowrap;\r\n}\r\n\r\n@keyframes deal-card {\r\n  0% {\r\n    opacity: 0;\r\n    transform: translate3d(-36px, -38px, 0) scale(0.85) rotate(var(--card-tilt));\r\n  }\r\n  60% {\r\n    opacity: 1;\r\n    transform: translate3d(6px, 8px, 0) scale(1.03) rotate(var(--card-tilt));\r\n  }\r\n  100% {\r\n    opacity: 1;\r\n    transform: translate3d(0, 0, 0) scale(1) rotate(var(--card-tilt));\r\n  }\r\n}\r\n\r\n@keyframes celebration-pop {\r\n  0% {\r\n    opacity: 0;\r\n    transform: scale(0.86) translateY(12px);\r\n  }\r\n  60% {\r\n    opacity: 1;\r\n    transform: scale(1.08) translateY(-4px);\r\n  }\r\n  100% {\r\n    opacity: 1;\r\n    transform: scale(1) translateY(0);\r\n  }\r\n}\r\n\r\n@keyframes celebration-fade {\r\n  0% {\r\n    opacity: 0;\r\n  }\r\n  10% {\r\n    opacity: 1;\r\n  }\r\n  100% {\r\n    opacity: 0;\r\n  }\r\n}\r\n\r\n@keyframes confetti-fall {\r\n  0% {\r\n    opacity: 0;\r\n    transform: translate3d(0, -40px, 0) rotate(var(--confetti-rotation, 0deg)) scale(var(--confetti-scale, 1));\r\n  }\r\n  15% {\r\n    opacity: 1;\r\n  }\r\n  60% {\r\n    transform: translate3d(calc(var(--confetti-drift, 0%) * 1.1), 140px, 0) rotate(var(--confetti-rotation, 0deg)) scale(var(--confetti-scale, 1));\r\n  }\r\n  100% {\r\n    opacity: 0;\r\n    transform: translate3d(calc(var(--confetti-drift, 0%) * 1.4), 220px, 0) rotate(var(--confetti-rotation, 0deg)) scale(var(--confetti-scale, 1));\r\n  }\r\n}\r\n`;
if (!css.includes('.celebration-overlay')) {
  const anchor = '.status-message.blackjack {';
  if (!css.includes(anchor)) {
    throw new Error('anchor for celebration insertion not found');
  }
  css = css.replace(anchor, `${anchor}${celebrationBlocks}`);
}
fs.writeFileSync(path, css);
