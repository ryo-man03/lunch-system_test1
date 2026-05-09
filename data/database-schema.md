# lunch-system データベース拡張設計

## 1. ユーザー管理（users）

```json
{
  "id": "U001",
  "name": "山田 太郎",
  "email": "taro@example.com",
  "phone": "080-0000-0000",
  "registeredAt": "2025-12-18T00:00:00.000Z",
  "isVip": false
}
```

## 2. 注文履歴の充実（orders）

```json
{
  "orderId": "O-0001",
  "userId": "U001",
  "intakeCode": "R-0001",
  "items": [{ "id": "M002", "name": "のり弁当", "quantity": 2, "price": 500 }],
  "totalAmount": 1000,
  "status": "PENDING",
  "orderedAt": "2025-12-16T10:00:00.000Z",
  "pickupDate": "2025-12-16"
}
```

## 3. メニュー詳細追加（menu_items）

```json
{
  "id": "M001",
  "storeId": "S001",
  "name": "唐揚げ弁当",
  "price": 650,
  "originalPrice": null,
  "active": true,
  "description": "ジューシーな唐揚げとご飯の定番弁当。",
  "image": "/images/karaage.jpg",
  "category": "和食",
  "allergens": ["卵", "小麦", "大豆"],
  "unavailableDates": [],
  "unavailableDateRanges": [],
  "unavailableWeekdays": [],
  "unavailableTimeRanges": [],
  "closedMessage": null
}
```

---

- users: 新規追加
- orders: userId, orderedAt, pickupDate,items, status, totalAmount などを充実
- menu_items: description, image, category, allergens などを追加

この設計に沿って database.json を拡張・移行できます。ご希望の具体的な内容があればご指示ください。
