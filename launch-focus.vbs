' Launch the development app without leaving a Command Prompt window open.
Set shell = CreateObject("WScript.Shell")
Set files = CreateObject("Scripting.FileSystemObject")

' Derive the project directory from this file so the launcher still works if
' the whole project folder is moved to another location.
projectDirectory = files.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = projectDirectory

' npm.cmd is used explicitly because Windows may block the npm.ps1 wrapper.
shell.Run "cmd.exe /c npm.cmd start", 0, False
