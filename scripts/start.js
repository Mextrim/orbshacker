const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const isWin = process.platform === 'win32';
const cargoPath = path.join(process.env.USERPROFILE || '', '.cargo', 'bin', isWin ? 'cargo.exe' : 'cargo');
const cargoCmd = fs.existsSync(cargoPath) ? cargoPath : 'cargo';

console.log('⚡ Launching 100% Native Rust desktop application...');
const child = spawnSync(cargoCmd, ['run', '--release', '--manifest-path', path.join(rootDir, 'src-rust', 'Cargo.toml')], {
  stdio: 'inherit',
});

process.exit(child.status || 0);
