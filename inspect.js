const fs = require('fs');
const code = fs.readFileSync('frontend/src/BlackjackTable.jsx', 'utf8');
const pattern = /const API_PORT[\s\S]*?\r?\n\r?\nconst CHIP_VALUES/;
const match = pattern.exec(code);
console.log(Boolean(match));
if (match) {
  console.log('---MATCH START---');
  console.log(match[0]);
  console.log('---MATCH END---');
}
