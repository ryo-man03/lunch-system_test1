# 弁当予約システム - メイン起動スクリプト
$ErrorActionPreference = "Stop"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  弁当予約システム - 起動" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# 親ディレクトリに移動
try {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $rootDir = Split-Path -Parent $scriptDir
    Set-Location $rootDir
    Write-Host "作業ディレクトリ: $rootDir" -ForegroundColor Green
}
catch {
    Write-Host "エラー: ディレクトリの移動に失敗しました" -ForegroundColor Red
    Read-Host "Enterキーを押して終了..."
    exit 1
}

Write-Host ""

# 環境チェック
Write-Host "環境チェック中..." -ForegroundColor Cyan
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "エラー: Node.jsが見つかりません" -ForegroundColor Red
    Write-Host "Node.jsをインストールしてください: https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Enterキーを押して終了..."
    exit 1
}

$nodeVersion = node --version
Write-Host "Node.js バージョン: $nodeVersion" -ForegroundColor Green
Write-Host ""

# 依存関係のチェック
if (-not (Test-Path "node_modules")) {
    Write-Host "依存関係が見つかりません。インストールを開始します..." -ForegroundColor Yellow
    Write-Host ""
    try {
        npm install
        Write-Host ""
        Write-Host "依存関係のインストール完了" -ForegroundColor Green
        Write-Host ""
    }
    catch {
        Write-Host "エラー: npm install に失敗しました: $_" -ForegroundColor Red
        Read-Host "Enterキーを押して終了..."
        exit 1
    }
}
else {
    Write-Host "依存関係は既にインストール済みです" -ForegroundColor Green
    Write-Host ""
}

# dataディレクトリの作成
if (-not (Test-Path "data")) {
    New-Item -ItemType Directory -Path "data" -Force | Out-Null
    Write-Host "dataディレクトリを作成しました" -ForegroundColor Green
    Write-Host ""
}

# 起動確認
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "起動設定" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ポート: 8080" -ForegroundColor White
Write-Host "  URL: http://localhost:8080" -ForegroundColor White
Write-Host "  データベース: data\database.json" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$confirm = Read-Host "サーバーを起動しますか？ (Y/N)"
if ($confirm -ne "Y" -and $confirm -ne "y") {
    Write-Host ""
    Write-Host "起動をキャンセルしました" -ForegroundColor Yellow
    Read-Host "Enterキーを押して終了..."
    exit 0
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "サーバーを起動しています..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "停止するには Ctrl+C を押してください" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

try {
    node run_server_only.js
}
catch {
    Write-Host ""
    Write-Host "サーバーの起動に失敗しました: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "[トラブルシューティング]" -ForegroundColor Yellow
    Write-Host "1. ポート8080が既に使用されていないか確認してください" -ForegroundColor White
    Write-Host "2. node_modulesフォルダを削除して npm install を再実行してください" -ForegroundColor White
    Write-Host "3. Node.jsを再インストールしてください" -ForegroundColor White
    Write-Host ""
    Read-Host "Enterキーを押して終了..."
    exit 1
}
