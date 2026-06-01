# Day11 smoke: upload material, set primary, workspace summary
$ErrorActionPreference = "Stop"
$Base = "http://localhost:3001/api"
$Img = $env:DAY11_TEST_IMAGE
if (-not $Img) {
  Write-Host "[SKIP] set DAY11_TEST_IMAGE to a local image path"
  exit 1
}
if (-not (Test-Path -LiteralPath $Img)) {
  Write-Host "[SKIP] image not found: $Img (set DAY11_TEST_IMAGE)"
  exit 1
}

function Ok($label) { Write-Host "[OK] $label" -ForegroundColor Green }
function Fail($label, $detail) {
  Write-Host "[FAIL] $label - $detail" -ForegroundColor Red
  exit 1
}

try {
  $h = Invoke-RestMethod "$Base/health" -TimeoutSec 5
  if ($h.data.status -ne "ok") { Fail "health" ($h | ConvertTo-Json -Compress) }
  Ok "health"
} catch {
  Fail "health" $_.Exception.Message
}

try {
  $body = @{
    title = "Day11 smoke product"
    category = "test"
    sellingPoints = @("light")
    targetAudience = "office"
    usageScene = "commute"
  } | ConvertTo-Json
  $p = Invoke-RestMethod -Method Post -Uri "$Base/products" -ContentType "application/json" -Body $body
  $productId = $p.data.id
  Ok "create product id=$productId"
} catch {
  Fail "create product" $_.Exception.Message
}

try {
  $uploadJson = curl.exe -s -X POST "$Base/products/$productId/materials" -F "file=@$Img" -F "title=day11-smoke" -F "tags=test"
  $upload = $uploadJson | ConvertFrom-Json
  if (-not $upload.success) { Fail "upload" $uploadJson }
  $materialId = $upload.data.id
  if ($upload.data.cloudStatus -ne "local_only") {
    Write-Host "[INFO] cloudStatus=$($upload.data.cloudStatus) publicUrl=$($upload.data.publicUrl)"
  }
  Ok "upload material id=$materialId cloudStatus=$($upload.data.cloudStatus)"
} catch {
  Fail "upload" $_.Exception.Message
}

try {
  $primaryJson = curl.exe -s -X PUT "$Base/products/$productId/materials/$materialId/primary"
  $primary = $primaryJson | ConvertFrom-Json
  if (-not $primary.success) { Fail "set primary" $primaryJson }
  $confirmed = $primary.data | Where-Object { $_.id -eq $materialId -and $_.isPrimary }
  if (-not $confirmed) { Fail "set primary" "isPrimary not set on material" }
  Ok "set primary"
} catch {
  Fail "set primary" $_.Exception.Message
}

try {
  $ws = Invoke-RestMethod "$Base/workspace/tasks"
  $row = $ws.data | Where-Object { $_.product.id -eq $productId } | Select-Object -First 1
  if (-not $row) { Fail "workspace" "product not in list" }
  if ($row.materialsSummary.primaryMaterialId -ne $materialId) {
    Fail "workspace" "primaryMaterialId mismatch"
  }
  Ok "workspace materialsSummary.primaryMaterialId=$($row.materialsSummary.primaryMaterialId)"
} catch {
  Fail "workspace" $_.Exception.Message
}

Write-Host ""
Write-Host "--- Day11 smoke passed ---" -ForegroundColor Cyan
