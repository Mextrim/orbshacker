# 🛡️ Security Policy — Orbshacker

Welcome to the **Orbshacker Security Center**. We take security, privacy, and account safety extremely seriously. Orbshacker was re-engineered from the ground up as a **100% Pure Native Rust** application to provide the highest standards of memory safety, process hygiene, and cryptographic transparency.

---

## 📋 Supported Versions

We actively maintain and provide security patches for the current major release of Orbshacker:

| Version | Supported | Architecture | Security Maintenance Status |
|:-------:|:---------:|:------------:|:----------------------------|
| **3.0.x** | :white_check_mark: **Active** | 100% Native Safe Rust (`orbshacker.exe`) | **Current Production Release**. Full security updates, memory safety guarantees, and automated SHA-256 release checksums. |
| **2.x** | :x: **End of Life** | Legacy Electron Runtime | **Deprecated**. No longer maintained. All users are advised to upgrade to v3.0+. |
| **1.x** | :x: **End of Life** | Legacy Prototype | **Deprecated**. Unsupported legacy build. |
| **< 1.0** | :x: **End of Life** | Early Proof of Concept | **Deprecated**. |

> [!IMPORTANT]
> If you are using any legacy `v2.x` (Electron) or earlier build, please update immediately to the native **v3.0.0+** release. The modern Rust architecture uses 8x less RAM, eliminates Node.js attack surfaces, and features hardened local IPC communication.

---

## 🏛️ The 6 Pillars of Orbshacker Security

Orbshacker is designed with a **Security-First & Privacy-First** philosophy:

```
  ┌────────────────────────────────────────────────────────────────────────┐
  │                    ORBSHACKER SECURITY ARCHITECTURE                    │
  ├──────────────────────────────────┬─────────────────────────────────────┤
  │ 🔑 ZERO TOKEN ACCESS             │ 🕵️ ZERO EXTERNAL TELEMETRY          │
  │ • No Discord tokens required     │ • No Google Analytics or Mixpanel   │
  │ • No passwords or session cookies│ • No external telemetry beacons     │
  │ • Safe Local IPC socket only     │ • Traffic strictly limited to local │
  ├──────────────────────────────────┼─────────────────────────────────────┤
  │ 🦀 MEMORY SAFETY (RUST 2021)     │ 🌐 SANDBOXED WEBVIEW2 ENGINE        │
  │ • Immune to buffer overflows     │ • Isolated 'orbshacker://' protocol │
  │ • Immune to use-after-free bugs  │ • Remote script execution disabled  │
  │ • Zero Electron runtime risks    │ • Strict IPC parameter validation   │
  ├──────────────────────────────────┼─────────────────────────────────────┤
  │ 🛡️ SAFE SUBPROCESS HYGIENE       │ 🔍 CRYPTOGRAPHIC INTEGRITY          │
  │ • Zero driver or kernel hooks    │ • Automated SHA-256 release hashes  │
  │ • Zero DLL / memory injection    │ • 100% Open-source reproducible     │
  │ • Strict Path Traversal defense  │ • Transparent GitHub Actions CI/CD  │
  └──────────────────────────────────┴─────────────────────────────────────┘
```

### 1. 🔑 Zero Token Access & Zero Credential Requirement
- **No Login Required:** Orbshacker **never** asks for, reads, stores, or transmits your Discord user token, bot token, email, password, or two-factor authentication (2FA) keys.
- **Local IPC Communication Only:** The spoofer communicates strictly with the official Discord desktop client running on your machine via the local Windows named pipe (`\\.\pipe\discord-ipc-0` .. `discord-ipc-9`) or standard OS protocol handlers (`discord:///quest-home`).
- **Your Account Stays Yours:** Because Orbshacker never handles credentials, your account tokens can never be leaked, logged, or intercepted.

### 2. 🕵️ Zero External Telemetry & Tracking
- **100% Telemetry-Free:** No analytics SDKs (Google Analytics, Mixpanel, Sentry, PostHog), no user tracking, no device fingerprinting, and no background tracking pixels.
- **Minimal Network Surface:** The application initiates outgoing HTTPS connections **only** to the official GitHub API (`https://api.github.com/repos/Mextrim/orbshacker/releases/latest`) when manually or automatically checking for application updates.

### 3. 🦀 Memory Safety by Design (Rust 2021 Edition)
- **Elimination of Critical Vulnerability Classes:** By migrating 100% of the codebase from Electron/Node.js to safe Rust (`edition = "2021"`), the application is mathematically protected against:
  - Buffer overflows & stack smashing
  - Use-after-free & double-free flaws
  - Race conditions and dangling pointers
  - Type-confusion and uninitialized memory disclosures
- **Hardened Binary Compilation:** Release builds are compiled with full Link-Time Optimization (`lto = true`), symbol stripping (`strip = true`), Data Execution Prevention (DEP/NX), and Address Space Layout Randomization (ASLR).

### 4. 🌐 Sandboxed GUI & Custom Protocol Isolation
- **Restricted Local Protocol:** The user interface is served inside Microsoft Edge WebView2 via a custom local URI scheme (`orbshacker://localhost/index.html`).
- **No Remote Code Execution (RCE):** The browser context cannot load external scripts or stylesheets. All assets (HTML, CSS, JS, icons) are embedded directly into the read-only `.rdata` section of the single executable at compile time.
- **Hardened External URL Opening:** When opening external documentation or Discord quest pages, Orbshacker calls Windows API `ShellExecuteW` directly through FFI rather than spawning `cmd.exe /c start`. All target URLs are strictly validated:
  - Allowed schemes: `https://`, `http://`, `discord://`
  - Rejection of control characters, null bytes (`\0`), and shell escape sequences.

