const { spawn, execSync } = require('child_process');
const path = require('path');

console.log("=========================================");
console.log("Starting Healthcare AI Project...");
console.log("=========================================\n");

const backendDir = path.join(__dirname, 'backend');
const frontendDir = path.join(__dirname, 'frontend');

// 1. Install Backend Dependencies
console.log(">> Installing Backend Dependencies (pip install)...");
try {
  execSync('pip install -r requirements.txt', { cwd: backendDir, stdio: 'inherit' });
  console.log("Backend dependencies installed successfully.\n");
} catch (e) {
  console.warn("Warning: Failed to install python requirements. Make sure python/pip is installed and in PATH.\n");
}

// 2. Install Frontend Dependencies
console.log(">> Installing Frontend Dependencies (npm install)...");
try {
  execSync('npm install', { cwd: frontendDir, stdio: 'inherit' });
  console.log("Frontend dependencies installed successfully.\n");
} catch (e) {
  console.warn("Warning: Failed to install npm requirements.\n");
}

// 3. Start Backend
console.log(">> Starting FastAPI Backend (uvicorn)...");
const backend = spawn('python', ['-m', 'uvicorn', 'main:app', '--reload', '--port', '8000'], { 
  cwd: backendDir,
  shell: true 
});

backend.stdout.on('data', data => console.log(`[BACKEND] ${data.toString().trim()}`));
backend.stderr.on('data', data => console.error(`[BACKEND ERR] ${data.toString().trim()}`));

// 4. Start Frontend
console.log(">> Starting React Frontend (Vite)...");
const frontend = spawn('npm', ['run', 'dev'], { 
  cwd: frontendDir,
  shell: true 
});

frontend.stdout.on('data', data => console.log(`[FRONTEND] ${data.toString().trim()}`));
frontend.stderr.on('data', data => console.error(`[FRONTEND ERR] ${data.toString().trim()}`));

// Graceful shutdown
process.on('SIGINT', () => {
  console.log("\nShutting down processes...");
  backend.kill('SIGINT');
  frontend.kill('SIGINT');
  process.exit();
});
