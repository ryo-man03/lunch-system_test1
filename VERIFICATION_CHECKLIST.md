# システム整合性検証チェックリスト

## 実行日: 2026-02-16

## 担当: Database Architecture Verification

---

## フェーズ1: データベース構造の正規化 ⚠️ CRITICAL

### 1.1 データスキーマの統一

- [ ] `orders`テーブルの全レコードで`orderCode`フィールドを必須化
- [ ] 古いレコード（R-0001～R-0003）から`orderId`と`intakeCode`フィールドを削除
- [ ] `orderedAt`フィールドを`createdAt`に統合
- [ ] すべての注文に必須フィールドが揃っているか確認:
  - `orderCode` (string, unique, R-YYMMDD-XXX形式)
  - `items` (array)
  - `pickupDate` (string, YYYY-MM-DD形式)
  - `userId` (string | null)
  - `totalAmount` (number)
  - `status` (enum: PENDING | PAID | PICKED | CANCELLED)
  - `createdAt` (ISO timestamp)
  - `paidAt` (ISO timestamp | null)
  - `pickedAt` (ISO timestamp | null)
  - `cancelledAt` (ISO timestamp | null)
  - `paymentMethod` (string | null)

### 1.2 ログデータの整合性

- [ ] `logs`配列内の`intakeCode`を`orderCode`に置換
- [ ] ログの`details.intakeCode`を`details.orderCode`に統一

### 1.3 不要なテーブル削除確認

- [ ] `intakes`配列が空であることを確認
- [ ] データベーススキーマドキュメント (database-schema.md) を更新

---

## フェーズ2: サーバーサイドAPIの完全統一 🔧 HIGH

### 2.1 エンドポイント整理

- [ ] `/api/intake` → `/api/order` に完全移行（後方互換性なし）
- [ ] `/api/intake/:code` → `/api/order/:code` に完全移行
- [ ] `/api/intake/:code/cancel` → `/api/order/:code/cancel` に完全移行
- [ ] パラメータ名 `intakeCode` → `orderCode` に統一

### 2.2 レスポンス構造の統一

- [ ] すべてのAPIレスポンスから`intake`フィールドを削除
- [ ] すべてのAPIレスポンスから`intakeCode`フィールドを削除
- [ ] `order`と`orderCode`のみを返すように統一

### 2.3 内部関数名の修正

- [ ] `generateIntakeCode()` が完全に削除されているか確認
- [ ] `generateOrderCode()` のみが使用されているか確認

---

## フェーズ3: APIクライアント層の統一 💻 HIGH

### 3.1 api.js の関数名変更

- [ ] `submitIntake()` → `submitOrder()`
- [ ] `searchIntake()` → `searchOrder()`
- [ ] `cancelIntake()` → `cancelOrder()`
- [ ] `updateIntake()` → `updateOrder()`
- [ ] `deleteIntake()` → `deleteOrder()`

### 3.2 パラメータ名の統一

- [ ] `processPayment(intakeCode, ...)` → `processPayment(orderCode, ...)`
- [ ] すべての関数で`code`パラメータが`orderCode`として扱われることを確認

### 3.3 エンドポイントパスの修正

- [ ] `/intake` → `/order`
- [ ] `/intake/${code}` → `/order/${code}`

---

## フェーズ4: フロントエンドUI層の統一 🎨 MEDIUM

### 4.1 user.js の関数名変更

- [ ] `renderIntake()` → `renderOrder()`
- [ ] `copyIntakeCode()` → `copyOrderCode()`
- [ ] `confirmCancelIntake()` → `confirmCancelOrder()`
- [ ] `searchIntakeForCancel()` → `searchOrderForCancel()`

### 4.2 変数名の統一

- [ ] すべての`intakeCode`変数を`orderCode`に変更
- [ ] すべての`intake`オブジェクトを`order`に変更

### 4.3 HTML要素IDの変更

- [ ] `#intake-code-display` → `#order-code-display`
- [ ] `#cancel-btn-${intake.intakeCode}` → `#cancel-btn-${order.orderCode}`

### 4.4 main.js の統合

- [ ] `showIntake()` → `showOrder()`
- [ ] `this.intakeCode` → `this.orderCode`
- [ ] `this.intakeData` → `this.orderData`

### 4.5 admin.js の関数名変更

- [ ] `handleSearchIntake()` → `handleSearchOrder()`
- [ ] すべての`intake`変数を`order`に変更

---

## フェーズ5: エンドツーエンドテスト 🧪 CRITICAL

### 5.1 注文フロー

- [ ] 新規注文作成 → orderCodeが正しく生成される
- [ ] 注文確認画面で正しいorderCodeが表示される
- [ ] orderCodeのコピー機能が動作する

### 5.2 決済フロー

- [ ] orderCodeで注文検索ができる
- [ ] 決済処理でステータスがPENDING→PAIDに変わる
- [ ] 決済後もorderCodeが変わらない

### 5.3 受取フロー

- [ ] PAIDステータスの注文をorderCodeで検索できる
- [ ] 受取処理でステータスがPAID→PICKEDに変わる

### 5.4 キャンセルフロー

- [ ] PENDINGステータスの注文をorderCodeでキャンセルできる
- [ ] キャンセル後、ステータスがCANCELLEDに変わる
- [ ] 在庫が正しく復元される

### 5.5 管理者機能

- [ ] ダッシュボードの統計が正しく表示される
- [ ] 注文履歴が正しく表示される（orderCodeのみ）
- [ ] ログがorderCodeで記録される

---

## フェーズ6: パフォーマンスと安全性 🔒 LOW

### 6.1 データ検証

- [ ] orderCodeの一意性制約が機能している
- [ ] orderCodeの形式検証（R-YYMMDD-XXX）が機能している
- [ ] 不正なorderCodeでのアクセスが適切にエラーを返す

### 6.2 エラーハンドリング

- [ ] 存在しないorderCodeの検索で適切なエラーメッセージ
- [ ] ネットワークエラー時の適切なフォールバック
- [ ] タイムアウト処理が機能している

---

## 完了条件

✅ すべてのチェック項目が完了
✅ `intake`という用語がコード内に一切存在しない（コメント除く）
✅ データベースに`intakes`テーブルが存在しない、または空
✅ すべてのAPIが`order`と`orderCode`のみを使用
✅ エンドツーエンドテストがすべて成功
✅ ドキュメントが更新されている

---

## 次のアクション

1. 仮想環境（テストサーバー）でフェーズ1から順番に実装
2. 各フェーズ完了後、該当機能のテストを実行
3. すべてのフェーズが完了したら、本番環境反映用のスクリプトを生成
