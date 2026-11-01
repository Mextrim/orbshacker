import ctypes, urllib.request, json, os, sys
from ctypes import wintypes

class C(ctypes.Structure):
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
p = ctypes.POINTER(C)()
adv.CredReadW('git:https://github.com', 1, 0, ctypes.byref(p))
b = ctypes.string_at(p.contents.CredentialBlob, p.contents.CredentialBlobSize)
token = b.decode('utf-16-le') if b'\x00' in b else b.decode('utf-8')

headers = {'Authorization': f'token {token}', 'Accept': 'application/vnd.github.v3+json'}
req = urllib.request.Request('https://api.github.com/repos/Mextrim/orbshacker/releases/tags/v2.4.0', headers=headers)
with urllib.request.urlopen(req) as resp:
    rel = json.loads(resp.read().decode('utf-8'))
rel_id = rel['id']

for a in rel['assets']:
    if a['name'] in ('orbshacker.exe', 'SHA256SUMS'):
        del_req = urllib.request.Request(f"https://api.github.com/repos/Mextrim/orbshacker/releases/assets/{a['id']}", headers=headers, method='DELETE')
        with urllib.request.urlopen(del_req) as dresp:
            print(f"Deleted old asset: {a['name']}")

dist = r"G:\orbs\dist"
for fname, ctype in [('SHA256SUMS', 'text/plain'), ('orbshacker.exe', 'application/vnd.microsoft.portable-executable')]:
    fpath = os.path.join(dist, fname)
    print(f"Uploading {fname} ({os.path.getsize(fpath) / 1024 / 1024:.1f} MB)...")
    sys.stdout.flush()
    with open(fpath, 'rb') as f:
        data = f.read()
    up_url = f"https://uploads.github.com/repos/Mextrim/orbshacker/releases/{rel_id}/assets?name={fname}"
    up_headers = {'Authorization': f'token {token}', 'Content-Type': ctype, 'Accept': 'application/vnd.github.v3+json'}
    up_req = urllib.request.Request(up_url, data=data, headers=up_headers, method='POST')
    with urllib.request.urlopen(up_req) as uresp:
        print(f"Uploaded {fname} successfully (HTTP {uresp.status})")
    sys.stdout.flush()

print("DONE!")
