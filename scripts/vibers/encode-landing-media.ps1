# Cuts the Vibers Connect landing clips from the source footage (the user's Pexels videos): short, muted, web-ready.
# Each hero clip gets a 1920x1080 desktop cut and a 720x1280 portrait cut framed on its subject, plus WebP posters
# (the first frame, painted before the film loads). Content photos are separate (Pexels stills, not video frames).
# Usage: & .\scripts\vibers\encode-landing-media.ps1 -Source "<folder with the source mp4s>"
param([Parameter(Mandatory = $true)][string]$Source)

$ErrorActionPreference = 'Stop'
$out = Join-Path (Get-Location) 'public\media\vibers'
New-Item -ItemType Directory -Force $out | Out-Null

# name, source, start (s), length (s), portrait crop centre (share of width), pre-filter, desktop/phone CRF, desktop cap
$clips = @(
  @{ n = 'yacht';  f = '12630734-hd_1920_1080_30fps.mp4';  ss = 1.0;  t = 6.2; cx = 0.52; fx = 'hqdn3d=2:2:7:7,';     dc = 28; pc = 27; cap = '2600k' },
  @{ n = 'tribe';  f = '8502760-uhd_3840_2160_24fps.mp4';  ss = 3.0;  t = 4.8; cx = 0.60; fx = '';                    dc = 26; pc = 27; cap = '4000k' },
  @{ n = 'summit'; f = '13499756_1920_1080_30fps.mp4';     ss = 0.0;  t = 4.8; cx = 0.46; fx = 'hqdn3d=2:2:7:7,';     dc = 28; pc = 28; cap = '3000k' },
  @{ n = 'nights'; f = '16803494-uhd_3840_2160_24fps.mp4'; ss = 23.0; t = 4.8; cx = 0.45; fx = 'hqdn3d=1.5:1.5:6:6,'; dc = 26; pc = 27; cap = '4000k' }
)
$grade = 'eq=contrast=1.03:saturation=0.94'
$x264 = @('-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', '-g', '60')

foreach ($c in $clips) {
  $in = Join-Path $Source $c.f
  $crop = "crop=ih*9/16:ih:max(0\,min(iw-ih*9/16\,iw*$($c.cx)-ih*9/32)):0"
  ffmpeg -v error -y -ss $c.ss -t $c.t -i $in -vf "$($c.fx)scale=1920:1080:flags=lanczos,fps=30,$grade" @x264 -crf $c.dc -maxrate $c.cap -bufsize 6000k "$out\hero-$($c.n)-d-v1.mp4"
  ffmpeg -v error -y -ss $c.ss -t $c.t -i $in -vf "$($c.fx)$crop,scale=720:1280:flags=lanczos,fps=30,$grade" @x264 -crf $c.pc -maxrate 1600k -bufsize 3200k "$out\hero-$($c.n)-m-v1.mp4"
  ffmpeg -v error -y -ss $c.ss -i $in -frames:v 1 -vf "scale=1600:900:flags=lanczos,$grade" -c:v libwebp -quality 74 "$out\hero-$($c.n)-d-v1.webp"
  ffmpeg -v error -y -ss $c.ss -i $in -frames:v 1 -vf "$crop,scale=720:1280:flags=lanczos,$grade" -c:v libwebp -quality 72 "$out\hero-$($c.n)-m-v1.webp"
  Write-Output "clip $($c.n) done"
}

# The phone frame beside "Who is a Viber" (MomentReel.tsx): four portrait moments, about 3 s each at 540x960, plus a
# poster each. The beach dance is 120 fps footage slowed to 30 fps; the culture clip is taller than 9:16, so it is cropped.
$grade = 'eq=contrast=1.03:saturation=0.95'
$small = @('-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', '-g', '30', '-crf', '28', '-maxrate', '1200k', '-bufsize', '2400k')
$moments = @(
  @{ n = 'dance';    f = '16923652_1080_1920_120fps.mp4';   ss = 0.2; t = 1.05; vf = 'setpts=2.9*PTS,fps=30,scale=540:960:flags=lanczos' },
  @{ n = 'smile';    f = '16673555-hd_1080_1920_25fps.mp4'; ss = 0.6; t = 3.0;  vf = 'fps=30,scale=540:960:flags=lanczos' },
  @{ n = 'culture';  f = '9466610-uhd_2160_4096_25fps.mp4'; ss = 8.0; t = 3.0;  vf = 'crop=iw:iw*16/9,fps=30,scale=540:960:flags=lanczos' },
  @{ n = 'fireside'; f = '6715886-uhd_2160_3840_25fps.mp4'; ss = 1.0; t = 3.0;  vf = 'hqdn3d=1.5:1.5:5:5,fps=30,scale=540:960:flags=lanczos' }
)
foreach ($c in $moments) {
  $in = Join-Path $Source $c.f
  ffmpeg -v error -y -ss $c.ss -t $c.t -i $in -vf "$($c.vf),$grade" @small "$out\moment-$($c.n)-v1.mp4"
  ffmpeg -v error -y -ss $c.ss -i $in -frames:v 1 -vf "$(($c.vf -replace 'setpts=[0-9.]+\*PTS,', '')),$grade" -c:v libwebp -quality 70 "$out\moment-$($c.n)-v1.webp"
  Write-Output "moment $($c.n) done"
}

Get-ChildItem $out -Filter '*.mp4' | Select-Object Name, @{ n = 'KB'; e = { [math]::Round($_.Length / 1KB) } } | Format-Table -AutoSize | Out-String -Width 120
