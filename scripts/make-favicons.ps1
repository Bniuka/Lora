Add-Type -AssemblyName System.Drawing

$srcPath = "H:\LORA\Logo\loraround.png"
$src = [System.Drawing.Bitmap]::FromFile($srcPath)
Write-Host "Source image: $($src.Width) x $($src.Height)"

function Resize-And-Save {
    param(
        [int]$targetW,
        [int]$targetH,
        [string]$outputPath
    )
    $bmp = New-Object System.Drawing.Bitmap($targetW, $targetH)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($src, 0, 0, $targetW, $targetH)
    $g.Dispose()
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Generated: $outputPath ($targetW x $targetH)"
}

Resize-And-Save -targetW 48 -targetH 48 -outputPath "H:\LORA\public\favicon-48x48.png"
Resize-And-Save -targetW 96 -targetH 96 -outputPath "H:\LORA\public\favicon-96x96.png"
Resize-And-Save -targetW 180 -targetH 180 -outputPath "H:\LORA\public\apple-touch-icon.png"
Resize-And-Save -targetW 192 -targetH 192 -outputPath "H:\LORA\public\favicon-192x192.png"
Resize-And-Save -targetW 512 -targetH 512 -outputPath "H:\LORA\public\favicon-512x512.png"
Resize-And-Save -targetW 48 -targetH 48 -outputPath "H:\LORA\public\favicon.png"

# Generate proper favicon.ico from 48x48
$icoBmp = New-Object System.Drawing.Bitmap(48, 48)
$icoG = [System.Drawing.Graphics]::FromImage($icoBmp)
$icoG.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$icoG.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$icoG.DrawImage($src, 0, 0, 48, 48)
$icoG.Dispose()
$hIcon = $icoBmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$fs = New-Object System.IO.FileStream("H:\LORA\public\favicon.ico", [System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()
$icon.Dispose()
$icoBmp.Dispose()
Write-Host "Generated: H:\LORA\public\favicon.ico"

$src.Dispose()
Write-Host "All favicons generated successfully!"
