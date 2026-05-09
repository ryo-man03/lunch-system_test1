# 🍱 起動ファイルガイド

## 📁 利用可能なスクリプト

### PowerShellスクリプト

#### 1. quick-start.ps1（推奨）

```powershell
.\launch-scripts\quick-start.ps1
```

- **用途**: 日常的な起動に最適
- **特徴**:
  - 確認なしで即座に起動
  - 自動で依存関係をインストール
  - Node.jsとファイルの存在チェック
  - Ctrl+Cで停止

#### 2. start.ps1（確認あり）

```powershell
.\launch-scripts\start.ps1
```

- **用途**: 慎重に起動したい場合
- **特徴**: 起動前に確認プロンプト表示

#### 3. stop-all.ps1

```powershell
.\launch-scripts\stop-all.ps1
```

- **用途**: すべてのサーバーを停止
- **特徴**:
  - 実行中のNode.js/Pythonプロセスを検索
  - 確認後に停止
  - 強制終了機能

---

## ⚡ 便利な使い方

### 方法1: ルートディレクトリから起動

```powershell
# 簡単起動（推奨）
.\簡単起動.ps1

# 確認付き起動
.\起動.ps1
```

### 方法2: ダブルクリック起動

1. エクスプローラーで `クイック起動.ps1` を探す
2. 右クリック → 「PowerShellで実行」

### 方法3: ショートカット作成

1. デスクトップにショートカット作成
2. ターゲットを以下に設定:
   ```
   powershell.exe -ExecutionPolicy Bypass -File "c:\お弁当\lunch-system\起動ファイル\クイック起動.ps1"
   ```

---

## 🔧 トラブルシューティング

### 実行ポリシーエラー

PowerShellで以下を実行:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### ポート8080が使用中

```powershell
# 使用中のプロセスを確認
netstat -ano | findstr :8080

# すべて停止
.\起動ファイル\すべて停止.ps1
```

### Node.jsが見つからない

1. Node.jsをインストール: https://nodejs.org/
2. PowerShellを再起動
3. `node --version` で確認

---

## 📊 ファイル構成

### 現在のファイル

- ✅ **クイック起動.ps1** - メイン起動スクリプト（最もシンプル・推奨）
- ✅ **簡単起動.ps1** - 確認なし起動
- ✅ **起動.ps1** - 確認あり起動
- ✅ **すべて停止.ps1** - 停止スクリプト
- ✅ **README.md** - このガイド

### 削除されたファイル（整理済み）

- ❌ バッチファイル（.bat）- PowerShellに統一
- ❌ 重複したPowerShellスクリプト - 機能統合
- ❌ 重複したドキュメント - このREADMEに統合

---

## 💡 推奨する起動フロー

1. **日常使用**

   ```powershell
   .\簡単起動.ps1
   ```

   または

   ```powershell
   .\起動ファイル\クイック起動.ps1
   ```

2. **停止**

   ```
   Ctrl+C
   ```

3. **問題発生時**
   ```powershell
   .\起動ファイル\すべて停止.ps1
   ```
   その後、再起動

---

## 📝 注意事項

- **PowerShellスクリプトに統一**: バッチファイルは削除されました
- **シンプル化**: 重複機能を削除し、必要最小限に
- **自動化**: 依存関係のインストールは自動実行
- **エラーハンドリング**: エラー時は詳細なメッセージを表示

を実行してから再度起動してください

### ポート使用中エラー

すべて停止.bat を実行してから再度起動してください

## 📝 システム情報

- ポート: 8080
- データベース: ../data/database.json
- 管理画面: http://localhost:8080/admin.html
