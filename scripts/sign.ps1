param (
    [string]$FilePath = "$PSScriptRoot\..\dist\orbshacker.exe"
)

$targetPath = (Resolve-Path $FilePath -ErrorAction SilentlyContinue)
if (-not $targetPath) {
    $targetPath = (Resolve-Path "$PSScriptRoot\..\orbshacker.exe" -ErrorAction SilentlyContinue)
}

if (-not $targetPath) {
    Write-Warning "Target binary not found: $FilePath"
    exit 0
}

$fileToSign = $targetPath.Path
Write-Host "[Code Signing] Preparing Authenticode signature for: $fileToSign" -ForegroundColor Cyan

$cert = Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert -ErrorAction SilentlyContinue | Where-Object { $_.Subject -match "Orbshacker" } | Select-Object -First 1

if (-not $cert) {
    Write-Host "[Code Signing] Generating trusted local certificate (CN=Orbshacker Open Source)..." -ForegroundColor Yellow
    $cert = New-SelfSignedCertificate -Subject "CN=Orbshacker Open Source" -Type CodeSigningCert -CertStoreLocation Cert:\CurrentUser\My -HashAlgorithm SHA256 -NotAfter (Get-Date).AddYears(5)
    
    try {
        $rootStore = New-Object System.Security.Cryptography.X509Certificates.X509Store "Root", "CurrentUser"
        $rootStore.Open("ReadWrite")
        $rootStore.Add($cert)
        $rootStore.Close()
    } catch {
        # Root store prompt or read-only fallback
    }
}

if ($cert) {
    $sig = Set-AuthenticodeSignature -FilePath $fileToSign -Certificate $cert -HashAlgorithm SHA256 -ErrorAction SilentlyContinue
    if ($sig) {
        Write-Host "[Code Signing] Signature status: $($sig.Status)" -ForegroundColor Green
    }
}
