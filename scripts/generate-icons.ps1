param(
  [string]$Source = (Join-Path $PSScriptRoot '..\assets\branding\monitor-manager-logo.png')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$iconRoot = Join-Path $projectRoot 'assets\icons'
$buildRoot = Join-Path $projectRoot 'build'
New-Item -ItemType Directory -Force -Path $iconRoot, $buildRoot | Out-Null

$sourceImage = [Drawing.Image]::FromFile([IO.Path]::GetFullPath($Source))
try {
  foreach ($size in @(16, 32, 64, 128, 256, 512)) {
    $bitmap = New-Object Drawing.Bitmap($size, $size, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      $graphics = [Drawing.Graphics]::FromImage($bitmap)
      try {
        $graphics.Clear([Drawing.Color]::Transparent)
        $graphics.CompositingQuality = [Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.DrawImage($sourceImage, 0, 0, $size, $size)
      }
      finally { $graphics.Dispose() }
      $bitmap.Save((Join-Path $iconRoot "icon-$size.png"), [Drawing.Imaging.ImageFormat]::Png)
      if ($size -eq 512) { $bitmap.Save((Join-Path $buildRoot 'icon.png'), [Drawing.Imaging.ImageFormat]::Png) }
    }
    finally { $bitmap.Dispose() }
  }
}
finally { $sourceImage.Dispose() }

# A monochrome, transparent derivative of the official two-display mark for the macOS menu bar.
$tray = New-Object Drawing.Bitmap(36, 36, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
try {
  $graphics = [Drawing.Graphics]::FromImage($tray)
  try {
    $graphics.Clear([Drawing.Color]::Transparent)
    $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $pen = New-Object Drawing.Pen([Drawing.Color]::Black, 3)
    $pen.StartCap = [Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [Drawing.Drawing2D.LineCap]::Round
    try {
      $graphics.DrawRectangle($pen, 4, 8, 18, 14)
      $graphics.DrawRectangle($pen, 14, 5, 18, 14)
      $graphics.DrawLine($pen, 8, 27, 28, 27)
      $graphics.DrawLine($pen, 8, 27, 12, 23)
      $graphics.DrawLine($pen, 8, 27, 12, 31)
      $graphics.DrawLine($pen, 28, 27, 24, 23)
      $graphics.DrawLine($pen, 28, 27, 24, 31)
    }
    finally { $pen.Dispose() }
  }
  finally { $graphics.Dispose() }
  $tray.Save((Join-Path $iconRoot 'trayTemplate.png'), [Drawing.Imaging.ImageFormat]::Png)
}
finally { $tray.Dispose() }

Write-Output "Generated Monitor Manager icons in $iconRoot"
