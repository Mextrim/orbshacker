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

    if (platform === 'win32') {
      if (name === 'orbshacker.exe' || name === 'orbshacker-portable.exe' || name.endsWith('.exe')) {
        if (!exeAsset || name === 'orbshacker.exe' || name === 'orbshacker-portable.exe') {
          exeAsset = a;
        }
      }
    } else if (platform === 'linux') {
      if (name.endsWith('.appimage') || name.includes('linux')) {
        if (!exeAsset || name.endsWith('.appimage')) {
          exeAsset = a;
        }
      }
    } else if (platform === 'darwin') {
      if (name.endsWith('.dmg') || name.includes('mac')) {
        if (!exeAsset || name.endsWith('.dmg')) {
          exeAsset = a;
        }
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
    // 1. Download .exe
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
            throw new Error(`SHA-256 verification failed (expected ${expectedHash}, got ${actualHash})`);
          }
        }
      } catch (err) {
        console.warn('Checksum verification warning:', err.message);
      }
    }

    // 3. Install
    const targetExe = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
    const isPackaged = app.isPackaged;

    if (!isPackaged) {
      const devTarget = path.join(__dirname, '..', 'orbshacker.exe');
      fs.copyFileSync(tempExe, devTarget);
      try {
        fs.unlinkSync(tempExe);
      } catch (_) {}
      return { success: true, message: 'Обновление сохранено в orbshacker.exe (Dev режим)' };
    }

    // In packaged / portable mode:
    const oldExe = targetExe + '.old';
    if (fs.existsSync(oldExe)) {
      try {
        fs.unlinkSync(oldExe);
      } catch (_) {}
    }

    fs.renameSync(targetExe, oldExe);
    fs.copyFileSync(tempExe, targetExe);
    try {
      fs.unlinkSync(tempExe);
    } catch (_) {}

    // Relaunch new version
    const child = spawn(targetExe, [], {
      detached: true,
      stdio: 'ignore',
      cwd: path.dirname(targetExe),
    });
    child.unref();

    // Close current app
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
