const fs = require('fs');
const path = 'src/BlackjackTable.jsx';
let code = fs.readFileSync(path, 'utf8');
const search = "              {playerCards.map((card, index) => (\r\n                <img\r\n                  key={`${card}-${index}`}\r\n                  src={getCardSrc(card)}\r\n                  alt={getCardAlt(card, prompts.playerEmpty)}\r\n                  className=\"card-image\"\r\n                  onError={(event) => {\r\n                    event.currentTarget.onerror = null;\r\n                    event.currentTarget.src = '/cards/BACK.png';\r\n                    event.currentTarget.classList.add('fallback-card');\r\n                  }}\r\n                />\r\n              ))}";
if (!code.includes(search)) {
  throw new Error('player block not found');
}
const insert = "              {playerCards.map((card, index) => (\r\n                <img\r\n                  key={`${roundSeed}-${card}-${index}`}\r\n                  src={getCardSrc(card)}\r\n                  alt={getCardAlt(card, prompts.playerEmpty)}\r\n                  className=\"card-image player-card\"\r\n                  style={{ '--deal-delay': `${getCardDelay(index, 'player')}ms` }}\r\n                  onError={(event) => {\r\n                    event.currentTarget.onerror = null;\r\n                    event.currentTarget.src = '/cards/BACK.png';\r\n                    event.currentTarget.classList.add('fallback-card');\r\n                  }}\r\n                />\r\n              ))}";
code = code.replace(search, insert);
fs.writeFileSync(path, code);
