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

// Copy to root and dist with safe retry
function safeCopy(src, dest) {
  try {
    if (fs.existsSync(dest)) {
      try { fs.unlinkSync(dest); } catch (_) {}
    }
    fs.copyFileSync(src, dest);
  } catch (err) {
    if (err.code === 'EBUSY') {
      const oldName = dest + '.old';
      try { if (fs.existsSync(oldName)) fs.unlinkSync(oldName); } catch (_) {}
      try {
        fs.renameSync(dest, oldName);
        fs.copyFileSync(src, dest);
      } catch (e) {
        console.warn('Warning: Could not overwrite ' + dest + ': ' + e.message);
      }
    } else {
      throw err;
    }
  }
}

safeCopy(rustBin, path.join(distDir, 'orbshacker.exe'));
safeCopy(rustBin, path.join(rootDir, 'orbshacker.exe'));
console.log('✅ [2/3] Copied standalone native executable to dist/orbshacker.exe & root orbshacker.exe');

// Sign on Windows with Authenticode
if (isWin) {
  const signScript = path.join(__dirname, 'sign.ps1');
  if (fs.existsSync(signScript)) {
    console.log('🔏 Applying Authenticode digital code signature...');
    spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', signScript, '-FilePath', path.join(distDir, 'orbshacker.exe')], { stdio: 'inherit' });
    spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', signScript, '-FilePath', path.join(rootDir, 'orbshacker.exe')], { stdio: 'inherit' });
  }
}

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
if (fs.existsSync(path.join(rootDir, 'SECURITY.md'))) {
  fs.copyFileSync(path.join(rootDir, 'SECURITY.md'), path.join(tempPackDir, 'SECURITY.md'));
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

// Compute SHA256 checksums
function getFileSha256(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

const exeSha = getFileSha256(path.join(distDir, 'orbshacker.exe'));
const zipSha = getFileSha256(zipOut);

const shaContent = `${exeSha}  orbshacker.exe\n${zipSha}  orbshacker-${currentVersion}-win-x64.zip\n`;
fs.writeFileSync(path.join(distDir, 'SHA256SUMS'), shaContent, 'utf8');

const exeSizeMb = (fs.statSync(path.join(distDir, 'orbshacker.exe')).size / (1024 * 1024)).toFixed(2);
const zipSizeMb = (fs.statSync(zipOut).size / (1024 * 1024)).toFixed(2);

console.log(`\n🎉 Native Windows distribution ready in: ${distDir}`);
console.log(`   - orbshacker.exe (${exeSizeMb} MB, SHA: ${exeSha.slice(0, 16)}...)`);
console.log(`   - orbshacker-${currentVersion}-win-x64.zip (${zipSizeMb} MB, SHA: ${zipSha.slice(0, 16)}...)`);
console.log(`   - SHA256SUMS generated.`);
