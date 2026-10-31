; Installer hooks for overte-mcp (Tauri NSIS).
; "Register in AI tools" page + register/unregister come from the vendored fleet
; include mcp-clients.nsh (copied from mcp-central-docs by native/build.ps1 -
; do not edit it here).
!define MCP_REG_NAME "overte-mcp"
!define MCP_REG_EXE "overte-mcp-backend.exe"
!include "${__FILEDIR__}\mcp-clients.nsh"

!macro KillFleetProcesses
  DetailPrint "Stopping overte-mcp MCP processes..."
  ExecWait 'powershell -NoProfile -Command "Stop-Process -Name overte-mcp-backend -Force -EA 0; Stop-Process -Name overte_mcp-native -Force -EA 0; taskkill /F /IM overte-mcp-backend.exe /T 2>; taskkill /F /IM overte_mcp-native.exe /T 2>"' 0
  !if "" == "currentUser"
    nsis_tauri_utils::KillProcessCurrentUser "overte-mcp-backend.exe" ; Pop 0
    nsis_tauri_utils::KillProcessCurrentUser "overte_mcp-native.exe" ; Pop 0
  !else
    nsis_tauri_utils::KillProcess "overte-mcp-backend.exe" ; Pop 0
    nsis_tauri_utils::KillProcess "overte_mcp-native.exe" ; Pop 0
  !endif
  Sleep 3000
!macroend
!macro UninstallPrevious
  ReadRegStr R0  "Software\Microsoft\Windows\CurrentVersion\Uninstall\ai.fleet.overte-mcp" "UninstallString"
  {If} R0 != "" ; ExecWait '"R0" /S' 0 ; Sleep 1500 ; {EndIf}
!macroend
!macro NSIS_HOOK_PREINSTALL ; !insertmacro KillFleetProcesses ; !insertmacro UninstallPrevious ; !macroend
!macro NSIS_HOOK_PREUNINSTALL ; !insertmacro McpClientsUnregister ; !insertmacro KillFleetProcesses ; !macroend
!macro NSIS_HOOK_POSTINSTALL ; !insertmacro McpClientsRegister ; !macroend
