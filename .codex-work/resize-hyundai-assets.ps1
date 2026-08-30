Add-Type -AssemblyName System.Drawing

$assetDirectory = Resolve-Path 'assets\hyundai'
$cardFiles = Get-ChildItem -LiteralPath $assetDirectory -Filter 'card-*.png'

foreach ($file in $cardFiles) {
  $source = [System.Drawing.Image]::FromFile($file.FullName)
  try {
    $targetWidth = 536
    $targetHeight = 669
    $bitmap = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight)
    try {
      $bitmap.SetResolution(96, 96)
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      try {
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.DrawImage($source, 0, 0, $targetWidth, $targetHeight)
      } finally {
        $graphics.Dispose()
      }
      $temporary = "$($file.FullName).optimized.png"
      $bitmap.Save($temporary, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $bitmap.Dispose()
    }
  } finally {
    $source.Dispose()
  }
  Move-Item -LiteralPath $temporary -Destination $file.FullName -Force
}
