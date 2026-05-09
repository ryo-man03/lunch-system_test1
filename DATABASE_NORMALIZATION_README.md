# データベース正規化スクリプト

このスクリプトは、`orderId` フィールドを削除し、すべての注文を `orderCode` に統一します。

## 実行方法

```powershell
cd c:\お弁当\lunch-system
node database_normalization.cjs
```

## 正規化内容

1. すべての注文オブジェクトから `orderId` フィールドを削除
2. `orderCode` を主キーとして統一
3. `intakeCode` は後方互換性のため保持（同じ値）
4. バックアップを自動作成

## 実行前

```json
{
  "orderId": "O-0001",      // 削除対象
  "intakeCode": "R-0001",   // 保持（orderCodeと同じ値）
  "orderCode": "R-0001",    // 主キー
  ...
}
```

## 実行後

```json
{
  "orderCode": "R-0001",    // 主キー（唯一のID）
  "intakeCode": "R-0001",   // 後方互換用（同じ値）
  ...
}
```
