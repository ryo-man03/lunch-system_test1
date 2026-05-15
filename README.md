# 大学弁当予約システム 🍱

大学内の弁当予約〜決済〜受取を 1 つの Web アプリで完結するローカル運用向けシステムです。
学生の注文体験と窓口業務の効率化を両立し、JSON ファイルでデータを永続化します。

- 学生: 受取日選択 → メニュー注文 → 受付番号発行 → キャンセル
- 管理者: 決済 → 注文番号発行 → 受取完了 → メニュー/店舗/在庫/統計管理
- システム: 自動バックアップ、画像最適化、エラーログ、キャンセルポリシー

## 目次

- [プロジェクト概要](#プロジェクト概要)
- [背景と狙い](#背景と狙い)
- [主要機能](#主要機能)
- [使用技術](#使用技術)
- [全体構成](#全体構成)
- [画面フローとデータフロー](#画面フローとデータフロー)
- [クイックスタート](#クイックスタート)
- [起動方法(3パターン)](#起動方法3パターン)
- [データ構造と保存先](#データ構造と保存先)
- [APIエンドポイント一覧](#apiエンドポイント一覧)
- [画面とページ構成](#画面とページ構成)
- [開発メモ](#開発メモ)
- [テストと検証](#テストと検証)
- [検証結果(プロジェクト)](#検証結果プロジェクト)
- [今後の課題](#今後の課題)
- [トラブルシューティング](#トラブルシューティング)
- [参考ドキュメント](#参考ドキュメント)
- [ライセンス](#ライセンス)

## プロジェクト概要

大学内の弁当販売を想定した統合予約システムです。学生はブラウザから注文し、窓口では決済と受取を効率的に処理できます。サーバーは単一プロセスで完結し、JSON ファイルをデータベースとして使用します。

- 目的: 注文受付〜決済〜受取の一連業務を短時間で処理
- 運用形態: ローカル PC 上での運用を想定
- データ保存: JSON 永続化 + 日次バックアップ

## 背景と狙い

学内の弁当販売は、窓口業務の混雑・注文ミス・受取時の取り違いが発生しやすい課題があります。本システムは「受付番号」「決済」「受取番号」の 3 ステップを整理し、学生と管理者双方の作業を簡素化することを狙っています。

## 主要機能

### 学生向け

- メニュー閲覧・注文（値段順/新着順/店舗別フィルター）
- 受取日選択（今日〜7日先）
- カート機能（数量変更/削除/合計金額）
- 受付番号発行・コピー・スクリーンショット促進
- クーポン適用
- キャンセル（注文後 30 分以内、未決済、受取 24 時間前まで）

### 管理者向け

- 管理者ログイン/承認
- 決済処理（現金/PayPay/LINE Pay/メルペイ/クレジット/その他）
- 受取管理（注文番号で受取完了）
- メニュー/店舗管理（画像アップロード、価格編集、有効/無効）
- 在庫管理
- ログ/統計/売上レポート

### システム機能

- JSON データ永続化と日次バックアップ
- 画像自動最適化（最大 800px）
- エラーログ保存（LocalStorage）
- キャンセルポリシーと特別日設定

## 使用技術

- Node.js (ESM)
- HTML / CSS / Vanilla JavaScript
- JSON ファイル DB（data 配下に永続化）
- テスト: Jest / Supertest / Playwright
- 運用補助: PowerShell 起動スクリプト

## 全体構成

```text
Browser (SPA) ── HTTP/JSON ── run_server_only.js ── data/database.json
```

### 主要ファイル/ディレクトリ

- [run_server_only.js](run_server_only.js): メインサーバー（HTTP + ルーティング + データ保存）
- [test_server.js](test_server.js): テスト用サーバー（8081）
- [health-check.js](health-check.js): データ整合性と健全性チェック
- [public](public/): フロントエンド (SPA)
- [data](data/): JSON データとバックアップ
- [tests](tests/): API / E2E テスト
- [起動ファイル](起動ファイル/): 起動/停止スクリプト
- [launch-scripts](launch-scripts/): 起動スクリプト整理版

## 画面フローとデータフロー

### 学生の注文フロー

1. モード選択 → 学生注文
2. 受取日選択
3. メニュー選択 → カート追加
4. 注文確定 → 受付番号 (R-XXXX) 発行
5. 窓口で受付番号を提示 → 決済
6. 注文番号 (4 桁英数字) で受取完了

### 管理者の業務フロー

1. 管理者ログイン
2. 窓口業務で受付番号検索 → 決済処理
3. 受取業務で注文番号検索 → 受取完了
4. 必要に応じてメニュー/店舗/在庫/設定を更新

### データライフサイクル

- 注文作成: `orders` と `intakes` に保存
- ステータス遷移: PENDING → PAID → PICKED
- キャンセル: 条件内なら `orders`/`intakes` をキャンセル扱い
- 永続化: 書き込みは原子操作 + リトライ付き

## クイックスタート

### 前提

- Node.js がインストール済みであること

### 手順

```powershell
npm install
node run_server_only.js
```

ブラウザで <http://localhost:8080> にアクセスします。

#### 管理者ログイン

- Email: admin@example.com
- Password: admin123

詳細は [起動ファイル/README.md](起動ファイル/README.md) と [README-STARTUP.md](README-STARTUP.md) を参照してください。

## 起動方法(3パターン)

### 1) 起動ファイル（推奨）

```powershell
.\起動ファイル\start-server.ps1
```

- ポート: 8080
- データ: [data/database.json](data/database.json)

### 2) Node 直接起動

```powershell
node run_server_only.js
```

環境変数で設定可能です。

```powershell
$env:PORT=3000
$env:TEST_MODE=true
node run_server_only.js
```

### 3) テストサーバー起動

```powershell
node test_server.js
```

- ポート: 8081
- データ: [data/test_database.json](data/test_database.json)

## データ構造と保存先

### 保存先

- 本番データ: [data/database.json](data/database.json)
- テストデータ: [data/test_database.json](data/test_database.json)
- バックアップ: [data/backups](data/backups/)

### 主要キー（抜粋）

```json
{
  "admins": [],
  "stores": [],
  "menu_items": [],
  "intakes": [],
  "orders": [],
  "logs": [],
  "counters": {},
  "system_settings": {},
  "cancel_policy": {},
  "special_days": [],
  "coupons": [],
  "inventory": {}
}
```

### 互換性

- `orderCode` を主キーとして運用
- `intakeCode` は後方互換のため保持
- 正規化スクリプトは [database_normalization.cjs](database_normalization.cjs)

## APIエンドポイント一覧

### 認証

| メソッド | パス | 概要 |
| --- | --- | --- |
| POST | /api/auth/login | ログイン |
| POST | /api/auth/logout | ログアウト |
| GET | /api/auth/session | セッション確認 |
| POST | /api/auth/register | 登録（未使用） |
| POST | /api/auth/verify | メール認証（未使用） |
| POST | /api/auth/approve/{id} | 管理者承認 |
| POST | /api/auth/reject/{id} | 管理者却下 |
| GET | /api/auth/pending | 承認待ち一覧 |

### 注文

| メソッド | パス | 概要 |
| --- | --- | --- |
| POST | /api/order | 注文作成 |
| GET | /api/order/{orderCode} | 注文検索 |
| POST | /api/order/{orderCode}/cancel | 注文キャンセル |
| PUT | /api/order/{orderCode} | 注文更新 |
| DELETE | /api/order/{orderCode} | 注文削除 |
| GET | /api/orders | 注文一覧 |
| GET | /api/orders/today | 本日の注文（未実装） |
| POST | /api/orders/search | 注文検索（未使用） |

### 決済・受取

| メソッド | パス | 概要 |
| --- | --- | --- |
| POST | /api/payment | 決済処理 |
| POST | /api/pickup/{code} | 受取完了 |

### メニュー・店舗

| メソッド | パス | 概要 |
| --- | --- | --- |
| GET | /api/menu | メニュー一覧 |
| POST | /api/menu | メニュー追加 |
| PUT | /api/menu/{id} | メニュー更新（未実装） |
| DELETE | /api/menu/{id} | メニュー削除 |
| PATCH | /api/menu/{id}/toggle | 有効/無効切替 |
| GET | /api/stores | 店舗一覧 |
| POST | /api/stores | 店舗追加 |
| PUT | /api/stores/{id} | 店舗更新 |
| DELETE | /api/stores/{id} | 店舗削除 |
| PATCH | /api/stores/{id}/toggle | 有効/無効切替 |

### 在庫

| メソッド | パス | 概要 |
| --- | --- | --- |
| GET | /api/inventory/{menuId}/{date} | 在庫照会 |
| POST | /api/inventory | 在庫設定 |
| GET | /api/inventory/list | 在庫一覧 |

### クーポン

| メソッド | パス | 概要 |
| --- | --- | --- |
| POST | /api/coupons | クーポン作成 |
| GET | /api/coupons | クーポン一覧 |
| POST | /api/coupons/validate | クーポン検証 |

### 営業時間・メッセージ

| メソッド | パス | 概要 |
| --- | --- | --- |
| GET | /api/business-hours | 営業時間取得 |
| PUT | /api/business-hours | 営業時間更新 |
| GET | /api/system-message | システムメッセージ取得 |
| PUT | /api/system-message | システムメッセージ更新 |

### ログ・統計

| メソッド | パス | 概要 |
| --- | --- | --- |
| GET | /api/logs | ログ取得 |
| GET | /api/dashboard/stats | ダッシュボード統計 |

### キャンセルポリシー・特別日

| メソッド | パス | 概要 |
| --- | --- | --- |
| GET | /api/cancel-policy | ポリシー取得 |
| PUT | /api/cancel-policy | ポリシー更新 |
| GET | /api/special-days | 特別日一覧 |
| POST | /api/special-days | 特別日追加 |
| DELETE | /api/special-days/{date} | 特別日削除 |

### レポート

| メソッド | パス | 概要 |
| --- | --- | --- |
| GET | /api/reports/sales | 売上レポート |
| GET | /api/sales/aggregate | 売上集計（未使用） |

### データ管理

| メソッド | パス | 概要 |
| --- | --- | --- |
| POST | /api/cleanup | 古いデータ削除 |

### バックアップ

| メソッド | パス | 概要 |
| --- | --- | --- |
| POST | /api/backup | バックアップ作成（未使用） |
| GET | /api/backup/list | バックアップ一覧（未使用） |
| POST | /api/backup/restore | バックアップ復元（未使用） |

### 特例処理・メモ

| メソッド | パス | 概要 |
| --- | --- | --- |
| GET | /api/special-cases | 特例一覧 |
| POST | /api/special-cases | 特例追加（未使用） |
| POST | /api/orders/{orderCode}/discount | 割引適用 |
| POST | /api/orders/{orderCode}/note | 注文メモ追加 |
| GET | /api/orders/{orderCode}/note | 注文メモ取得（未使用） |

## 画面とページ構成

- [public/index.html](public/index.html): SPA エントリーポイント（学生/管理者 UI）
- [public/debug.html](public/debug.html): デバッグ用ページ
- [public/feature-check.html](public/feature-check.html): 機能チェックリスト
- [public/test-api.html](public/test-api.html): API テスト用ページ
- [public/coupons.html](public/coupons.html): クーポン関連 UI

## 開発メモ

- `orderCode` と `intakeCode` の両対応で後方互換性を確保
- 保存処理は排他制御 + 原子書き込み + リトライで安全性を担保
- セッションはメモリ保持で永続化しない設計
- 正規化ツールは [database_normalization.cjs](database_normalization.cjs)

## テストと検証

### 自動テスト

```powershell
npm test
npm run test:api
npm run test:e2e
```

### 手動テスト/補助スクリプト

- [generate_dummy_data.ps1](generate_dummy_data.ps1): ダミーデータ生成
- [test_all_functions.ps1](test_all_functions.ps1): 機能テスト一括
- [health-check.js](health-check.js): 健全性チェック

## 検証結果(プロジェクト)

詳細は [TEST_REPORT.md](TEST_REPORT.md) を参照してください。

- 成功: 管理者ログイン、注文受付、決済処理、在庫管理、店舗追加
- 警告: クーポン作成（コード重複）、クーポン検証（期間外）
- 失敗: 本日の注文取得（GET /api/orders/today）
- 失敗: メニュー更新（PUT /api/menu/{id}）

## 今後の課題

- 本日の注文取得 API の実装
- メニュー更新 API の実装
- バックアップ API の実装/運用整理
- 店舗問い合わせ API の要否判断

## トラブルシューティング

### ポート 8080 が使用中

```powershell
.\起動ファイル\stop-server.ps1
```

### モジュールが見つからない

```powershell
npm install
```

### ログインできない

- Email/Password を再確認
- セッション切れの場合は再ログイン

### 画像が表示されない

- JPEG/PNG 形式か確認
- サイズが大きい場合は再アップロード

詳細は [OPERATION_MANUAL.md](OPERATION_MANUAL.md) を参照してください。

## 参考ドキュメント

- [SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md)
- [OPERATION_MANUAL.md](OPERATION_MANUAL.md)
- [API_METHOD_MAPPING.md](API_METHOD_MAPPING.md)
- [DATABASE_NORMALIZATION_README.md](DATABASE_NORMALIZATION_README.md)
- [IMPROVEMENTS.md](IMPROVEMENTS.md)
- [TEST_REPORT.md](TEST_REPORT.md)
- [README-STARTUP.md](README-STARTUP.md)
- [起動ファイル/README.md](起動ファイル/README.md)

## ライセンス

MIT License
