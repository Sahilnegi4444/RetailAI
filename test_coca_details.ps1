$resp = Invoke-WebRequest -Uri "http://localhost:8016/predict-paginated?page=9&page_size=100" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{"prediction_date":"2026-04-01"}' `
    -UseBasicParsing `
    -TimeoutSec 60

$j = $resp.Content | ConvertFrom-Json
$found = $j.predictions | Where-Object { $_.item_name -eq "COCA COLA 250ML" }

if ($found) {
    Write-Host "COCA COLA 250ML Details:"
    Write-Host "  Predicted: $($found.final_prediction) units"
    Write-Host "  Stock: $($found.current_stock)"
    Write-Host "  Price: $($found.price)"
    Write-Host "  Category: $($found.category)"
    Write-Host "  Trend: $($found.trend)"
    Write-Host "  Growth Rate: $($found.growth_rate)"
    
    if ($found.historical_sales) {
        Write-Host "  Historical Sales:"
        $found.historical_sales | Get-Member -MemberType NoteProperty | ForEach-Object {
            $year = $_.Name
            $months = $found.historical_sales.$year
            Write-Host "    Year $($year):"
            $months | Get-Member -MemberType NoteProperty | ForEach-Object {
                $month = $_.Name
                $sales = $months.$month
                Write-Host "      Month $($month): $($sales) units"
            }
        }
    }
}
