const { spawnSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const isWin = process.platform === 'win32';
const binName = isWin ? 'orbshacker-core.exe' : 'orbshacker-core';
const rustBin = path.join(rootDir, 'src-rust', 'target', 'release', binName);

if (!fs.existsSync(rustBin)) {
  console.log('⚡ Rust core release binary not found. Compiling with Cargo...');
  const cargoResult = spawnSync('cargo', ['build', '--release', '--manifest-path', path.join(rootDir, 'src-rust', 'Cargo.toml')], {
    stdio: 'inherit',
    shell: true,
  });
  if (cargoResult.status !== 0) {
    console.error('❌ Failed to compile Rust core!');
    process.exit(1);
  }
}

console.log('🚀 Launching Electron Desktop GUI...');
const electronCmd = isWin ? 'npx.cmd' : 'npx';
const child = spawn(electronCmd, ['electron', path.join(rootDir, 'src-gui')], {
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
