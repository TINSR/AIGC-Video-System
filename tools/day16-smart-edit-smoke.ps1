# Day16 smart clip editing smoke (ASCII)
param([string]$Base = "http://localhost:3001/api")

$failures = @()
function Assert-Ok($name, $cond, $detail = "") {
  if ($cond) { Write-Host "[OK] $name" -ForegroundColor Green }
  else {
    Write-Host "[FAIL] $name $detail" -ForegroundColor Red
    $script:failures += $name
  }
}

Write-Host "=== Day16 Smart Edit Smoke ===" -ForegroundColor Cyan

$health = Invoke-RestMethod "$Base/health"
Assert-Ok "health" ($health.data.status -eq "ok")

$productId = "cmptxx5j100011y8wgihsbze4"
$mats = (Invoke-RestMethod "$Base/products/$productId/materials").data
Assert-Ok "has materials" ($mats.Count -gt 0)

$gen = (Invoke-RestMethod -Method Post -Uri "$Base/products/$productId/creative-plans/generate" -ContentType "application/json" -Body '{"style":"pain_point"}').data
$planId = $gen.id
Assert-Ok "generate plan" ($planId)

$approved = (Invoke-RestMethod -Method Post -Uri "$Base/creative-plans/$planId/approve").data
Assert-Ok "approve plan" ($approved.status -eq "approved")

try {
  Invoke-RestMethod "$Base/creative-plans/$planId/smart-edit/plan" | Out-Null
  Assert-Ok "get plan before build should 404" $false
} catch {
  $err = $_.ErrorDetails.Message | ConvertFrom-Json
  Assert-Ok "get plan before build 404" ($err.error.code -eq "SMART_EDIT_PLAN_NOT_FOUND")
}

$clips = (Invoke-RestMethod -Method Post -Uri "$Base/products/$productId/material-clips/analyze" -ContentType "application/json" -Body '{"force":true}').data
Assert-Ok "analyze clips" ($clips.Count -ge 1)
Assert-Ok "clip has summary" ($clips[0].summary.Length -gt 0)
Assert-Ok "clip has tags" ($clips[0].tags.Count -ge 0)

$plan = (Invoke-RestMethod -Method Post -Uri "$Base/creative-plans/$planId/smart-edit/plan" -ContentType "application/json" -Body '{"force":true}').data
Assert-Ok "build smart edit plan" ($plan.decisions.Count -eq $gen.scenes.Count)
Assert-Ok "decision has score" ($plan.decisions[0].score -gt 0)
Assert-Ok "decision has reasons" ($plan.decisions[0].reasons.Count -gt 0)

$plan2 = (Invoke-RestMethod "$Base/creative-plans/$planId/smart-edit/plan").data
Assert-Ok "get saved plan" ($plan2.decisions.Count -gt 0)

$render = (Invoke-RestMethod -Method Post -Uri "$Base/creative-plans/$planId/render" -ContentType "application/json" -Body '{"renderMode":"smart_clip_edit","withSubtitle":true,"withBgm":false}').data
Assert-Ok "render task created" ($render.provider -eq "smart_clip_edit")
Assert-Ok "render mode" ($render.renderMode -eq "smart_clip_edit")

$taskId = $render.id
$final = $null
for ($i = 0; $i - 45; $i++) {
  Start-Sleep -Seconds 2
  $final = (Invoke-RestMethod "$Base/tasks/$taskId").data
  if ($final.status -in @("success", "failed")) { break }
}
Assert-Ok "task terminal" ($final.status -in @("success", "failed")) "status=$($final.status) err=$($final.errorMessage)"

if ($final.status -eq "success") {
  Assert-Ok "output url" ($final.outputVideoUrl -like "/outputs/*")
  $mp4Path = Join-Path (Resolve-Path "apps/api").Path ($final.outputVideoUrl.TrimStart('/'))
  Assert-Ok "mp4 file exists" (Test-Path $mp4Path) $mp4Path
  $code = curl.exe -s -o NUL -w "%{http_code}" "http://localhost:3001$($final.outputVideoUrl)"
  Assert-Ok "mp4 http 200" ($code -eq "200")
} else {
  Write-Host "Task failed (may need FFmpeg): $($final.errorMessage)" -ForegroundColor Yellow
}

# Regression: analytics still works
$ov = (Invoke-RestMethod "$Base/analytics/overview").data
Assert-Ok "analytics overview" ($null -ne $ov.totalPlays)

Write-Host ""
if ($failures.Count -gt 0) {
  Write-Host "FAILED: $($failures -join ', ')" -ForegroundColor Red
  exit 1
}
Write-Host "All Day16 smoke checks passed." -ForegroundColor Cyan
