$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$assetDirectory = (Resolve-Path 'assets\hyundai\card-detail').Path
$workspaceDirectory = (Resolve-Path '.').Path
if (-not $assetDirectory.StartsWith($workspaceDirectory, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Asset directory escaped workspace: $assetDirectory"
}

$targetSizes = @{
  april    = @(395, 494)
  june     = @(396, 496)
  october  = @(396, 495)
  november = @(347, 434)
}

Get-ChildItem -LiteralPath $assetDirectory -File -Filter '*.png' | ForEach-Object {
  $month = $_.BaseName.Split('-')[0]
  $target = $targetSizes[$month]
  if (-not $target) { throw "Unknown card-detail prefix: $($_.Name)" }

  $source = [System.Drawing.Image]::FromFile($_.FullName)
  try {
    $bitmap = New-Object System.Drawing.Bitmap($target[0], $target[1], [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      try {
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.DrawImage($source, 0, 0, $target[0], $target[1])
      } finally {
        $graphics.Dispose()
      }

      $temporary = Join-Path $assetDirectory ($_.BaseName + '.resized.png')
      $bitmap.Save($temporary, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $bitmap.Dispose()
    }
  } finally {
    $source.Dispose()
  }

  Move-Item -LiteralPath $temporary -Destination $_.FullName -Force
}
