# 大学弁当予約システム - 技術レポート

**バージョン:** 1.0.0  
**作成日:** 2026年2月17日  
**技術スタック:** Node.js (ESM) + Vanilla JavaScript + JSON Database

---

## 📋 目次

1. [システム概要](#システム概要)
2. [アーキテクチャ](#アーキテクチャ)
3. [バックエンドAPI](#バックエンドapi)
4. [フロントエンド](#フロントエンド)
5. [データモデル](#データモデル)
6. [主要機能](#主要機能)
7. [データフロー](#データフロー)

---

## システム概要

### 目的

大学内の弁当予約・販売を効率化する統合管理システム。学生がオンラインで注文し、窓口で決済・受取を行う。

### 主要機能

- **学生側**: 弁当注文、注文番号取得、注文キャンセル
- **管理側**: 注文受付、決済処理、受取管理、メニュー/店舗管理、在庫管理、統計分析

### 技術的特徴

- **サーバー不要**: 単一Node.jsプロセスで完結（HTTPサーバー + JSON DB）
- **モジュール設計**: ESM形式、クラスベース設計
- **後方互換性**: 旧API（intakeCode）と新API（orderCode）の両対応
- **自動バックアップ**: 日次バックアップ（30日保持）

---

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                     クライアント (Browser)                   │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │ main.js  │ auth.js  │ admin.js │  user.js │  api.js  │  │
│  │ (Router) │  (認証)  │ (管理UI) │ (注文UI) │ (API層)  │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP/JSON
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                   run_server_only.js                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  HTTPサーバー + ルーティング + ビジネスロジック        │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  dataStore (In-Memory) + database.json (Persistent)   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### ファイル構成

```
lunch-system/
├── run_server_only.js       # バックエンド（サーバー + ビジネスロジック）
├── data/
│   ├── database.json         # メインデータベース
│   └── backups/              # 日次バックアップ
├── public/
│   ├── index.html            # エントリーポイント
│   ├── js/
│   │   ├── main.js           # アプリケーションルーター
│   │   ├── api.js            # API通信層
│   │   ├── auth.js           # 認証UI
│   │   ├── admin.js          # 管理者UI（4000行超）
│   │   ├── user.js           # ユーザーUI（840行）
│   │   └── error-handler.js # エラーハンドリング
│   └── css/style.css         # スタイル
└── 起動ファイル/
    ├── start-server.ps1      # 本番起動
    └── start-test-server.ps1 # テスト起動
```

---

## バックエンドAPI

### 認証API

```
POST /api/auth/login              # ログイン
POST /api/auth/logout             # ログアウト
GET  /api/auth/session            # セッション確認
POST /api/admin/approve/{id}      # 管理者承認
```

### 注文API（統合版）

```
POST   /api/order                     # 注文作成 → orderCode返却
GET    /api/order/{orderCode}         # 注文検索
POST   /api/order/{orderCode}/cancel  # キャンセル
PUT    /api/order/{orderCode}         # 編集（管理者）
DELETE /api/order/{orderCode}         # 削除（管理者）
GET    /api/orders                    # 全注文取得
GET    /api/orders/today              # 本日の注文
```

### 決済・受取API

```
POST /api/payment         # 決済処理（PENDING → PAID）
POST /api/pickup/{code}   # 受取完了（PAID → PICKED）
```

### メニュー・店舗API

```
GET    /api/menu                  # メニュー一覧
POST   /api/menu                  # メニュー追加
PUT    /api/menu/{id}             # メニュー更新
DELETE /api/menu/{id}             # メニュー削除
PATCH  /api/menu/{id}/toggle      # 有効/無効切替

GET    /api/stores                # 店舗一覧
POST   /api/stores                # 店舗追加
PUT    /api/stores/{id}           # 店舗更新
DELETE /api/stores/{id}           # 店舗削除
```

### 在庫管理API

```
GET  /api/inventory/{menuId}/{date}  # 在庫照会
POST /api/inventory                  # 在庫設定
GET  /api/inventory/list             # 在庫一覧
```

### クーポンAPI

```
POST /api/coupons              # クーポン作成（管理者）
GET  /api/coupons              # クーポン一覧（管理者）
POST /api/coupons/validate     # クーポン適用検証
```

### ユーティリティAPI

```
GET /api/business-hours        # 営業時間取得
GET /api/system-message        # システムメッセージ
GET /api/logs                  # ログ取得
GET /api/dashboard/stats       # ダッシュボード統計
```

---

## フロントエンド

### main.js - アプリケーションルーター（1118行）

**役割**: 画面遷移の制御とビュー管理

**主要クラス**: `LunchApp`

**主要メソッド**:

- `init()` - アプリ初期化、セッションチェック
- `render(html)` - 画面描画
- `renderCurrentView()` - 現在のビューをレンダリング
- `showModeSelect()` - モード選択画面
- `showLogin()` - ログイン画面
- `showDashboard()` - ダッシュボード
- `showUserHome()` - 学生注文画面

**ビュー一覧**:

```javascript
"mode-select"; // モード選択
"login"; // ログイン
"dashboard"; // ダッシュボード
"counter"; // 窓口受付
"pickup"; // 受取管理
"user-home"; // 学生注文
"cancel-search"; // キャンセル検索
"all-orders"; // 全注文一覧
"order-search"; // 注文検索
```

---

### api.js - API通信層（419行）

**役割**: バックエンドAPIとの通信を抽象化

**主要クラス**: `ApiClient`

**特徴**:

- タイムアウト処理（デフォルト30秒）
- エラーログ自動保存（LocalStorage、最新100件）
- パフォーマンス計測
- 後方互換性（submitOrder/submitIntake両対応）

**主要メソッド**:

```javascript
// 認証
login(email, password);
logout();
checkSession();

// 注文（推奨API）
submitOrder(cart, pickupDate); // 注文作成
searchOrder(code); // 注文検索
cancelOrder(orderCode); // キャンセル

// 決済・受取
processPayment(orderCode, method);
completePickup(code);

// マスタ取得
getStores();
getMenu();
getBusinessHours();

// 管理機能
addMenu(data);
updateMenu(id, data);
deleteMenu(id);
```

---

### auth.js - 認証UI（300行）

**役割**: ログイン・登録画面の描画と処理

**主要クラス**: `AuthUI`

**主要メソッド**:

- `renderLogin()` - ログイン画面HTML生成
- `renderRegistration()` - 登録画面HTML生成
- `renderVerification(email, code)` - 認証コード画面
- `handleLogin()` - ログイン処理
- `handleRegister()` - 登録処理
- `handleVerify()` - 認証コード確認

**特徴**:

- デモ用初期値自動入力（admin@example.com / admin123）
- Enterキー対応

---

### user.js - ユーザーUI（840行）

**役割**: 学生向け注文画面

**主要クラス**: `UserUI`

**主要メソッド**:

#### 画面描画

```javascript
renderHome(); // ホーム画面（メニュー一覧）
renderOrder(orderCode, order); // 注文完了画面
renderCancelSearch(); // キャンセル検索画面
renderUserBottomNav(view); // ボトムナビゲーション
```

#### ビジネスロジック

```javascript
updateSelectedDate(date); // 受取日選択
updateFilter(sortType); // ソート変更
addToCart(menuId, name, price, storeId); // カート追加
removeFromCart(index); // カート削除
submitOrder(); // 注文送信
applyCoupon(); // クーポン適用
searchOrderForCancel(code); // 注文検索
confirmCancelOrder(orderCode); // キャンセル実行
```

**カート管理**:

```javascript
this.cart = [{ menuId, name, price, storeId, quantity }];
```

**フィルター・ソート機能**:

- `none` - デフォルト順
- `price-low` - 価格昇順
- `price-high` - 価格降順
- `new` - 新着順
- `store` - 店舗ごと

---

### admin.js - 管理者UI（4000行超）

**役割**: 管理者向け全機能

**主要クラス**: `AdminUI`

#### ダッシュボード・統計

```javascript
renderDashboard(); // ダッシュボード
renderDailySummary(); // 日次サマリー
renderAnalytics(); // 統計分析
```

#### 注文管理

```javascript
renderCounter(); // 窓口受付
renderPickup(); // 受取管理
renderOrderSearch(); // 注文検索
renderOrdersByStore(); // 店舗別注文一覧
renderAllOrders(); // 全注文一覧
renderPastOrderHistory(); // 過去の注文履歴

handleSearchOrder(); // 注文検索処理
handlePayment(orderCode); // 決済処理
processPaymentWithMethod(orderCode, method); // 決済実行
handlePickup(orderCode); // 受取処理
```

#### マスタ管理

```javascript
renderMenuManagement(); // メニュー管理
renderStoreManagement(); // 店舗管理
renderAdvancedSettings(); // 詳細設定
```

#### その他

```javascript
renderLogs(); // ログ表示
renderQRCodeGenerator(); // QRコード生成
renderBulkOperations(); // 一括操作
```

**特徴**:

- グループ折りたたみ機能（LocalStorage保存）
- トーストメッセージ
- ローディングオーバーレイ
- 最近使った機能の履歴
- キーボードショートカット（Ctrl+K: 検索、Esc: ダッシュボード）

---

### error-handler.js - エラーハンドリング（127行）

**役割**: グローバルエラーキャッチ

**機能**:

- `uncaughtException` 捕捉
- `unhandledRejection` 捕捉
- エラーログ保存（LocalStorage）
- 開発モードでエラー通知表示

---

## データモデル

### database.json構造

```javascript
{
  // 管理者
  "admins": [
    {
      "id": 1,
      "email": "admin@example.com",
      "password": "SHA256ハッシュ",
      "name": "管理者",
      "approved": true,
      "registeredAt": "ISO8601"
    }
  ],

  // 店舗
  "stores": [
    {
      "id": "S001",
      "name": "○○弁当",
      "active": true,
      "contactPhone": "080-1234-5678",
      "address": "住所",
      "businessHours": "10:00-20:00",
      "description": "説明",
      "image": "/images/store1.jpg"
    }
  ],

  // メニュー
  "menu_items": [
    {
      "id": "M001",
      "storeId": "S001",
      "name": "唐揚げ弁当",
      "price": 650,
      "originalPrice": null,
      "active": true,
      "description": "説明",
      "image": "/images/karaage.jpg",
      "category": "和食",
      "allergens": ["卵", "小麦", "大豆"],
      "unavailableDates": [],
      "unavailableDateRanges": [],
      "unavailableWeekdays": [],
      "unavailableTimeRanges": [],
      "closedMessage": null
    }
  ],

  // 注文
  "orders": [
    {
      "orderCode": "R-260216-Wzq",  // 新形式: R-YYMMDD-XXX
      "items": [
        {
          "menuId": "M001",
          "name": "唐揚げ弁当",
          "quantity": 2,
          "price": 650,
          "storeId": "S001"
        }
      ],
      "pickupDate": "2026-02-17",
      "userId": null,
      "totalAmount": 1300,
      "status": "PENDING",  // PENDING/PAID/PICKED/CANCELLED
      "createdAt": "2026-02-16T10:00:00.000Z",
      "paidAt": null,
      "pickedAt": null,
      "paymentMethod": null,  // cash/paypay/linepay/credit
      "cancelledAt": null
    }
  ],

  // 在庫
  "inventory": {
    "M001": {
      "2026-02-17": {
        "total": 100,
        "available": 85,
        "reserved": 15
      }
    }
  },

  // クーポン
  "coupons": [
    {
      "id": "COUPON-001",
      "code": "WELCOME10",
      "type": "percentage",  // percentage/fixed
      "value": 10,
      "description": "初回限定10%OFF",
      "validFrom": "2026-01-01",
      "validUntil": "2026-12-31",
      "maxUses": 100,
      "usedCount": 5,
      "active": true,
      "createdAt": "ISO8601"
    }
  ],

  // ログ
  "logs": [
    {
      "id": 1,
      "type": "order",
      "action": "create",
      "details": { "orderCode": "R-260216-Wzq" },
      "adminEmail": null,
      "timestamp": "ISO8601"
    }
  ],

  // セッション（揮発性、保存されない）
  "sessions": {
    "sessionId": "admin@example.com"
  }
}
```

---

## 主要機能

### 1. 注文フロー

```
[学生] メニュー選択 → カート追加 → 注文確定
           ↓
    注文番号取得（R-260216-Wzq）
           ↓
[窓口] 注文番号入力 → 決済処理 → PENDING → PAID
           ↓
[受取] 注文番号確認 → 受取完了 → PAID → PICKED
```

**ステータス遷移**:

```
PENDING → PAID → PICKED
   ↓
CANCELLED（30分以内 or 受取24時間前まで）
```

### 2. 在庫管理

- 注文時に在庫を`reserved`に移動、`available`を減算
- キャンセル時に在庫を復元
- メニュー×日付ごとに管理

### 3. クーポン機能

**適用条件**:

- 有効期間内
- 使用回数が上限未満
- 最低注文金額を満たす

**割引計算**:

```javascript
// パーセント割引
discount = Math.floor((amount * value) / 100);

// 固定額割引
discount = value;

finalAmount = Math.max(0, amount - discount);
```

### 4. セキュリティ

- **パスワードハッシュ化**: SHA256
- **セッション管理**: Cookie + サーバー側セッションストア
- **認証チェック**: 管理者API全てで認証必須
- **CORS対応**: Access-Control-Allow-Origin: \*

---

## データフロー

### 注文作成フロー

```
[ブラウザ]
user.js: submitOrder()
  ↓
api.js: submitOrder(cart, pickupDate)
  ↓ POST /api/order
[サーバー]
run_server_only.js
  ↓ 在庫チェック
  ↓ orderCode生成（R-YYMMDD-XXX）
  ↓ 在庫減算
  ↓ ordersに追加
  ↓ saveData() → database.json書き込み
  ↓ ログ記録
  ↓ レスポンス: { success: true, orderCode, order }
[ブラウザ]
  ↓ 注文完了画面表示
user.js: renderOrder(orderCode, order)
```

### 決済処理フロー

```
[ブラウザ]
admin.js: processPaymentWithMethod(orderCode, 'cash')
  ↓
api.js: processPayment(orderCode, 'cash')
  ↓ POST /api/payment
[サーバー]
  ↓ 注文検索
  ↓ ステータス確認（PENDING?）
  ↓ PENDING → PAID
  ↓ paidAt設定
  ↓ paymentMethod設定
  ↓ saveData()
  ↓ ログ記録
  ↓ レスポンス: { success: true, orderCode, order }
[ブラウザ]
  ↓ 決済完了画面表示（QRコード付き）
```

---

## ビジネスルール

### キャンセルポリシー

```javascript
{
  "enabled": true,
  "timeLimit": 30,           // 注文後30分以内
  "beforePickupHours": 24    // 受取24時間前まで
}
```

### 営業日

```javascript
{
  "businessDays": ["mon", "tue", "wed", "thu", "fri"],
  "pickup": { "start": "11:30", "end": "13:30" }
}
```

### 注文番号形式

```
R-YYMMDD-XXX
例: R-260216-Wzq

- R: 固定プレフィックス
- YYMMDD: 年月日
- XXX: ランダム英字3文字（大文字小文字混在）
```

---

## 関数リファレンス

### run_server_only.js主要関数

```javascript
// データ管理
initDataStore(); // データ初期化
saveData(); // データ保存
createDailyBackup(data); // 日次バックアップ
cleanOldBackups(dir); // 古いバックアップ削除

// ユーティリティ
addLog(type, action, details, email); // ログ追加
checkSession(req); // セッション確認
parseCookies(header); // Cookie解析
parseBody(req); // リクエストボディ解析
sendJSON(res, data, code); // JSONレスポンス送信

// APIハンドラ
handleAPI(req, res, pathname, body); // APIルーティング

// 静的ファイル
serveStaticFile(res, path); // 静的ファイル配信
```

### main.js（LunchApp）主要メソッド

```javascript
init(); // アプリ初期化
render(html); // 画面描画
renderCurrentView(); // 現在ビュー描画
showModeSelect(); // モード選択
showLogin(); // ログイン
showDashboard(); // ダッシュボード
showUserHome(); // 学生ホーム
showCancelSearch(); // キャンセル検索
```

---

## インストール・起動

### 前提条件

- Node.js 18以上
- PowerShell 5.1以上（Windows）

### 起動方法

**本番サーバー起動**:

```powershell
cd 起動ファイル
.\start-server.ps1
# または
cd lunch-system
node run_server_only.js
```

**テストサーバー起動**:

```powershell
cd 起動ファイル
.\start-test-server.ps1
# ポート8081、test_database.json使用
```

**アクセス**:

```
http://localhost:8080
```

**デフォルト管理者**:

```
Email: admin@example.com
Password: admin123
```

---

## まとめ

このシステムは、シンプルなアーキテクチャで大学の弁当予約業務を効率化する統合管理システムです。

**技術的強み**:

- 単一プロセスで完結するシンプル構成
- JSONファイルベースで外部DB不要
- モジュール化された保守しやすいコード
- 後方互換性を保ちながらの段階的更新

**ビジネス的強み**:

- リアルタイム在庫管理
- 柔軟なクーポンシステム
- 詳細な統計・分析機能
- QRコード対応の効率的な受取フロー
