fn main() {
    #[cfg(windows)]
    {
        let mut res = winres::WindowsResource::new();
        res.set_icon("frontend/assets/icon.ico");
        res.set("ProductName", "Orbshacker");
        res.set("FileDescription", "Orbshacker - Discord Game Activity Companion");
        res.set("CompanyName", "Mextrim Open Source");
        res.set("LegalCopyright", "Copyright (C) 2026 Mextrim. All rights reserved.");
        res.set("OriginalFilename", "orbshacker.exe");
        res.set("InternalName", "orbshacker");
        res.set("ProductVersion", "3.0.0");
        res.set("FileVersion", "3.0.0.0");
        res.set("Comments", "Open-source Discord activity and quest assistant.");

        let manifest = r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<assembly xmlns="urn:schemas-microsoft-com:asm.v1" manifestVersion="1.0">
  <assemblyIdentity version="3.0.0.0" processorArchitecture="*" name="Mextrim.Orbshacker" type="win32"/>
  <description>Orbshacker Discord Activity Companion</description>
  <trustInfo xmlns="urn:schemas-microsoft-com:asm.v2">
    <security>
      <requestedPrivileges>
        <requestedExecutionLevel level="asInvoker" uiAccess="false"/>
      </requestedPrivileges>
    </security>
  </trustInfo>
  <compatibility xmlns="urn:schemas-microsoft-com:compatibility.v1">
    <application>
      <!-- Windows 10 and Windows 11 -->
      <supportedOS Id="{8e0f7a12-bfb3-4fe8-b9a5-48fd50a15a9a}"/>
      <!-- Windows 8.1 -->
      <supportedOS Id="{1f676c76-80e1-4239-95bb-83d0f6d0da78}"/>
      <!-- Windows 8 -->
      <supportedOS Id="{4a2f28e3-53b9-4441-ba9c-d69d4a4a6e38}"/>
      <!-- Windows 7 -->
      <supportedOS Id="{35138b9a-5d96-4fbd-8e2d-a2440225f93a}"/>
    </application>
  </compatibility>
  <application xmlns="urn:schemas-microsoft-com:asm.v3">
    <windowsSettings>
      <dpiAware xmlns="http://schemas.microsoft.com/SMI/2005/WindowsSettings">true/pm</dpiAware>
      <dpiAwareness xmlns="http://schemas.microsoft.com/SMI/2016/WindowsSettings">PerMonitorV2</dpiAwareness>
    </windowsSettings>
  </application>
</assembly>
"#;
        res.set_manifest(manifest);
        let _ = res.compile();
    }
}
