const fs = require('fs');
const path = 'frontend/src/components/CreateRoomModal.jsx';
let text = fs.readFileSync(path, 'utf8');
text = text.replace("className={\\toggle-pill }\r\n                onClick(() => setVisibility('public')}", "className={`toggle-pill ${visibility === 'public' ? 'active' : ''}`}\r\n                onClick={() => setVisibility('public')}");
text = text.replace("className={\\toggle-pill }\r\n                onClick(() => setVisibility('private')}", "className={`toggle-pill ${visibility === 'private' ? 'active' : ''}`}\r\n                onClick={() => setVisibility('private')}");
fs.writeFileSync(path, text);
