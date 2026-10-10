const fs = require('fs');

const logPath = 'C:\\Users\\SANDEEP BAWA\\.gemini\\antigravity-ide\\brain\\68dd2b7b-17f5-4ae2-97a7-bea12a7ee258\\.system_generated\\tasks\\task-65.log';
const content = fs.readFileSync(logPath, 'utf-8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('CRITICAL — Failed to log outstanding bill:')) {
    console.log("Found error at line", i);
    for (let j = i; j < i + 10; j++) {
      console.log(lines[j]);
    }
    console.log("---");
  }
}
