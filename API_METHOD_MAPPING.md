# ApiClient メソッド完全マッピングレポート

**作成日**: 2026年2月17日  
**分析対象**: `c:\お弁当\lunch-system\public\js\api.js`  
**バージョン**: 統合版（order/intake両対応）

---

## 📋 目次

1. [ApiClientクラス全メソッドリスト](#apiクライアントクラス全メソッドリスト)
2. [後方互換性の確認](#後方互換性の確認)
3. [未使用メソッドの分析](#未使用メソッドの分析)
4. [実装されていない参照メソッド](#実装されていない参照メソッド)

---

## 🔧 ApiClientクラス全メソッドリスト

### 🔐 認証API

| メソッド名                        | HTTPメソッド | エンドポイント                | パラメータ                                        | 戻り値                   | 使用状況                   |
| --------------------------------- | ------------ | ----------------------------- | ------------------------------------------------- | ------------------------ | -------------------------- |
| `login(email, password)`          | POST         | `/api/auth/login`             | email: string<br>password: string                 | {success, token?, user?} | ✅ 使用中 (main.js)        |
| `logout()`                        | POST         | `/api/auth/logout`            | なし                                              | {success}                | ✅ 使用中 (main.js)        |
| `checkSession()`                  | GET          | `/api/auth/session`           | なし                                              | {success, user?}         | ✅ 使用中 (main.js)        |
| `register(name, email, password)` | POST         | `/api/auth/register`          | name: string<br>email: string<br>password: string | {success, message}       | ⚠️ 未使用                  |
| `verifyEmail(email, code)`        | POST         | `/api/auth/verify`            | email: string<br>code: string                     | {success}                | ⚠️ 未使用                  |
| `approveAdmin(adminId)`           | POST         | `/api/auth/approve/{adminId}` | adminId: string                                   | {success}                | ✅ 使用中 (admin.js: 1208) |
| `rejectAdmin(adminId)`            | POST         | `/api/auth/reject/{adminId}`  | adminId: string                                   | {success}                | ✅ 使用中 (admin.js: 1229) |
| `getPendingAdmins()`              | GET          | `/api/auth/pending`           | なし                                              | {success, admins: []}    | ✅ 使用中 (admin.js: 354)  |

---

### 📊 データ取得API

| メソッド名           | HTTPメソッド | エンドポイント        | パラメータ | 戻り値                | 使用状況                      |
| -------------------- | ------------ | --------------------- | ---------- | --------------------- | ----------------------------- |
| `getStores()`        | GET          | `/api/stores`         | なし       | {success, stores: []} | ✅ 頻繁に使用中               |
| `getMenu()`          | GET          | `/api/menu`           | なし       | {success, items: []}  | ✅ 頻繁に使用中               |
| `getBusinessHours()` | GET          | `/api/business-hours` | なし       | {success, hours: {}}  | ✅ 使用中 (user.js, admin.js) |

---

### 🛒 注文API（新・推奨版 - orderCode使用）

| メソッド名                           | HTTPメソッド | エンドポイント                  | パラメータ                                             | 戻り値                      | 使用状況                  |
| ------------------------------------ | ------------ | ------------------------------- | ------------------------------------------------------ | --------------------------- | ------------------------- |
| `submitOrder(cart, pickupDate)`      | POST         | `/api/order`                    | cart: array<br>pickupDate: string                      | {success, orderCode, order} | ✅ 使用中 (user.js: 548)  |
| `searchOrder(code)`                  | GET          | `/api/order/{code}`             | code: string                                           | {success, order: {}}        | ✅ 頻繁に使用中           |
| `cancelOrder(orderCode)`             | POST         | `/api/order/{orderCode}/cancel` | orderCode: string                                      | {success}                   | ✅ 使用中 (user.js: 758)  |
| `updateOrder(orderCode, updateData)` | PUT          | `/api/order/{orderCode}`        | orderCode: string<br>updateData: {pickupDate?, items?} | {success, order}            | ✅ 使用中 (admin.js: 974) |
| `deleteOrder(orderCode)`             | DELETE       | `/api/order/{orderCode}`        | orderCode: string                                      | {success}                   | ✅ 使用中 (admin.js: 986) |

---

### 🔄 注文API（互換性版 - intakeCode対応）

| メソッド名                             | 内部処理                                | 使用状況  | 備考              |
| -------------------------------------- | --------------------------------------- | --------- | ----------------- |
| `submitIntake(cart, pickupDate)`       | → `submitOrder(cart, pickupDate)`       | ⚠️ 未使用 | 旧APIのエイリアス |
| `searchIntake(code)`                   | → `searchOrder(code)`                   | ⚠️ 未使用 | 旧APIのエイリアス |
| `cancelIntake(intakeCode)`             | → `cancelOrder(intakeCode)`             | ⚠️ 未使用 | 旧APIのエイリアス |
| `updateIntake(intakeCode, updateData)` | → `updateOrder(intakeCode, updateData)` | ⚠️ 未使用 | 旧APIのエイリアス |
| `deleteIntake(intakeCode)`             | → `deleteOrder(intakeCode)`             | ⚠️ 未使用 | 旧APIのエイリアス |

> **注**: すべてのIntake系メソッドは内部的にOrder系メソッドを呼び出します。現在のコードでは新API（Order系）が直接使用されています。

---

### 💳 決済・受取API

| メソッド名                                        | HTTPメソッド | エンドポイント       | パラメータ                                                   | 戻り値             | 使用状況                                 |
| ------------------------------------------------- | ------------ | -------------------- | ------------------------------------------------------------ | ------------------ | ---------------------------------------- |
| `processPayment(codeOrIntakeCode, paymentMethod)` | POST         | `/api/payment`       | orderCode: string<br>paymentMethod: string (default: 'cash') | {success, payment} | ✅ 使用中 (admin.js: 1098)               |
| `completePickup(code)`                            | POST         | `/api/pickup/{code}` | code: string                                                 | {success}          | ✅ 使用中 (admin.js: 1182, main.js: 705) |

> **注**: `processPayment`は`orderCode`/`intakeCode`両方をサーバーに送信し、後方互換性を確保しています。

---

### 📦 注文一覧・検索API

| メソッド名              | HTTPメソッド | エンドポイント       | パラメータ      | 戻り値                | 使用状況        |
| ----------------------- | ------------ | -------------------- | --------------- | --------------------- | --------------- |
| `getOrders()`           | GET          | `/api/orders`        | なし            | {success, orders: []} | ✅ 頻繁に使用中 |
| `getAllOrders()`        | GET          | `/api/orders`        | なし            | {success, orders: []} | ✅ 頻繁に使用中 |
| `searchOrders(filters)` | POST         | `/api/orders/search` | filters: object | {success, orders: []} | ⚠️ 未使用       |

> **注**: `getOrders()`と`getAllOrders()`は同じエンドポイントを呼びますが、意味的に使い分けられています。

---

### 📈 ダッシュボード・統計API

| メソッド名            | HTTPメソッド | エンドポイント         | パラメータ | 戻り値               | 使用状況                  |
| --------------------- | ------------ | ---------------------- | ---------- | -------------------- | ------------------------- |
| `getDashboardStats()` | GET          | `/api/dashboard/stats` | なし       | {success, stats: {}} | ✅ 使用中 (admin.js: 353) |

---

### 🍱 メニュー管理API

| メソッド名                     | HTTPメソッド | エンドポイント              | パラメータ                                           | 戻り値          | 使用状況                         |
| ------------------------------ | ------------ | --------------------------- | ---------------------------------------------------- | --------------- | -------------------------------- |
| `addMenu(menuData)`            | POST         | `/api/menu`                 | menuData: {storeId, name, price, description, image} | {success, menu} | ✅ 使用中 (admin.js: 1651, 1725) |
| `updateMenu(menuId, menuData)` | PUT          | `/api/menu/{menuId}`        | menuId: string<br>menuData: object                   | {success, menu} | ✅ 頻繁に使用中                  |
| `deleteMenu(menuId)`           | DELETE       | `/api/menu/{menuId}`        | menuId: string                                       | {success}       | ✅ 使用中 (admin.js: 2028)       |
| `toggleMenuActive(menuId)`     | PATCH        | `/api/menu/{menuId}/toggle` | menuId: string                                       | {success, menu} | ✅ 使用中 (admin.js: 2039)       |

---

### 🏪 店舗管理API

| メソッド名                        | HTTPメソッド | エンドポイント                 | パラメータ                           | 戻り値           | 使用状況                         |
| --------------------------------- | ------------ | ------------------------------ | ------------------------------------ | ---------------- | -------------------------------- |
| `addStore(storeData)`             | POST         | `/api/stores`                  | storeData: {name, contactPhone}      | {success, store} | ✅ 使用中 (admin.js: 2226)       |
| `updateStore(storeId, storeData)` | PUT          | `/api/stores/{storeId}`        | storeId: string<br>storeData: object | {success, store} | ✅ 使用中 (admin.js: 2165, 2250) |
| `deleteStore(storeId)`            | DELETE       | `/api/stores/{storeId}`        | storeId: string                      | {success}        | ✅ 使用中 (admin.js: 2266)       |
| `toggleStoreActive(storeId)`      | PATCH        | `/api/stores/{storeId}/toggle` | storeId: string                      | {success, store} | ✅ 使用中 (admin.js: 2277)       |

---

### ⏰ 営業時間・システムメッセージAPI

| メソッド名                     | HTTPメソッド | エンドポイント        | パラメータ      | 戻り値                 | 使用状況                      |
| ------------------------------ | ------------ | --------------------- | --------------- | ---------------------- | ----------------------------- |
| `updateBusinessHours(hours)`   | PUT          | `/api/business-hours` | hours: object   | {success}              | ✅ 使用中 (admin.js: 1402)    |
| `getSystemMessage()`           | GET          | `/api/system-message` | なし            | {success, message: {}} | ✅ 使用中 (user.js, admin.js) |
| `updateSystemMessage(message)` | PUT          | `/api/system-message` | message: object | {success}              | ✅ 使用中 (admin.js: 1366)    |

---

### 📝 ログAPI

| メソッド名             | HTTPメソッド | エンドポイント                        | パラメータ                                              | 戻り値              | 使用状況                         |
| ---------------------- | ------------ | ------------------------------------- | ------------------------------------------------------- | ------------------- | -------------------------------- |
| `getLogs(type, limit)` | GET          | `/api/logs?type={type}&limit={limit}` | type: string (nullable)<br>limit: number (default: 100) | {success, logs: []} | ✅ 使用中 (admin.js: 2288, 2369) |

---

### 🚫 キャンセルポリシー・特別日API

| メソッド名                          | HTTPメソッド | エンドポイント             | パラメータ                                      | 戻り値                | 使用状況                   |
| ----------------------------------- | ------------ | -------------------------- | ----------------------------------------------- | --------------------- | -------------------------- |
| `getCancelPolicy()`                 | GET          | `/api/cancel-policy`       | なし                                            | {success, policy: {}} | ✅ 使用中 (admin.js: 2799) |
| `updateCancelPolicy(policy)`        | PUT          | `/api/cancel-policy`       | policy: object                                  | {success}             | ✅ 使用中 (admin.js: 2926) |
| `getSpecialDays()`                  | GET          | `/api/special-days`        | なし                                            | {success, days: []}   | ✅ 使用中 (admin.js: 2800) |
| `addSpecialDay(date, open, reason)` | POST         | `/api/special-days`        | date: string<br>open: boolean<br>reason: string | {success}             | ✅ 使用中 (admin.js: 2946) |
| `deleteSpecialDay(date)`            | DELETE       | `/api/special-days/{date}` | date: string                                    | {success}             | ✅ 使用中 (admin.js: 2959) |

---

### 📊 レポートAPI

| メソッド名                           | HTTPメソッド | エンドポイント                               | パラメータ                           | 戻り値                    | 使用状況                   |
| ------------------------------------ | ------------ | -------------------------------------------- | ------------------------------------ | ------------------------- | -------------------------- |
| `getSalesReport(startDate, endDate)` | GET          | `/api/reports/sales?startDate={}&endDate={}` | startDate: string<br>endDate: string | {success, report: {}}     | ✅ 使用中 (admin.js: 2693) |
| `aggregateSales(groupBy)`            | GET          | `/api/sales/aggregate?groupBy={groupBy}`     | groupBy: string (default: 'date')    | {success, aggregates: []} | ⚠️ 未使用                  |

---

### 🗑️ データ管理API

| メソッド名             | HTTPメソッド | エンドポイント | パラメータ   | 戻り値                     | 使用状況                   |
| ---------------------- | ------------ | -------------- | ------------ | -------------------------- | -------------------------- |
| `cleanupOldData(days)` | POST         | `/api/cleanup` | days: number | {success, deleted: number} | ✅ 使用中 (admin.js: 2976) |

---

### 💾 バックアップAPI

| メソッド名                 | HTTPメソッド | エンドポイント        | パラメータ        | 戻り値                 | 使用状況  |
| -------------------------- | ------------ | --------------------- | ----------------- | ---------------------- | --------- |
| `createBackup()`           | POST         | `/api/backup`         | なし              | {success, timestamp}   | ⚠️ 未使用 |
| `listBackups()`            | GET          | `/api/backup/list`    | なし              | {success, backups: []} | ⚠️ 未使用 |
| `restoreBackup(timestamp)` | POST         | `/api/backup/restore` | timestamp: string | {success}              | ⚠️ 未使用 |

---

### 🎁 特例処理API

| メソッド名                                         | HTTPメソッド | エンドポイント                     | パラメータ                                                    | 戻り値                  | 使用状況                   |
| -------------------------------------------------- | ------------ | ---------------------------------- | ------------------------------------------------------------- | ----------------------- | -------------------------- |
| `getSpecialCases()`                                | GET          | `/api/special-cases`               | なし                                                          | {success, cases: []}    | ✅ 使用中 (admin.js: 3260) |
| `addSpecialCase(type, orderCode, details)`         | POST         | `/api/special-cases`               | type: string<br>orderCode: string<br>details: object          | {success}               | ⚠️ 未使用                  |
| `applyDiscount(orderCode, discountAmount, reason)` | POST         | `/api/orders/{orderCode}/discount` | orderCode: string<br>discountAmount: number<br>reason: string | {success}               | ✅ 使用中 (main.js: 600)   |
| `addCustomerNote(orderCode, note)`                 | POST         | `/api/orders/{orderCode}/note`     | orderCode: string<br>note: string                             | {success}               | ✅ 使用中 (main.js: 619)   |
| `getCustomerNote(orderCode)`                       | GET          | `/api/orders/{orderCode}/note`     | orderCode: string                                             | {success, note: string} | ⚠️ 未使用                  |

---

## 🔄 後方互換性の確認

### Intake → Order 移行マッピング

システムは`intakeCode`から`orderCode`へ移行しましたが、完全な後方互換性を維持しています。

| 旧API (Intake)     | 新API (Order)      | 実装方法                            | 状態        |
| ------------------ | ------------------ | ----------------------------------- | ----------- |
| `submitIntake()`   | `submitOrder()`    | Intakeメソッドが内部的にOrderを呼ぶ | 🟢 完全互換 |
| `searchIntake()`   | `searchOrder()`    | Intakeメソッドが内部的にOrderを呼ぶ | 🟢 完全互換 |
| `cancelIntake()`   | `cancelOrder()`    | Intakeメソッドが内部的にOrderを呼ぶ | 🟢 完全互換 |
| `updateIntake()`   | `updateOrder()`    | Intakeメソッドが内部的にOrderを呼ぶ | 🟢 完全互換 |
| `deleteIntake()`   | `deleteOrder()`    | Intakeメソッドが内部的にOrderを呼ぶ | 🟢 完全互換 |
| `processPayment()` | `processPayment()` | パラメータ名は変わったが両方対応    | 🟢 完全互換 |

### 両APIを対応しているメソッド

以下のメソッドは`orderCode`/`intakeCode`の両方を受け付ける設計になっています：

1. **`processPayment(codeOrIntakeCode, paymentMethod)`**
   - 内部で`orderCode`と`intakeCode`の両方をサーバーに送信
   - サーバー側でどちらでも処理可能

2. **`completePickup(code)`**
   - コード名に依存しない実装
   - `orderCode`でも`intakeCode`でも動作

### 現在の使用状況

```javascript
// ✅ 現在のコードで使用されているのは新API (Order系)
await api.submitOrder(cart, pickupDate); // user.js
await api.searchOrder(code); // admin.js, user.js
await api.cancelOrder(orderCode); // user.js
await api.updateOrder(orderCode, data); // admin.js
await api.deleteOrder(orderCode); // admin.js

// ⚠️ 旧API (Intake系) は現在未使用だが、定義は維持されている
// 将来的に削除検討可能だが、互換性のため残すことを推奨
```

---

## 🔍 未使用メソッドの分析

### ⚠️ 完全未使用メソッド（実装済みだが呼び出しなし）

| メソッド名          | カテゴリ     | 理由・推奨アクション                                                 |
| ------------------- | ------------ | -------------------------------------------------------------------- |
| `register()`        | 認証         | 🟡 ユーザー登録機能が未実装。将来の機能拡張のため保持推奨            |
| `verifyEmail()`     | 認証         | 🟡 メール認証機能が未実装。将来の機能拡張のため保持推奨              |
| `submitIntake()`    | 注文(旧)     | 🟢 後方互換性のため保持。削除非推奨                                  |
| `searchIntake()`    | 注文(旧)     | 🟢 後方互換性のため保持。削除非推奨                                  |
| `cancelIntake()`    | 注文(旧)     | 🟢 後方互換性のため保持。削除非推奨                                  |
| `updateIntake()`    | 注文(旧)     | 🟢 後方互換性のため保持。削除非推奨                                  |
| `deleteIntake()`    | 注文(旧)     | 🟢 後方互換性のため保持。削除非推奨                                  |
| `searchOrders()`    | 注文検索     | 🔴 削除検討可。`getOrders()`で代替可能                               |
| `aggregateSales()`  | レポート     | 🟡 将来のレポート機能拡張のため保持推奨                              |
| `createBackup()`    | バックアップ | 🟡 将来のバックアップ機能実装のため保持推奨                          |
| `listBackups()`     | バックアップ | 🟡 将来のバックアップ機能実装のため保持推奨                          |
| `restoreBackup()`   | バックアップ | 🟡 将来のバックアップ機能実装のため保持推奨                          |
| `addSpecialCase()`  | 特例処理     | 🔴 削除検討可。`getSpecialCases()`は使用されているが追加機能は未使用 |
| `getCustomerNote()` | 注文ノート   | 🔴 削除検討可。`addCustomerNote()`は使用されているが取得機能は未使用 |

### 🎯 推奨アクション

#### 即座に削除可能

- `searchOrders()` - `getOrders()`と機能が重複
- `addSpecialCase()` - UI実装がない
- `getCustomerNote()` - UI実装がない

#### 保持推奨（将来の機能拡張）

- `register()`, `verifyEmail()` - ユーザー登録システム実装時に必要
- Intake系全メソッド - 後方互換性のため必須
- `aggregateSales()` - 高度なレポート機能実装時に必要
- バックアップ系メソッド - 運用上重要な機能

---

## ❌ 実装されていない参照メソッド

### `getStoreInquiries(storeId)`

**発見場所**: [admin.js](admin.js#L2173-L2174)

```javascript
// admin.js line 2173-2174
if (this.api.getStoreInquiries) {
    const r = await this.api.getStoreInquiries(storeId);
```

**問題**: このメソッドは`api.js`に定義されていません。

**影響**: 条件付き呼び出し(`if`文で存在確認)のため、エラーは発生していませんが、機能は動作しません。

**推奨**:

1. 店舗問い合わせ機能が必要な場合、`api.js`に以下を追加：
   ```javascript
   async getStoreInquiries(storeId) {
       return this.request(`/stores/${storeId}/inquiries`);
   }
   ```
2. 不要な場合、`admin.js`から該当コードを削除

---

## 📊 統計サマリー

| カテゴリ          | 定義数 | 使用中 | 未使用 | 後方互換 |
| ----------------- | ------ | ------ | ------ | -------- |
| 認証API           | 8      | 6      | 2      | -        |
| データ取得        | 3      | 3      | 0      | -        |
| 注文API (新)      | 5      | 5      | 0      | -        |
| 注文API (旧)      | 5      | 0      | 5      | ✅       |
| 決済・受取        | 2      | 2      | 0      | ✅       |
| 注文一覧          | 3      | 2      | 1      | -        |
| ダッシュボード    | 1      | 1      | 0      | -        |
| メニュー管理      | 4      | 4      | 0      | -        |
| 店舗管理          | 4      | 4      | 0      | -        |
| システム設定      | 3      | 3      | 0      | -        |
| ログ              | 1      | 1      | 0      | -        |
| キャンセル/特別日 | 5      | 5      | 0      | -        |
| レポート          | 2      | 1      | 1      | -        |
| データ管理        | 1      | 1      | 0      | -        |
| バックアップ      | 3      | 0      | 3      | -        |
| 特例処理          | 5      | 3      | 2      | -        |
| **合計**          | **54** | **40** | **14** | **7**    |

### 使用率

- **使用中**: 40/54 = **74.1%**
- **未使用**: 14/54 = **25.9%**
- **後方互換メソッド**: 7/54 = **13.0%**

---

## ✅ 結論

### システムの健全性: 🟢 良好

1. **✅ 後方互換性**: intakeCode → orderCode の移行は完璧に実装されています
2. **✅ メソッド使用率**: 74%のメソッドが実際に使用されており、健全な状態
3. **✅ コード品質**: 未使用メソッドの多くは将来の機能拡張を見越したもの
4. **⚠️ 注意点**: `getStoreInquiries()`が未実装（影響は軽微）

### 推奨される次のステップ

1. **優先度高**: `getStoreInquiries()`の実装または削除を決定
2. **優先度中**: 明らかに不要なメソッド（`searchOrders`等）の削除を検討
3. **優先度低**: バックアップ機能の実装（運用上推奨）
4. **保守**: Intake系メソッドは後方互換性のため維持継続

---

**レポート終了**
