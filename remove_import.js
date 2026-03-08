const fs = require('fs');
const path = 'frontend/src/BlackjackTable.jsx';
let code = fs.readFileSync(path, 'utf8');
code = code.replace("import { API_BASE as API_BASE_URL } from './utils/env.js';\r\n\r\n", '');
fs.writeFileSync(path, code);
