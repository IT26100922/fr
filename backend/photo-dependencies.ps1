$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
# WebP is not built into JDK ImageIO. These small ImageIO plug-ins decode it;
# JPEG/PNG use the JDK. No Maven installation or application framework is needed.
# Source/license: https://github.com/haraldk/TwelveMonkeys (BSD-3-Clause).
$photoVersion = '3.15.0'
$photoModules = @{
    'common' = @('common-lang', 'common-io', 'common-image')
    'imageio' = @('imageio-core', 'imageio-metadata', 'imageio-webp')
}
$photoHashes = @{
    'common-image' = 'ec4e3e110b5509895761d1dd497c580e06a109546d0aae5e5b4f3da013496b29'
    'common-io' = '8994d3cb95c6ebc73f3722b98185ed767ad7a15b7a299fbe12759a8a8862c1bd'
    'common-lang' = '13b0e954537504bdca2be0ac2f2d3376dd0e87941f2bf07c6a1d9f83734983a9'
    'imageio-core' = '1126663b28fc0689af4ddc7cc5893509033b42c8f8bf361d03be729b76f2a04b'
    'imageio-metadata' = '5c869390bdf62002b1dad4b04e2dfed9fb1116b2429e7d6db75e1b92221f31c9'
    'imageio-webp' = '029882337da9d7b8055ea22238f750182a581a623547c83c2493c17a26e06fbd'
}
function Get-PhotoDependencyHash([string]$photoPath) {
    $photoStream = [IO.File]::OpenRead($photoPath)
    $photoHasher = [Security.Cryptography.SHA256]::Create()
    try { return [BitConverter]::ToString($photoHasher.ComputeHash($photoStream)).Replace('-', '').ToLowerInvariant() }
    finally { $photoStream.Dispose(); $photoHasher.Dispose() }
}
New-Item -ItemType Directory -Force "$PSScriptRoot/lib" | Out-Null
foreach ($photoGroup in $photoModules.Keys) {
    foreach ($photoModule in $photoModules[$photoGroup]) {
        $photoTarget = "$PSScriptRoot/lib/$photoModule-$photoVersion.jar"
        if (Test-Path -LiteralPath $photoTarget) {
            if ((Get-PhotoDependencyHash $photoTarget) -ne $photoHashes[$photoModule]) { throw "Unexpected checksum for $photoModule" }
            continue
        }
        $photoUrl = "https://repo.maven.apache.org/maven2/com/twelvemonkeys/$photoGroup/$photoModule/$photoVersion/$photoModule-$photoVersion.jar"
        $photoTemp = "$photoTarget.download"
        try {
            Invoke-WebRequest -Uri $photoUrl -OutFile $photoTemp
            if ((Get-PhotoDependencyHash $photoTemp) -ne $photoHashes[$photoModule]) { throw "Download checksum failed for $photoModule" }
            Move-Item -LiteralPath $photoTemp -Destination $photoTarget
        } finally {
            if (Test-Path -LiteralPath $photoTemp) { Remove-Item -LiteralPath $photoTemp }
        }
    }
}
