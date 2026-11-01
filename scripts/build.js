const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const rootDir = path.resolve(__dirname, '..');
const isWin = process.platform === 'win32';
const binName = isWin ? 'orbshacker-core.exe' : 'orbshacker-core';
const cargoPath = path.join(process.env.USERPROFILE || '', '.cargo', 'bin', isWin ? 'cargo.exe' : 'cargo');
const cargoCmd = fs.existsSync(cargoPath) ? cargoPath : 'cargo';

const rustBin = path.join(rootDir, 'src-rust', 'target', 'release', binName);
const guiBinDir = path.join(rootDir, 'src-gui', 'bin');
const distDir = path.join(rootDir, 'dist');
const packagedDir = path.join(distDir, 'orbshacker-win32-x64');
const zipOut = path.join(distDir, 'orbshacker-v2.4.0-win-x64.zip');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

console.log('⚡ [1/6] Building native Rust core release binary...');
const cargoCoreResult = spawnSync(cargoCmd, ['build', '--release', '--manifest-path', path.join(rootDir, 'src-rust', 'Cargo.toml')], {
  stdio: 'inherit',
});
if (cargoCoreResult.status !== 0) {
  console.error('❌ Failed to compile Rust core!');
  process.exit(1);
}

if (!fs.existsSync(guiBinDir)) {
  fs.mkdirSync(guiBinDir, { recursive: true });
}
fs.copyFileSync(rustBin, path.join(guiBinDir, binName));
console.log(`✅ [2/6] Copied core binary to: ${path.join(guiBinDir, binName)}`);

console.log('⚡ [3/6] Building native Rust launcher...');
const cargoLauncherResult = spawnSync(cargoCmd, ['build', '--release', '--manifest-path', path.join(rootDir, 'src-launcher', 'Cargo.toml')], {
  stdio: 'inherit',
});
if (cargoLauncherResult.status === 0) {
  const launcherBin = path.join(rootDir, 'src-launcher', 'target', 'release', 'orbshacker-launcher.exe');
  if (fs.existsSync(launcherBin)) {
    fs.copyFileSync(launcherBin, path.join(rootDir, 'orbshacker.exe'));
    console.log('✅ Compiled root launcher orbshacker.exe');
  }
}

console.log('📦 [4/6] Packaging Electron GUI app with packager...');
const npxCmd = isWin ? 'npx.cmd' : 'npx';
const packResult = spawnSync(npxCmd, ['@electron/packager', path.join(rootDir, 'src-gui'), 'orbshacker', '--platform=win32', '--arch=x64', `--out=${distDir}`, '--overwrite', '--prune=true'], {
  stdio: 'inherit',
});
if (packResult.status !== 0) {
  console.error('❌ Failed to package Electron app!');
  process.exit(1);
}

// Copy orbshacker-core.exe into packaged directory and resources/bin
const resourcesBin = path.join(packagedDir, 'resources', 'bin');
if (!fs.existsSync(resourcesBin)) {
  fs.mkdirSync(resourcesBin, { recursive: true });
}
fs.copyFileSync(rustBin, path.join(packagedDir, binName));
fs.copyFileSync(rustBin, path.join(resourcesBin, binName));
fs.copyFileSync(rustBin, path.join(distDir, binName));
console.log('✅ [5/6] Bundled Rust sidecar into Electron package.');

console.log('🗜️  [6/6] Creating portable distribution ZIP...');
if (fs.existsSync(zipOut)) {
  fs.unlinkSync(zipOut);
}

// Use powershell Compress-Archive for maximum native speed
const psScript = `Compress-Archive -Path "${packagedDir}\\*" -DestinationPath "${zipOut}" -Force`;
const zipResult = spawnSync('powershell.exe', ['-NoProfile', '-Command', psScript], {
  stdio: 'inherit',
});
if (zipResult.status !== 0) {
  console.error('❌ Failed to compress distribution archive!');
  process.exit(1);
}

// Generate SHA256SUMS
function sha256File(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

const zipHash = sha256File(zipOut);
const coreHash = sha256File(path.join(distDir, binName));
const shaSums = `${zipHash} *orbshacker-v2.4.0-win-x64.zip\n${coreHash} *orbshacker-core.exe\n`;
fs.writeFileSync(path.join(distDir, 'SHA256SUMS'), shaSums, 'utf8');

console.log(`\n🎉 Distribution ready in: ${distDir}`);
console.log(`   - orbshacker-v2.4.0-win-x64.zip (${(fs.statSync(zipOut).size / 1024 / 1024).toFixed(1)} MB, SHA: ${zipHash.slice(0, 16)}...)`);
console.log(`   - orbshacker-core.exe (${(fs.statSync(path.join(distDir, binName)).size / 1024 / 1024).toFixed(1)} MB, SHA: ${coreHash.slice(0, 16)}...)`);
console.log('   - SHA256SUMS generated.');
