$ErrorActionPreference = 'Stop'
$manifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$version = $manifest.version
if ($version -notmatch '^\d+\.\d+\.\d+$') { throw 'Invalid version.' }
$dist = Join-Path $PSScriptRoot 'dist'
New-Item -ItemType Directory -Path $dist -Force | Out-Null
$names = @('manifest.json','content.js','content.css','preview-guard.js','popup.js','popup.html','popup.css','README.md','LICENSE','PRIVACY.md','icons')
$files = @($names | ForEach-Object { Join-Path $PSScriptRoot $_ })
foreach ($file in $files) { if (!(Test-Path -LiteralPath $file)) { throw "Missing package file: $file" } }
$zip = Join-Path $dist "douyin-clean-grid-v$version.zip"
# Explicit allowlist: no tests, local history, dependencies or browsing data.
# manifest.json is at the archive root for both unpacked loading and store upload.
Compress-Archive -LiteralPath $files -DestinationPath $zip -Force
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::Open($zip, [IO.Compression.ZipArchiveMode]::Update)
try {
  foreach ($entry in @($archive.Entries)) {
    if ($entry.FullName.Contains('\')) {
      $replacement = $archive.CreateEntry($entry.FullName.Replace('\','/'))
      $inputStream = $entry.Open()
      $outputStream = $replacement.Open()
      try { $inputStream.CopyTo($outputStream) } finally { $inputStream.Dispose(); $outputStream.Dispose() }
      $entry.Delete()
    }
  }
} finally { $archive.Dispose() }
$hash = (Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant()
[IO.File]::WriteAllText((Join-Path $dist 'SHA256SUMS.txt'), "$hash  douyin-clean-grid-v$version.zip`n", (New-Object Text.UTF8Encoding($false)))
Write-Host "Built: $zip"
