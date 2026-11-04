const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const rootDir = path.resolve(__dirname, '..');
const isWin = process.platform === 'win32';
const binName = isWin ? 'orbshacker.exe' : 'orbshacker';
const cargoPath = path.join(process.env.USERPROFILE || '', '.cargo', 'bin', isWin ? 'cargo.exe' : 'cargo');
const cargoCmd = fs.existsSync(cargoPath) ? cargoPath : 'cargo';

const rustBin = path.join(rootDir, 'src-rust', 'target', 'release', binName);
const distDir = path.join(rootDir, 'dist');
const pkg = require('../package.json');
const currentVersion = 'v' + pkg.version;
const zipOut = path.join(distDir, `orbshacker-${currentVersion}-win-x64.zip`);

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

console.log('⚡ [1/3] Building 100% Native Rust release binary...');
const cargoResult = spawnSync(cargoCmd, ['build', '--release', '--manifest-path', path.join(rootDir, 'src-rust', 'Cargo.toml')], {
  stdio: 'inherit',
});
if (cargoResult.status !== 0) {
  console.error('❌ Failed to compile Rust application!');
  process.exit(1);
}

// Copy to root and dist
fs.copyFileSync(rustBin, path.join(distDir, 'orbshacker.exe'));
fs.copyFileSync(rustBin, path.join(rootDir, 'orbshacker.exe'));
console.log('✅ [2/3] Copied standalone native executable to dist/orbshacker.exe & root orbshacker.exe');

// Create standalone zip package
console.log('🗜️  [3/3] Creating standalone distribution ZIP...');
if (fs.existsSync(zipOut)) {
  fs.unlinkSync(zipOut);
}

const tempPackDir = path.join(distDir, `orbshacker-${currentVersion}-win-x64`);
if (fs.existsSync(tempPackDir)) {
  fs.rmSync(tempPackDir, { recursive: true, force: true });
}
fs.mkdirSync(tempPackDir, { recursive: true });
fs.copyFileSync(path.join(distDir, 'orbshacker.exe'), path.join(tempPackDir, 'orbshacker.exe'));
if (fs.existsSync(path.join(rootDir, 'README.md'))) {
  fs.copyFileSync(path.join(rootDir, 'README.md'), path.join(tempPackDir, 'README.md'));
}

const psScript = `Compress-Archive -Path "${tempPackDir}\\*" -DestinationPath "${zipOut}" -Force`;
const zipResult = spawnSync('powershell.exe', ['-NoProfile', '-Command', psScript], {
  stdio: 'inherit',
});
if (zipResult.status !== 0) {
  console.error('❌ Failed to compress distribution archive!');
  process.exit(1);
}
fs.rmSync(tempPackDir, { recursive: true, force: true });

// Generate SHA256SUMS
function sha256File(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

const zipHash = fs.existsSync(zipOut) ? sha256File(zipOut) : '';
const exeHash = sha256File(path.join(distDir, 'orbshacker.exe'));
const shaSums = `${zipHash} *orbshacker-${currentVersion}-win-x64.zip\n${exeHash} *orbshacker.exe\n`;
fs.writeFileSync(path.join(distDir, 'SHA256SUMS'), shaSums, 'utf8');

console.log(`\n🎉 Native Windows distribution ready in: ${distDir}`);
console.log(`   - orbshacker.exe (${(fs.statSync(path.join(distDir, 'orbshacker.exe')).size / 1024 / 1024).toFixed(2)} MB, SHA: ${exeHash.slice(0, 16)}...)`);
if (fs.existsSync(zipOut)) {
  console.log(`   - orbshacker-${currentVersion}-win-x64.zip (${(fs.statSync(zipOut).size / 1024 / 1024).toFixed(2)} MB, SHA: ${zipHash.slice(0, 16)}...)`);
}
console.log('   - SHA256SUMS generated.');
