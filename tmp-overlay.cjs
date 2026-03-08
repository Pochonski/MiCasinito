const fs = require('fs');
const path = 'src/BlackjackTable.jsx';
let code = fs.readFileSync(path, 'utf8');
const search = "  return (\r\n    <div className=\"table-shell\">\r\n      {draggingChip && (";
if (!code.includes(search)) {
  throw new Error('return block not found');
}
const insert = "  return (\r\n    <div className=\"table-shell\">\r\n      {showCelebration && outcomeInfo.text && (\r\n        <div className={`celebration-overlay ${outcomeInfo.type}`}>\r\n          <div className=\"celebration-confetti\" aria-hidden>\r\n            {confettiPieces.map((piece) => (\r\n              <span\r\n                key={piece.index}\r\n                className=\"confetti-piece\"\r\n                style={{\r\n                  '--confetti-index': piece.index,\r\n                  '--confetti-color': piece.color,\r\n                  '--confetti-drift': piece.drift,\r\n                  '--confetti-rotation': piece.rotation,\r\n                  '--confetti-scale': piece.scale,\r\n                }}\r\n              />\r\n            ))}\r\n          </div>\r\n          <div className=\"celebration-banner\">\r\n            <span>{outcomeInfo.text}</span>\r\n          </div>\r\n        </div>\r\n      )}\r\n      {draggingChip && (";
code = code.replace(search, insert);
fs.writeFileSync(path, code);
