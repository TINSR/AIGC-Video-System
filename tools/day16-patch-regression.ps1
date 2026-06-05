# Day16 patch regression: overrides, scene fields, retry path
param([string]$Base = "http://localhost:3001/api")

$failures = @()
function Assert-Ok($name, $cond, $detail = "") {
  if ($cond) { Write-Host "[OK] $name" -ForegroundColor Green }
  else {
    Write-Host "[FAIL] $name $detail" -ForegroundColor Red
    $script:failures += $name
  }
}

Write-Host "=== Day16 Patch Regression ===" -ForegroundColor Cyan

$productId = "cmptxx5j100011y8wgihsbze4"
$gen = (Invoke-RestMethod -Method Post -Uri "$Base/products/$productId/creative-plans/generate" -ContentType "application/json" -Body '{"style":"pain_point"}').data
$planId = $gen.id
Invoke-RestMethod -Method Post -Uri "$Base/creative-plans/$planId/approve" | Out-Null

$clips = (Invoke-RestMethod -Method Post -Uri "$Base/products/$productId/material-clips/analyze" -ContentType "application/json" -Body '{"force":true}').data
$plan = (Invoke-RestMethod -Method Post -Uri "$Base/creative-plans/$planId/smart-edit/plan" -ContentType "application/json" -Body '{"force":true}').data

Assert-Ok "plan has sceneSubtitle" ($null -ne $plan.decisions[0].sceneSubtitle -and $plan.decisions[0].sceneSubtitle.Length -gt 0)
Assert-Ok "plan has sceneDuration" ($plan.decisions[0].sceneDuration -gt 0) "duration=$($plan.decisions[0].sceneDuration)"

$getPlan = (Invoke-RestMethod "$Base/creative-plans/$planId/smart-edit/plan").data
Assert-Ok "get plan sceneSubtitle" ($null -ne $getPlan.decisions[0].sceneSubtitle)
Assert-Ok "get plan sceneDuration" ($getPlan.decisions[0].sceneDuration -gt 0)

$sceneId = $plan.decisions[0].sceneId
$altClip = $clips | Where-Object { $_.id -ne $plan.decisions[0].clip.id } | Select-Object -First 1
if (-not $altClip) { $altClip = $clips[0] }

$overrideBody = @{ overrides = @(@{ sceneId = $sceneId; clipId = $altClip.id }) } | ConvertTo-Json -Depth 5
$overridden = (Invoke-RestMethod -Method Post -Uri "$Base/creative-plans/$planId/smart-edit/plan" -ContentType "application/json" -Body $overrideBody).data
Assert-Ok "override applied clip" ($overridden.decisions[0].clip.id -eq $altClip.id)
Assert-Ok "override has reasons" ($overridden.decisions[0].reasons.Count -ge 1)
Assert-Ok "override clears fallback flag" ($overridden.decisions[0].fallbackUsed -eq $false)
Assert-Ok "override keeps sceneSubtitle" ($null -ne $overridden.decisions[0].sceneSubtitle)

try {
  $badBody = @{ overrides = @(@{ sceneId = "bad_scene"; clipId = $altClip.id }) } | ConvertTo-Json -Depth 5
  Invoke-RestMethod -Method Post -Uri "$Base/creative-plans/$planId/smart-edit/plan" -ContentType "application/json" -Body $badBody | Out-Null
  Assert-Ok "override invalid should fail" $false
} catch {
  $err = $_.ErrorDetails.Message | ConvertFrom-Json
  Assert-Ok "override invalid error code" ($err.error.code -eq "SMART_EDIT_OVERRIDE_NOT_FOUND")
}

$render = (Invoke-RestMethod -Method Post -Uri "$Base/creative-plans/$planId/render" -ContentType "application/json" -Body '{"renderMode":"smart_clip_edit"}').data
$task = $null
for ($i = 0; $i -lt 20; $i++) {
  Start-Sleep -Seconds 1
  $task = (Invoke-RestMethod "$Base/tasks/$($render.id)").data
  if ($task.status -in @("success", "failed")) { break }
}
Assert-Ok "render task failed without ffmpeg" ($task.status -eq "failed")
Assert-Ok "render task provider preserved" ($task.provider -eq "smart_clip_edit")

$logCountBeforeRetry = $task.logs.Count
$retry = (Invoke-RestMethod -Method Post -Uri "$Base/tasks/$($render.id)/retry").data
Assert-Ok "retry keeps smart_clip_edit mode" ($retry.renderMode -eq "smart_clip_edit")
Assert-Ok "retry keeps smart_clip_edit provider" ($retry.provider -eq "smart_clip_edit")
Assert-Ok "retry appends logs" ($retry.logs.Count -gt $logCountBeforeRetry)

for ($i = 0; $i -lt 15; $i++) {
  Start-Sleep -Seconds 1
  $retryTask = (Invoke-RestMethod "$Base/tasks/$($render.id)").data
  if ($retryTask.status -eq "failed") { break }
}
$retryLogText = ($retryTask.logs | ForEach-Object { $_.message }) -join " | "
$seedanceHit = [bool]($retryLogText -match "Seedance")
$ffmpegHit = [bool]($retryLogText -match "FFmpeg")
Assert-Ok "retry uses ffmpeg smart path" $ffmpegHit
Assert-Ok "retry avoids seedance step" (-not $seedanceHit)

Write-Host ""
if ($failures.Count -gt 0) {
  Write-Host "FAILED: $($failures -join ', ')" -ForegroundColor Red
  exit 1
}
Write-Host "All patch regression checks passed." -ForegroundColor Cyan
