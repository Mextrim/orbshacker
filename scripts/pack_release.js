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
fs.copyFileSync(portSrc, path.join(rootDir, 'orbshacker.exe'));
console.log('✅ Copied portable exe to dist/orbshacker.exe & root orbshacker.exe');

const rustBin = path.join(rootDir, 'src-rust', 'target', 'release', 'orbshacker-core.exe');
if (fs.existsSync(rustBin)) {
  fs.copyFileSync(rustBin, path.join(distDir, 'orbshacker-core.exe'));
  console.log('✅ Copied orbshacker-core.exe to dist');
}

const zipOut = path.join(distDir, 'orbshacker-v2.5.0-win-x64.zip');
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

const lines = [
  `${sha256(zipOut)} *orbshacker-v2.5.0-win-x64.zip`,
  `${sha256(path.join(distDir, 'orbshacker-core.exe'))} *orbshacker-core.exe`,
  `${sha256(path.join(distDir, 'orbshacker.exe'))} *orbshacker.exe`
];

fs.writeFileSync(path.join(distDir, 'SHA256SUMS'), lines.join('\n') + '\n', 'utf8');
console.log('✅ SHA256SUMS generated successfully:');
lines.forEach(l => console.log('  ' + l));
