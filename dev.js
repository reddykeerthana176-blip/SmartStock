const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('\x1b[36m%s\x1b[0m', '======================================================');
console.log('\x1b[36m%s\x1b[0m', '   Starting SmartStock Development Environment        ');
console.log('\x1b[36m%s\x1b[0m', '======================================================\n');

// Ensure Windows System32 is present in environment PATH
const env = { ...process.env };
const sys32 = 'C:\\Windows\\System32';
if (!env.ComSpec) {
  env.ComSpec = path.join(sys32, 'cmd.exe');
}
if (!env.PATH || !env.PATH.toLowerCase().includes('system32')) {
  env.PATH = `${sys32};${env.PATH || ''}`;
}

const nodeExec = process.execPath;
const serverDir = path.join(__dirname, 'server');
const clientDir = path.join(__dirname, 'client');

// Locate server entry
const serverScript = path.join(serverDir, 'server.js');

// Locate nodemon if available, else run directly with node
let nodemonBin = path.join(__dirname, 'node_modules', 'nodemon', 'bin', 'nodemon.js');
if (!fs.existsSync(nodemonBin)) {
  nodemonBin = path.join(serverDir, 'node_modules', 'nodemon', 'bin', 'nodemon.js');
}

const useNodemon = fs.existsSync(nodemonBin);
const serverArgs = useNodemon ? [nodemonBin, serverScript] : [serverScript];

// Locate vite binary
let viteBin = path.join(__dirname, 'node_modules', 'vite', 'bin', 'vite.js');
if (!fs.existsSync(viteBin)) {
  viteBin = path.join(clientDir, 'node_modules', 'vite', 'bin', 'vite.js');
}

// 1. Spawn Backend Server
const serverProcess = spawn(nodeExec, serverArgs, {
  cwd: serverDir,
  env,
  stdio: 'pipe',
});

serverProcess.stdout.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach((line) => {
    if (line) console.log('\x1b[32m[Server]\x1b[0m', line);
  });
});

serverProcess.stderr.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach((line) => {
    if (line) console.error('\x1b[31m[Server Error]\x1b[0m', line);
  });
});

serverProcess.on('error', (err) => {
  console.error('\x1b[31m[Server Failed to Start]\x1b[0m', err.message);
});

// 2. Spawn Frontend Vite Client
const clientProcess = spawn(nodeExec, [viteBin], {
  cwd: clientDir,
  env,
  stdio: 'pipe',
});

clientProcess.stdout.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach((line) => {
    if (line) console.log('\x1b[34m[Client]\x1b[0m', line);
  });
});

clientProcess.stderr.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach((line) => {
    if (line) console.error('\x1b[33m[Client Error]\x1b[0m', line);
  });
});

clientProcess.on('error', (err) => {
  console.error('\x1b[31m[Client Failed to Start]\x1b[0m', err.message);
});

// Handle graceful shutdown
const cleanup = () => {
  console.log('\n\x1b[33m%s\x1b[0m', 'Shutting down SmartStock dev processes...');
  try {
    serverProcess.kill();
  } catch {}
  try {
    clientProcess.kill();
  } catch {}
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
