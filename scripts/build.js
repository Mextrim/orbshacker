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
const zipOut = path.join(distDir, 'orbshacker-v2.5.0-win-x64.zip');

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

console.log('📦 [4/5] Building Windows distribution (portable + unpacked) with electron-builder...');
const npxCmd = isWin ? 'npx.cmd' : 'npx';
const builderResult = spawnSync(npxCmd, ['electron-builder', '--win', 'portable'], {
  cwd: path.join(rootDir, 'src-gui'),
  shell: true,
  stdio: 'inherit',
});
if (builderResult.status !== 0) {
  console.error('❌ Failed to package with electron-builder!');
  process.exit(1);
}

// Copy orbshacker-core.exe into dist
fs.copyFileSync(rustBin, path.join(distDir, binName));

// Ensure orbshacker.exe in dist and root is the single-file standalone portable exe
const portableSource = path.join(distDir, 'orbshacker-portable.exe');
if (fs.existsSync(portableSource)) {
  fs.copyFileSync(portableSource, path.join(distDir, 'orbshacker.exe'));
  fs.copyFileSync(portableSource, path.join(rootDir, 'orbshacker.exe'));
  console.log('✅ Created standalone portable binary: dist/orbshacker.exe & root orbshacker.exe');
}

console.log('🗜️  [5/5] Creating complete distribution ZIP with all DLLs (including ffmpeg.dll)...');
if (fs.existsSync(zipOut)) {
  fs.unlinkSync(zipOut);
}

const unpackedDir = path.join(distDir, 'win-unpacked');
if (fs.existsSync(unpackedDir)) {
  const psScript = `Compress-Archive -Path "${unpackedDir}\\*" -DestinationPath "${zipOut}" -Force`;
  const zipResult = spawnSync('powershell.exe', ['-NoProfile', '-Command', psScript], {
    stdio: 'inherit',
  });
  if (zipResult.status !== 0) {
    console.error('❌ Failed to compress distribution archive!');
    process.exit(1);
  }
}

// Generate SHA256SUMS
function sha256File(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

const zipHash = sha256File(zipOut);
const coreHash = sha256File(path.join(distDir, binName));
let shaSums = `${zipHash} *orbshacker-v2.5.0-win-x64.zip\n${coreHash} *orbshacker-core.exe\n`;

const portableExe = path.join(distDir, 'orbshacker.exe');
if (fs.existsSync(portableExe)) {
  const portHash = sha256File(portableExe);
  shaSums += `${portHash} *orbshacker.exe\n`;
}

fs.writeFileSync(path.join(distDir, 'SHA256SUMS'), shaSums, 'utf8');

console.log(`\n🎉 Distribution ready in: ${distDir}`);
console.log(`   - orbshacker-v2.5.0-win-x64.zip (${(fs.statSync(zipOut).size / 1024 / 1024).toFixed(1)} MB, SHA: ${zipHash.slice(0, 16)}...)`);
console.log(`   - orbshacker-core.exe (${(fs.statSync(path.join(distDir, binName)).size / 1024 / 1024).toFixed(1)} MB, SHA: ${coreHash.slice(0, 16)}...)`);
console.log('   - SHA256SUMS generated.');
