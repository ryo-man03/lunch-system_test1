# 🚀 起動ガイド

## 🎯 簡単な起動方法（推奨）

### エクスプローラーからダブルクリック

1. エクスプローラーで `C:\お弁当\lunch-system\起動ファイル` を開く
2. 起動したいファイルをダブルクリック:
   - `start-server.bat` - 本番サーバー起動
   - `start-test-server.bat` - テストサーバー起動
   - `stop-server.bat` - サーバー停止

### PowerShellから実行（絶対パス）

どこからでも実行可能:

```powershell
# 本番サーバー起動
powershell.exe -ExecutionPolicy Bypass -File "C:\お弁当\lunch-system\起動ファイル\start-server.ps1"

# テストサーバー起動
powershell.exe -ExecutionPolicy Bypass -File "C:\お弁当\lunch-system\起動ファイル\start-test-server.ps1"

# サーバー停止
powershell.exe -ExecutionPolicy Bypass -Command "Stop-Process -Name node -Force"
```

---

## 📝 PowerShellで実行する方法（従来）

### 1. 通常起動（本番サーバー）

```powershell
cd C:\お弁当\lunch-system\起動ファイル
.\start-server.ps1
```

- ポート: 8080
- データベース: `data/database.json`
- URL: http://localhost:8080

### 2. テストサーバー起動

```powershell
cd C:\お弁当\lunch-system\起動ファイル
.\start-test-server.ps1
```

- ポート: 8081
- データベース: `data/test_database.json`
- URL: http://localhost:8081

### 3. サーバー停止

```powershell
cd C:\お弁当\lunch-system\起動ファイル
.\stop-server.ps1
```

すべてのNode.jsプロセスを停止します。

---

## 📝 使用例

### 本番サーバーを起動

```powershell
# 方法1: スクリプトを直接実行
cd C:\お弁当\lunch-system\起動ファイル
.\start-server.ps1

# 方法2: フルパス指定
& "C:\お弁当\lunch-system\起動ファイル\start-server.ps1"

# 方法3: PowerShellコマンド
Set-Location "C:\お弁当\lunch-system\起動ファイル"; .\start-server.ps1
```

### テストサーバーを起動して開発

```powershell
# ターミナル1: テストサーバー起動
cd C:\お弁当\lunch-system\起動ファイル
.\start-test-server.ps1

# ターミナル2: ダミーデータ生成
cd C:\お弁当\lunch-system
.\generate_dummy_data.ps1 -UserCount 15 -OrderCount 30

# ターミナル3: 機能テスト実行
cd C:\お弁当\lunch-system
.\test_all_functions.ps1
```

---

## ⚠️ トラブルシューティング

### 実行ポリシーエラーが出る場合

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### ポートが使用中の場合

```powershell
# 既存のサーバーを停止
.\stop-server.ps1

# またはコマンドで強制停止
Stop-Process -Name node -Force
```

### Node.jsが見つからない場合

1. Node.jsをインストール: https://nodejs.org/
2. インストール後、PowerShellを再起動

### 依存関係のエラー

```powershell
# node_modulesを削除して再インストール
Remove-Item -Path node_modules -Recurse -Force
npm install
```

---

## 📂 ファイル構成

```
lunch-system/
  ├── 起動ファイル/
  │   ├── start-server.ps1          # 本番サーバー起動
  │   ├── start-server.bat          # 本番サーバー起動（ダブルクリック）
  │   ├── start-test-server.ps1     # テストサーバー起動
  │   ├── start-test-server.bat     # テストサーバー起動（ダブルクリック）
  │   ├── stop-server.ps1            # サーバー停止
  │   └── stop-server.bat            # サーバー停止（ダブルクリック）
  ├── generate_dummy_data.ps1   # ダミーデータ生成
  ├── test_all_functions.ps1    # 機能テスト
  └── run_server_only.js        # メインサーバー
```

---

## 🔧 環境設定

### ポート番号の変更

#### start-server.ps1 を編集してデフォルトポートを変更:

```powershell
# ファイル末尾に追加
$env:PORT = "3000"  # 好きなポート番号
node run_server_only.js
```

#### 一時的にポートを変更:

```powershell
$env:PORT=3000; node run_server_only.js
```

---

## ✅ 動作確認

サーバーが起動したら、ブラウザで以下にアクセス:

- 本番: http://localhost:8080
- テスト: http://localhost:8081

管理者ログイン:

- Email: admin@example.com
- Password: admin123
