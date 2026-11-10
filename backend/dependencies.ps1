$ErrorActionPreference = 'Stop'
# PostgreSQL JDBC runtime dependency. Keep downloads out of Git.
$version = '42.7.8'
$expectedHash = '2a32a9dcbc42d67a50ad3a0de5efd102c8d2be46720045f2cbd6689f160ab7c7'
$destination = Join-Path $PSScriptRoot "lib/postgresql-$version.jar"
if (Test-Path -LiteralPath $destination) {
    if ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedHash) {
        throw 'Existing JDBC JAR checksum differs. Inspect it before replacing it.'
    }
    Write-Host "PostgreSQL JDBC $version verified."
    return
}
New-Item -ItemType Directory -Force (Split-Path $destination -Parent) | Out-Null
$download = [System.IO.Path]::GetTempFileName()
try {
    Invoke-WebRequest -Uri "https://repo.maven.apache.org/maven2/org/postgresql/postgresql/$version/postgresql-$version.jar" -OutFile $download
    if ((Get-FileHash -LiteralPath $download -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedHash) {
        throw 'Downloaded JDBC JAR failed SHA-256 verification.'
    }
    Move-Item -LiteralPath $download -Destination $destination
    Write-Host "PostgreSQL JDBC $version downloaded and verified."
} finally {
    if (Test-Path -LiteralPath $download) { Remove-Item -LiteralPath $download }
}
