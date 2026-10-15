Option Explicit
Dim files, shell, folder, powershell, command, result
Set files = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
folder = files.GetParentFolderName(WScript.ScriptFullName)
powershell = shell.ExpandEnvironmentStrings("%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe")
command = Chr(34) & powershell & Chr(34) & " -NoLogo -NoProfile -ExecutionPolicy Bypass -File " & Chr(34) & folder & "\scripts\share-site.ps1" & Chr(34) & " -Action Stop"
result = shell.Run(command, 0, True)
If result <> 0 Then
  MsgBox "MORROW sharing, website or sleep prevention could not stop. The diagnostic file will open.", vbExclamation, "MORROW"
  shell.Run "notepad.exe " & Chr(34) & folder & "\.local\share-last-error.txt" & Chr(34), 1, False
End If
WScript.Quit result
