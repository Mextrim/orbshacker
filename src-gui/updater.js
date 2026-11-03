const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { app } = require('electron');

const REPO_OWNER = 'Mextrim';
const REPO_NAME = 'orbshacker';

function parseSemver(v) {
  const clean = (v || '').toString().replace(/^v/, '').trim();
  const parts = clean.split('.').map((n) => parseInt(n, 10) || 0);
  while (parts.length < 3) parts.push(0);
  return parts;
}

function isNewer(remote, local) {
  const r = parseSemver(remote);
  const l = parseSemver(local);
  for (let i = 0; i < 3; i++) {
    if (r[i] > l[i]) return true;
    if (r[i] < l[i]) return false;
  }
  return false;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'orbshacker-app' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJson(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`GitHub API returned status ${res.statusCode}`));
      }
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy(new Error('Request timed out'));
    });
  });
}

function downloadText(url) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('http:') ? http : https;
    const req = proto.get(url, { headers: { 'User-Agent': 'orbshacker-app' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadText(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP status ${res.statusCode}`));
      }
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy(new Error('Request timed out'));
    });
  });
}

function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('http:') ? http : https;
    const req = proto.get(url, { headers: { 'User-Agent': 'orbshacker-app' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destPath, onProgress).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Download failed with status ${res.statusCode}`));
      }
      const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
      let downloadedBytes = 0;
      const fileStream = fs.createWriteStream(destPath);

      res.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (onProgress && totalBytes > 0) {
          const percent = Math.min(100, (downloadedBytes / totalBytes) * 100);
          onProgress({ percent, downloadedBytes, totalBytes });
        }
      });

      res.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close(resolve);
      });

      fileStream.on('error', (err) => {
        try {
          fs.unlinkSync(destPath);
        } catch (_) {}
        reject(err);
      });
    });
    req.on('error', reject);
  });
}

function computeFileSha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex').toLowerCase()));
    stream.on('error', reject);
  });
}

function parseSha256sums(text) {
  const map = {};
  for (const line of (text || '').split('\n')) {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 2 && parts[0].length === 64) {
      const fileName = parts[1].replace(/^\*/, '');
      map[fileName] = parts[0].toLowerCase();
    }
  }
  return map;
}

function cleanupOldExe() {
  try {
    const targetExe = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
    const oldExe = targetExe + '.old';
    if (fs.existsSync(oldExe)) {
      fs.unlinkSync(oldExe);
    }
  } catch (_) {}
}

async function checkForUpdates(currentVersion) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;
  const rel = await fetchJson(url);
  const latestTag = rel.tag_name || '';
  const hasUpdate = isNewer(latestTag, currentVersion);

  const platform = process.platform;
  let exeAsset = null;
  let checksumAsset = null;

  for (const a of rel.assets || []) {
    const name = a.name.toLowerCase();
    if (a.name.toUpperCase() === 'SHA256SUMS') {
      checksumAsset = a;
      continue;
    }

    if (name === 'orbshacker.exe' || name === 'orbshacker-portable.exe' || name.endsWith('.exe')) {
      if (!exeAsset || name === 'orbshacker.exe' || name === 'orbshacker-portable.exe') {
        exeAsset = a;
      }
    }
  }

  return {
    hasUpdate,
    currentVersion,
    latestVersion: latestTag,
    releaseName: rel.name || latestTag,
    releaseNotes: rel.body || '',
    releaseUrl: rel.html_url || `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/latest`,
    assetName: exeAsset ? exeAsset.name : null,
    assetSize: exeAsset ? exeAsset.size : 0,
    downloadUrl: exeAsset ? exeAsset.browser_download_url : null,
    checksumUrl: checksumAsset ? checksumAsset.browser_download_url : null,
  };
}

async function downloadAndInstall(downloadUrl, checksumUrl, assetName, onProgress) {
  const tempDir = os.tmpdir();
  const tempExe = path.join(tempDir, `orbshacker-update-${Date.now()}.exe`);

  try {
    // 1. Download updated binary
    await downloadFile(downloadUrl, tempExe, onProgress);

    // 2. Verify SHA-256 if checksumUrl is provided
    if (checksumUrl) {
      try {
        const sumsText = await downloadText(checksumUrl);
        const sumsMap = parseSha256sums(sumsText);
        const expectedHash = sumsMap[assetName] || sumsMap['orbshacker.exe'];
        if (expectedHash) {
          const actualHash = await computeFileSha256(tempExe);
          if (actualHash !== expectedHash) {
            throw new Error(`Ошибка проверки SHA-256 (ожидалось ${expectedHash.slice(0, 8)}..., получено ${actualHash.slice(0, 8)}...)`);
          }
        }
      } catch (err) {
        console.warn('Предупреждение при проверке контрольной суммы:', err.message);
      }
    }

    // 3. Resolve target executable path
    let targetExe = process.env.PORTABLE_EXECUTABLE_FILE;
    if (!targetExe) {
      if (app.isPackaged) {
        targetExe = process.execPath;
      } else {
        const rootExe = path.resolve(__dirname, '..', 'orbshacker.exe');
        targetExe = fs.existsSync(rootExe) ? rootExe : process.execPath;
      }
    }

    // 4. Windows: use detached non-blocking batch updater to prevent EBUSY locks
    if (isWindows) {
      const targetDir = path.dirname(targetExe);
      const updaterCmd = path.join(tempDir, `orbshacker-updater-${Date.now()}.cmd`);

      const cmdScript = `@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

set "TARGET=${targetExe}"
set "NEW_EXE=${tempExe}"
set "TARGET_DIR=${targetDir}"

:: 1. Wait for current orbshacker process to close and release file lock
for /l %%i in (1,1,30) do (
    del /f /q "!TARGET!.old" >nul 2>&1
    move /y "!TARGET!" "!TARGET!.old" >nul 2>&1
    if not exist "!TARGET!" goto do_install
    timeout /t 1 /nobreak >nul
)

:: 2. Force terminate if still lingering after 30 seconds
taskkill /f /im orbshacker.exe >nul 2>&1
timeout /t 1 /nobreak >nul
move /y "!TARGET!" "!TARGET!.old" >nul 2>&1

:do_install
:: 3. Place new executable
move /y "!NEW_EXE!" "!TARGET!" >nul 2>&1
if not exist "!TARGET!" (
    copy /y "!NEW_EXE!" "!TARGET!" >nul 2>&1
)

:: 4. Relaunch the newly updated program
cd /d "!TARGET_DIR!"
start "" "!TARGET!"

:: 5. Cleanup
timeout /t 2 /nobreak >nul
del /f /q "!TARGET!.old" >nul 2>&1
del /f /q "!NEW_EXE!" >nul 2>&1
(goto) 2>nul & del /f /q "%~f0"
`;

      fs.writeFileSync(updaterCmd, cmdScript, 'utf8');

      const child = spawn('cmd.exe', ['/c', updaterCmd], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });
      child.unref();

      // Give child process time to initialize before closing current app
      setTimeout(() => {
        app.exit(0);
      }, 400);

      return { success: true, restarted: true };
    }

    app.quit();
    return { success: true, restarted: true };
  } catch (err) {
    if (fs.existsSync(tempExe)) {
      try {
        fs.unlinkSync(tempExe);
      } catch (_) {}
    }
    throw err;
  }
}

module.exports = {
  checkForUpdates,
  downloadAndInstall,
  cleanupOldExe,
};
