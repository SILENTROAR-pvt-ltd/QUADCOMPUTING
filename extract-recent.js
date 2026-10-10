const fs = require('fs');
const logPath = 'C:\\Users\\SANDEEP BAWA\\.gemini\\antigravity-ide\\brain\\68dd2b7b-17f5-4ae2-97a7-bea12a7ee258\\.system_generated\\tasks\\task-65.log';
const content = fs.readFileSync(logPath, 'utf-8');
const lines = content.split('\n');

// Find all POST /api/host/accommodations near the end
for (let i = lines.length - 2000; i < lines.length; i++) {
  if (lines[i] && lines[i].includes('POST /api/host/accommodations')) {
    console.log("Found POST at line", i);
    console.log(lines[i]);
  }
}