### 5. 🛡️ Safe Subprocess Hygiene & Anti-Path Traversal
- **Non-Invasive Emulation:** Process spoofing is performed by running clean, non-invasive stub helper instances with `--stub` parameters.
- **Zero Kernel / Driver Hooks:** Orbshacker does not install kernel-mode drivers, does not perform DLL injection, and does not attach debuggers to Discord or running games.
- **Path Traversal Defense:** Executable names provided to the process spoofer or custom game tab are strictly sanitized with `Path::file_name()` and illegal character filtering (`/`, `\`, `:`, `*`, `?`, `"`, `<`, `>`, `|`, `\0`), ensuring helper stubs can never escape the designated sandbox directory (`%LOCALAPPDATA%\Orbshacker\stubs`). Any legacy desktop folders are automatically detected and purged on launch.
- **Automated Process Cleanup:** Every spawned stub process is tracked by PID. When farming completes or when Orbshacker is closed, all child stub processes and temporary Steam ACF manifests are terminated and removed cleanly.

### 6. 🔍 Cryptographic Verification & Reproducible Builds
- Every official release artifact on GitHub is generated automatically through GitHub Actions CI/CD workflows and published with verifiable **SHA-256 checksums** (`SHA256SUMS`).
- Users can verify the integrity of their download at any time:
  ```powershell
  # Verify on Windows PowerShell:
  Get-FileHash -Algorithm SHA256 .\orbshacker.exe
  ```

---

## 🚨 Reporting a Vulnerability

We appreciate the responsible disclosure of security issues by researchers and the community. If you discover a security vulnerability in Orbshacker, please report it privately following the instructions below.

### How to Report Privately

1. **GitHub Security Advisories (Recommended):**
   - Navigate to the [New Security Advisory](https://github.com/Mextrim/orbshacker/security/advisories/new) page on GitHub.
   - Provide a clear summary of the issue, affected versions, and detailed reproduction steps or proof-of-concept (PoC).
2. **Direct Contact:**
   - If you cannot use GitHub Advisories, please submit a report to **`security@orbshacker.dev`** or contact repository maintainer **[@Mextrim](https://github.com/Mextrim)** privately.
   - Please encrypt sensitive disclosures if necessary.

> [!WARNING]
> Please do **NOT** open public GitHub issues, discussions, or social media posts regarding suspected security vulnerabilities until a fix has been prepared and released.

---

## ⏱️ Response Timelines & SLA Commitments

We are committed to rapid response and transparent remediation:

| Milestone | Target SLA | Description |
|:----------|:----------:|:------------|
| **Initial Acknowledgment** | **< 24 Hours** | We will confirm receipt of your vulnerability report. |
| **Severity & Triaging** | **< 48 Hours** | We will investigate, reproduce the flaw, and assign a CVSS severity score. |
| **Remediation & Patch** | **3–7 Days** | We will develop, test, and package a security patch for release. |
| **Public Disclosure & Advisory** | **Coordinated** | We will publish a CVE/GHSA advisory and credit the researcher. |

---

## 🤝 Safe Harbor Policy

We consider security research conducted in good faith to be beneficial to the community. If you follow this security policy and act responsibly:
- We will **not** pursue legal action against you.
- We will work collaboratively with you to understand and resolve the issue quickly.
- We will publicly acknowledge your contribution in our Release Notes and Security Hall of Fame (unless you wish to remain anonymous).

---

## ❓ Security FAQ

<details>
<summary><b>Q1: Can Orbshacker steal my Discord account or token?</b></summary>
<br>
<b>No, absolutely not.</b> Orbshacker does not contain any credential-harvesting code. It communicates with Discord exclusively over Discord's official local IPC socket (`\\.\pipe\discord-ipc-0`), the exact same method utilized by Spotify, Steam, and verified Discord games. The source code is 100% public and open for review.
</details>

<details>
<summary><b>Q2: Does Orbshacker trigger antivirus false-positives?</b></summary>
<br>
Unlike old Electron packers or packed Python scripts, Orbshacker is compiled directly into a clean, uncompressed native PE Windows x64 binary with standard Windows API imports (`user32`, `shell32`, `kernel32`). It does not inject into system processes, and every release provides SHA-256 hashes to guarantee clean origin.
</details>

<details>
<summary><b>Q3: Does Orbshacker run with Administrator / Root privileges?</b></summary>
<br>
<b>No.</b> Orbshacker runs entirely in standard user-mode (`UAC: asInvoker`). It never asks for Administrator elevation because Discord's local IPC and user-mode process creation do not require elevated privileges.
</details>

<details>
<summary><b>Q4: How can I verify that my copy hasn't been tampered with?</b></summary>
<br>
Download releases strictly from the official repository: <a href="https://github.com/Mextrim/orbshacker/releases">github.com/Mextrim/orbshacker/releases</a>. Compare the output of <code>Get-FileHash -Algorithm SHA256 .\orbshacker.exe</code> against the official <code>SHA256SUMS</code> file attached to the GitHub release.
</details>

---

*Thank you for helping keep Orbshacker and its users safe!*
