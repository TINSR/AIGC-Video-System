# HTTP smoke test (ASCII only) - run while API is up: http://localhost:3001/api
param(
  [string]$BaseUrl = "http://localhost:3001/api",
  [int]$TaskPollSeconds = 4
)

$results = @()

function Record-Step($name, $scriptBlock) {
  try {
    $out = & $scriptBlock
    $script:results += [pscustomobject]@{ Step = $name; Status = "OK"; Detail = ($out | Out-String).Trim() }
    Write-Host "[OK] $name" -ForegroundColor Green
  } catch {
    $script:results += [pscustomobject]@{ Step = $name; Status = "FAIL"; Detail = $_.Exception.Message }
    Write-Host "[FAIL] $name - $($_.Exception.Message)" -ForegroundColor Red
  }
}

Record-Step "health" { (Invoke-RestMethod "$BaseUrl/health").data.status }

$productBody = @{
  title          = "Smoke test product"
  category       = "test"
  sellingPoints  = @("light", "durable")
  targetAudience = "office workers"
  usageScene     = "commute"
} | ConvertTo-Json -Compress

$product = $null
Record-Step "create product" {
  $script:product = (Invoke-RestMethod -Method Post -Uri "$BaseUrl/products" -ContentType "application/json; charset=utf-8" -Body $productBody).data
  "id=$($script:product.id)"
}

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
      "task=$($script:render.id) status=$($script:render.status)"
    }
    if ($render) {
      Start-Sleep -Seconds $TaskPollSeconds
      Record-Step "get task" {
        $t = (Invoke-RestMethod "$BaseUrl/tasks/$($render.id)").data
        "status=$($t.status) progress=$($t.progress) step=$($t.currentStep) url=$($t.outputVideoUrl)"
      }
      Record-Step "list tasks" {
        $list = (Invoke-RestMethod "$BaseUrl/tasks").data
        "count=$($list.Count)"
      }
    }
  }
}

Write-Host ""
Write-Host "--- Smoke summary ---"
$results | Format-Table -AutoSize

$failed = @($results | Where-Object { $_.Status -eq "FAIL" })
if ($failed.Count -gt 0) { exit 1 }
