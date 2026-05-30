# Day 6 HTTP smoke test — run while API is up (default http://localhost:3001/api)
param(
  [string]$BaseUrl = "http://localhost:3001/api"
)

$results = @()

function Record-Step($name, $script) {
  try {
    $out = & $script
    $script:results += [pscustomobject]@{ Step = $name; Status = "OK"; Detail = ($out | Out-String).Trim() }
    Write-Host "[OK] $name" -ForegroundColor Green
  } catch {
    $script:results += [pscustomobject]@{ Step = $name; Status = "FAIL"; Detail = $_.Exception.Message }
    Write-Host "[FAIL] $name — $($_.Exception.Message)" -ForegroundColor Red
  }
}

Record-Step "health" { (Invoke-RestMethod "$BaseUrl/health").data.status }

$productBody = @{
  title = "Day6 测试商品"
  category = "测试"
  sellingPoints = @("轻便", "耐用")
  targetAudience = "上班族"
  usageScene = "通勤"
} | ConvertTo-Json

$product = $null
Record-Step "create product" { $script:product = (Invoke-RestMethod -Method Post -Uri "$BaseUrl/products" -ContentType "application/json" -Body $productBody).data; "id=$($script:product.id)" }

if ($product) {
  Record-Step "get product" { (Invoke-RestMethod "$BaseUrl/products/$($product.id)").data.title }

  $gen = $null
  Record-Step "generate plan" {
    $script:gen = (Invoke-RestMethod -Method Post -Uri "$BaseUrl/products/$($product.id)/creative-plans/generate" -ContentType "application/json" -Body '{"style":"pain_point"}').data
    "planId=$($script:gen.id)"
  }

  if ($gen) {
    Record-Step "get plan" { (Invoke-RestMethod "$BaseUrl/creative-plans/$($gen.id)").data.status }
    Record-Step "approve" { (Invoke-RestMethod -Method Post -Uri "$BaseUrl/creative-plans/$($gen.id)/approve").data.status }
    $render = $null
    Record-Step "render" {
      $script:render = (Invoke-RestMethod -Method Post -Uri "$BaseUrl/creative-plans/$($gen.id)/render").data
      "task=$($script:render.id) $($script:render.status)"
    }
    if ($render) {
      Start-Sleep -Seconds 4
      Record-Step "get task" {
        $t = (Invoke-RestMethod "$BaseUrl/tasks/$($render.id)").data
        "status=$($t.status) progress=$($t.progress) url=$($t.outputVideoUrl)"
      }
    }
  }
}

Write-Host "`n--- Smoke summary ---"
$results | Format-Table -AutoSize
