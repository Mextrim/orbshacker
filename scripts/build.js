const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const isWin = process.platform === 'win32';
const binName = isWin ? 'orbshacker-core.exe' : 'orbshacker-core';
const rustBin = path.join(rootDir, 'src-rust', 'target', 'release', binName);
const guiBinDir = path.join(rootDir, 'src-gui', 'bin');

console.log('📦 [1/2] Building native Rust release binary...');
const cargoResult = spawnSync('cargo', ['build', '--release', '--manifest-path', path.join(rootDir, 'src-rust', 'Cargo.toml')], {
  stdio: 'inherit',
  shell: true,
});

if (cargoResult.status !== 0) {
  console.error('❌ Failed to compile Rust core!');
  process.exit(1);
}

if (!fs.existsSync(guiBinDir)) {
  fs.mkdirSync(guiBinDir, { recursive: true });
}

fs.copyFileSync(rustBin, path.join(guiBinDir, binName));
console.log(`✅ [2/2] Native binary copied to: ${path.join(guiBinDir, binName)}`);
console.log('\n✨ Build completed successfully! You can now run the app with: npm start');
