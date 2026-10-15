Option Explicit
Dim files, shell, folder, powershell, command, result
Set files = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
folder = files.GetParentFolderName(WScript.ScriptFullName)
powershell = shell.ExpandEnvironmentStrings("%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe")
command = Chr(34) & powershell & Chr(34) & " -NoLogo -NoProfile -ExecutionPolicy Bypass -File " & Chr(34) & folder & "\scripts\local-site.ps1" & Chr(34) & " -Action Start -OpenBrowser"
result = shell.Run(command, 0, True)
If result <> 0 Then
  MsgBox "MORROW could not start. Open the project folder and run the start command to view the error.", vbExclamation, "MORROW"
End If
