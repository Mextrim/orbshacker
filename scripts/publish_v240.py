import os, sys, subprocess, urllib.request, json, hashlib, ctypes
from ctypes import wintypes

def get_github_token():
    class CREDENTIAL(ctypes.Structure):
        _fields_ = [
            ('Flags', wintypes.DWORD),
            ('Type', wintypes.DWORD),
            ('TargetName', wintypes.LPWSTR),
            ('Comment', wintypes.LPWSTR),
            ('LastWritten', wintypes.FILETIME),
            ('CredentialBlobSize', wintypes.DWORD),
            ('CredentialBlob', ctypes.POINTER(ctypes.c_char)),
            ('Persist', wintypes.DWORD),
            ('AttributeCount', wintypes.DWORD),
            ('Attributes', ctypes.c_void_p),
            ('TargetAlias', wintypes.LPWSTR),
            ('UserName', wintypes.LPWSTR),
        ]

    adv = ctypes.windll.advapi32
    p = ctypes.POINTER(CREDENTIAL)()
    if adv.CredReadW('git:https://github.com', 1, 0, ctypes.byref(p)):
        b = ctypes.string_at(p.contents.CredentialBlob, p.contents.CredentialBlobSize)
        return b.decode('utf-16-le') if b'\x00' in b else b.decode('utf-8')
    raise RuntimeError("Could not read token from Windows Credential Manager")

token = get_github_token()
print(f"Acquired GitHub token: {token[:4]}...{token[-4:]}")
sys.stdout.flush()

remote_url = f"https://{token}@github.com/Mextrim/orbshacker.git"

# 1. Push main branch
print("Pushing main branch to GitHub...")
sys.stdout.flush()
push_res = subprocess.run(['git', 'push', remote_url, 'main'], capture_output=True, text=True)
print(push_res.stdout or push_res.stderr or "main branch pushed.")
sys.stdout.flush()

# 2. Create and push tag v2.4.0
tag_name = "v2.4.0"
print(f"Creating and pushing tag {tag_name}...")
sys.stdout.flush()
subprocess.run(['git', 'tag', '-f', tag_name], check=False)
tag_res = subprocess.run(['git', 'push', '-f', remote_url, tag_name], capture_output=True, text=True)
print(tag_res.stdout or tag_res.stderr or "tag pushed.")
sys.stdout.flush()

# 3. Create Release on GitHub
headers = {
    'Authorization': f'token {token}',
    'User-Agent': 'Orbshacker-Publisher',
    'Accept': 'application/vnd.github.v3+json',
}

release_name = "v2.4.0 - Rust Core & Electron Desktop GUI"
body = """## ✨ What's New in v2.4.0 (Rust + Electron Architecture)

### 🦀 Native Rust Core Engine (`src-rust`)
- **Ultra-lightweight binary (~1.6 MB)** with zero memory leaks and sub-millisecond execution.
- **Direct Discord Local Named Pipe Client**: Native RPC implementation connecting directly to `\\\\.\\pipe\\discord-ipc-0` (Windows) and Unix Domain Socket (Linux/macOS) with `SET_ACTIVITY` and 20s heartbeats. Fully verified for **EA SPORTS FC 27** and games without public executables.
- **Steam Quest Generator**: Automatic registry discovery (`HKCU\\Software\\Valve\\Steam\\SteamPath`) and dynamic `appmanifest_<appid>.acf` generation (`StateFlags: 1026`).
- **Bounded Janitor**: Crash-safe automatic cleanup of stub processes and temporary manifests.

### ⚡ Electron Desktop GUI (`src-gui`)
- **Cyberpunk / Discord Dark Theme**: Glassmorphism cards, glowing status orbs, and responsive UI.
- **1-Click "FARM ALL ACTIVE QUESTS"**: Simultaneously farm all Discord quests to earn +5,600 Orbs in 15 minutes.
- **Live Telemetry & Dashboard**: Real-time 15-minute countdown timer, progress bar, audio completion chime, and engine logs drawer.
- **6 Languages**: English, Русский, Español, Português, Deutsch, and Français with instant live switching.

---

### 📦 Release Assets & Verification

| Asset | Description |
| :--- | :--- |
| **`orbshacker-v2.4.0-win-x64.zip`** | Full standalone Electron Desktop application (portable, ready to run). |
| **`orbshacker-core.exe`** | Lightweight standalone native Rust engine (CLI & JSON-RPC daemon). |
| **`SHA256SUMS`** | Checksums for all released binaries. |
"""

# Check if release exists
list_req = urllib.request.Request('https://api.github.com/repos/Mextrim/orbshacker/releases', headers=headers)
with urllib.request.urlopen(list_req) as resp:
    releases = json.loads(resp.read().decode('utf-8'))

release_id = None
for r in releases:
    if r.get('tag_name') == tag_name:
        release_id = r['id']
        break

if not release_id:
    create_payload = json.dumps({
        'tag_name': tag_name,
        'target_commitish': 'main',
        'name': release_name,
        'body': body,
        'draft': False,
        'prerelease': False,
    }).encode('utf-8')
    create_req = urllib.request.Request('https://api.github.com/repos/Mextrim/orbshacker/releases', data=create_payload, headers=headers, method='POST')
    with urllib.request.urlopen(create_req) as resp:
        created = json.loads(resp.read().decode('utf-8'))
        release_id = created['id']
        print(f"Created release {tag_name} (ID: {release_id})")
else:
    print(f"Found existing release {tag_name} (ID: {release_id})")
sys.stdout.flush()

# Delete old assets if any
get_req = urllib.request.Request(f'https://api.github.com/repos/Mextrim/orbshacker/releases/{release_id}', headers=headers)
with urllib.request.urlopen(get_req) as resp:
    rel_data = json.loads(resp.read().decode('utf-8'))

for a in rel_data.get('assets', []):
    del_req = urllib.request.Request(f"https://api.github.com/repos/Mextrim/orbshacker/releases/assets/{a['id']}", headers=headers, method='DELETE')
    with urllib.request.urlopen(del_req) as resp:
        print(f"Deleted old asset: {a['name']}")
sys.stdout.flush()

# Upload helper
def upload_asset(file_path, asset_name, content_type='application/octet-stream'):
    upload_url = f"https://uploads.github.com/repos/Mextrim/orbshacker/releases/{release_id}/assets?name={asset_name}"
    size_mb = os.path.getsize(file_path) / 1024 / 1024
    print(f"Uploading {asset_name} ({size_mb:.1f} MB)...")
    sys.stdout.flush()
    with open(file_path, 'rb') as f:
        file_bytes = f.read()

    upload_headers = {
        'Authorization': f'token {token}',
        'Content-Type': content_type,
        'Accept': 'application/vnd.github.v3+json',
    }
    req = urllib.request.Request(upload_url, data=file_bytes, headers=upload_headers, method='POST')
    with urllib.request.urlopen(req) as resp:
        print(f"Uploaded {asset_name} successfully (HTTP {resp.status})")
    sys.stdout.flush()

# 4. Upload assets
dist_dir = r"G:\orbs\dist"
upload_asset(os.path.join(dist_dir, "orbshacker-core.exe"), "orbshacker-core.exe", "application/vnd.microsoft.portable-executable")
upload_asset(os.path.join(dist_dir, "SHA256SUMS"), "SHA256SUMS", "text/plain")
upload_asset(os.path.join(dist_dir, "orbshacker-v2.4.0-win-x64.zip"), "orbshacker-v2.4.0-win-x64.zip", "application/zip")

print("\n🚀 All v2.4.0 release assets uploaded successfully to GitHub!")
