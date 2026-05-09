# すべて停止
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  弁当予約システム - すべて停止" -ForegroundColor Red
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "実行中のサーバーを検索しています..." -ForegroundColor Yellow
Write-Host ""

# Node.jsプロセスを検索
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue

if ($nodeProcesses) {
    Write-Host "以下のNode.jsプロセスが見つかりました:" -ForegroundColor Green
    $nodeProcesses | Format-Table -Property Id, ProcessName, CPU, WorkingSet -AutoSize
    Write-Host ""
    
    Write-Host "プロセスを停止中..." -ForegroundColor Yellow
    try {
        $nodeProcesses | Stop-Process -Force
        Write-Host "Node.jsサーバーを停止しました" -ForegroundColor Green
    }
    catch {
        Write-Host "停止に失敗しました: $_" -ForegroundColor Red
    }
}
else {
    Write-Host "実行中のNode.jsサーバーが見つかりませんでした" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "処理が完了しました" -ForegroundColor Green
Write-Host ""
Read-Host "Enterキーを押して終了..."
