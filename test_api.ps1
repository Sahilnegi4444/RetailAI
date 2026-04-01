for ($page = 1; $page -le 10; $page++) {
    $resp = Invoke-WebRequest -Uri "http://localhost:8016/predict-paginated?page=$page&page_size=100" `
        -Method POST `
        -ContentType "application/json" `
        -Body '{"prediction_date":"2026-04-01"}' `
        -UseBasicParsing `
        -TimeoutSec 60
    
    $j = $resp.Content | ConvertFrom-Json
    $found = $j.predictions | Where-Object { $_.item_name -eq "COCA COLA 250ML" }
    
    if ($found) {
        Write-Host "[FOUND] Page $($page)"
        Write-Host "  Item: $($found.item_name)"
        Write-Host "  Predicted: $($found.final_prediction) units"
        Write-Host "  Stock: $($found.current_stock)"
        Write-Host "  Recommended: $($found.recommended_order)"
        break
    } else {
        Write-Host "Page $($page): Not found (items: $($j.predictions.Count))"
    }
}
