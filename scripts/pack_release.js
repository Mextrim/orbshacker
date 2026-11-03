const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const portSrc = path.join(distDir, 'orbshacker-portable.exe');

if (!fs.existsSync(portSrc)) {
  console.error('Portable exe not found at:', portSrc);
  process.exit(1);
}

fs.copyFileSync(portSrc, path.join(distDir, 'orbshacker.exe'));
try {
  fs.copyFileSync(portSrc, path.join(rootDir, 'orbshacker.exe'));
  console.log('✅ Copied portable exe to dist/orbshacker.exe & root orbshacker.exe');
} catch (e) {
  console.log('⚠️ Could not overwrite running root orbshacker.exe (currently in use by user), dist/orbshacker.exe updated.');
}

const rustBin = path.join(rootDir, 'src-rust', 'target', 'release', 'orbshacker-core.exe');
if (fs.existsSync(rustBin)) {
  fs.copyFileSync(rustBin, path.join(distDir, 'orbshacker-core.exe'));
  console.log('✅ Copied orbshacker-core.exe to dist');
}

const pkg = require('../package.json');
const currentVersion = 'v' + pkg.version;
const zipOut = path.join(distDir, `orbshacker-${currentVersion}-win-x64.zip`);
if (fs.existsSync(zipOut)) {
  fs.unlinkSync(zipOut);
}

const unpacked = path.join(distDir, 'win-unpacked');
console.log('🗜️  Zipping win-unpacked (including ffmpeg.dll) into distribution zip...');
const psScript = `Compress-Archive -Path "${unpacked}\\*" -DestinationPath "${zipOut}" -Force`;
const res = spawnSync('powershell.exe', ['-NoProfile', '-Command', psScript], { stdio: 'inherit' });
if (res.status !== 0) {
  console.error('Failed to create zip archive!');
  process.exit(1);
}

function sha256(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

const launcherBin = path.join(rootDir, 'src-launcher', 'target', 'release', 'orbshacker-launcher.exe');
if (fs.existsSync(launcherBin)) {
  fs.copyFileSync(launcherBin, path.join(distDir, 'orbshacker-launcher.exe'));
  try {
    fs.copyFileSync(launcherBin, path.join(rootDir, 'orbshacker-launcher.exe'));
    console.log('✅ Copied launcher to dist/orbshacker-launcher.exe & root orbshacker-launcher.exe');
  } catch (_) {
    console.log('✅ Copied launcher to dist/orbshacker-launcher.exe');
  }
}

const lines = [
  `${sha256(zipOut)} *orbshacker-${currentVersion}-win-x64.zip`,
  `${sha256(path.join(distDir, 'orbshacker-core.exe'))} *orbshacker-core.exe`,
  `${sha256(path.join(distDir, 'orbshacker.exe'))} *orbshacker.exe`
];
if (fs.existsSync(path.join(distDir, 'orbshacker-launcher.exe'))) {
  lines.push(`${sha256(path.join(distDir, 'orbshacker-launcher.exe'))} *orbshacker-launcher.exe`);
}

fs.writeFileSync(path.join(distDir, 'SHA256SUMS'), lines.join('\n') + '\n', 'utf8');
console.log('✅ SHA256SUMS generated successfully:');
lines.forEach(l => console.log('  ' + l));
