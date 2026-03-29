' Trading Journal - Desktop Shortcut Creator
' This script creates a desktop shortcut for the Trading Journal app

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get paths
strDesktop = WshShell.SpecialFolders("Desktop")
strScriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
strTarget = strScriptDir & "\start.bat"
strShortcutPath = strDesktop & "\Trading Journal.lnk"

' Create shortcut
Set oShortcut = WshShell.CreateShortcut(strShortcutPath)
oShortcut.TargetPath = strTarget
oShortcut.WorkingDirectory = strScriptDir
oShortcut.Description = "Start Trading Journal Application"
oShortcut.IconLocation = "shell32.dll,21"
oShortcut.WindowStyle = 1
oShortcut.Save

WScript.Echo "Desktop shortcut created successfully!" & vbCrLf & vbCrLf & "Location: " & strShortcutPath
