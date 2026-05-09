# 起動ファイル

お弁当予約システムのサーバー起動・停止用のファイルです。

## 📁 ファイル一覧

### PowerShellスクリプト (.ps1)

- **start-server.ps1** - 本番サーバー起動（ポート8080）
- **start-test-server.ps1** - テストサーバー起動（ポート8081）
- **stop-server.ps1** - サーバー停止

### バッチファイル (.bat) - ダブルクリックで実行

- **start-server.bat** - 本番サーバー起動
- **start-test-server.bat** - テストサーバー起動
- **stop-server.bat** - サーバー停止

---

## 🚀 使い方

### 最も簡単な方法（推奨）

1. **start-server.bat** をダブルクリック
2. ブラウザで http://localhost:8080 にアクセス
3. 停止する場合は **stop-server.bat** をダブルクリック

### PowerShellから実行

```powershell
# このフォルダーに移動
cd C:\お弁当\lunch-system\起動ファイル

# 本番サーバー起動
.\start-server.ps1

# テストサーバー起動
.\start-test-server.ps1

# サーバー停止
.\stop-server.ps1
```

### どこからでも実行（絶対パス）

```powershell
# 本番サーバー起動
powershell.exe -ExecutionPolicy Bypass -File "C:\お弁当\lunch-system\起動ファイル\start-server.ps1"

# テストサーバー起動
powershell.exe -ExecutionPolicy Bypass -File "C:\お弁当\lunch-system\起動ファイル\start-test-server.ps1"
```

---

## 🌐 アクセスURL

- **本番サーバー**: http://localhost:8080
- **テストサーバー**: http://localhost:8081

## 🔐 管理者ログイン

- Email: `admin@example.com`
- Password: `admin123`

---

## ⚠️ トラブルシューティング

### 実行ポリシーエラーが出る場合

PowerShellで以下を実行:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### ポートが使用中の場合

```powershell
# 既存のサーバーを停止
Stop-Process -Name node -Force
```

### サーバーが起動しない場合

1. Node.jsがインストールされているか確認
2. 依存関係を再インストール:
   ```powershell
   cd C:\お弁当\lunch-system
   Remove-Item node_modules -Recurse -Force
   npm install
   ```

---

## 📖 詳細なドキュメント

詳しい使い方は `C:\お弁当\lunch-system\README-STARTUP.md` を参照してください。
