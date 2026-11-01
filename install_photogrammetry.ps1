$ErrorActionPreference = "Stop"

$toolsDir = Join-Path $PSScriptRoot "backend_tools"
if (-not (Test-Path $toolsDir)) {
    New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
}

# --- COLMAP ---
$colmapZipUrl = "https://github.com/colmap/colmap/releases/download/4.1.1/colmap-x64-windows-nocuda.zip"
$colmapZipPath = Join-Path $toolsDir "colmap.zip"
$colmapExtractDir = Join-Path $toolsDir "colmap"

Write-Host "Downloading COLMAP..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $colmapZipUrl -OutFile $colmapZipPath

Write-Host "Extracting COLMAP..." -ForegroundColor Cyan
if (Test-Path $colmapExtractDir) { Remove-Item -Recurse -Force $colmapExtractDir }
Expand-Archive -Path $colmapZipPath -DestinationPath $colmapExtractDir -Force
Remove-Item $colmapZipPath

# --- OpenMVS ---
$openmvsZipUrl = "https://github.com/cdcseacave/openMVS/releases/download/v2.4.0/OpenMVS_Windows_x64.zip"
$openmvsZipPath = Join-Path $toolsDir "openmvs.zip"
$openmvsExtractDir = Join-Path $toolsDir "openmvs"

Write-Host "Downloading OpenMVS..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $openmvsZipUrl -OutFile $openmvsZipPath

Write-Host "Extracting OpenMVS..." -ForegroundColor Cyan
if (Test-Path $openmvsExtractDir) { Remove-Item -Recurse -Force $openmvsExtractDir }
Expand-Archive -Path $openmvsZipPath -DestinationPath $openmvsExtractDir -Force
Remove-Item $openmvsZipPath

Write-Host "Installation Complete!" -ForegroundColor Green
Write-Host "The tools have been downloaded to: $toolsDir" -ForegroundColor Yellow

$envPath = Join-Path $PSScriptRoot "backend\.env"
Write-Host "Updating backend/.env file with tool paths..." -ForegroundColor Cyan

# Find the exact path for colmap.bat (since it might be inside a subfolder in the zip)
$colmapBatPath = Get-ChildItem -Path $colmapExtractDir -Recurse -Filter "COLMAP.bat" | Select-Object -First 1
$openmvsBinDir = Get-ChildItem -Path $openmvsExtractDir -Recurse -Filter "DensifyPointCloud.exe" | Select-Object -First 1 | Split-Path -Parent

if ($colmapBatPath) {
    $colmapExe = $colmapBatPath.FullName
} else {
    $colmapExe = Join-Path $colmapExtractDir "COLMAP.bat"
}

if ($openmvsBinDir) {
    $openmvsBin = $openmvsBinDir
} else {
    $openmvsBin = Join-Path $openmvsExtractDir "bin"
}

$envContent = "`nCOLMAP_EXE=`"$colmapExe`"`nOPENMVS_BIN_DIR=`"$openmvsBin`"`n"
Add-Content -Path $envPath -Value $envContent

Write-Host "Paths added to .env:"
Write-Host "COLMAP_EXE=$colmapExe"
Write-Host "OPENMVS_BIN_DIR=$openmvsBin"
Write-Host "Done! The SMART GRANITE backend will now automatically use true photogrammetry." -ForegroundColor Green
