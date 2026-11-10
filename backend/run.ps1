$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
& "$PSScriptRoot/dependencies.ps1"
& "$PSScriptRoot/photo-dependencies.ps1"
& "$PSScriptRoot/build.ps1"
& java -cp 'backend/build;backend/lib/*' com.friendfinder.Main
