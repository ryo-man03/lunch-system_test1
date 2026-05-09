/**
 * APIテスト - 注文フロー（正常系）
 * 
 * 目的: 注文作成 → 決済 → 受取の一連のフローが正常に動作することを確認
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import http from 'http';

const BASE_URL = 'http://localhost:8080';

// HTTPリクエストヘルパー
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      
      // Cookieを保存
      const cookies = res.headers['set-cookie'];
      
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({ 
            status: res.statusCode, 
            data: result,
            cookies: cookies 
          });
        } catch (e) {
          resolve({ 
            status: res.statusCode, 
            data: body,
            cookies: cookies 
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

describe('注文API - 正常系フロー', () => {
  let sessionCookie = '';
  let testOrderCode = '';

  beforeAll(async () => {
    // 管理者ログイン
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.data.success).toBe(true);
    
    if (loginRes.cookies && loginRes.cookies.length > 0) {
      sessionCookie = loginRes.cookies[0].split(';')[0];
    }
  });

  test('1. 注文が正常に作成できる', async () => {
    const pickupDate = new Date();
    pickupDate.setDate(pickupDate.getDate() + 2);

    const orderRes = await makeRequest('POST', '/api/order', {
      cart: [
        {
          id: 'M001',
          menuId: 'M001',
          name: 'テスト弁当',
          price: 650,
          quantity: 1
        }
      ],
      pickupDate: pickupDate.toISOString().split('T')[0],
      userId: null
    });

    expect(orderRes.status).toBe(200);
    expect(orderRes.data.success).toBe(true);
    expect(orderRes.data.orderCode).toBeDefined();
    expect(orderRes.data.intakeCode).toBeDefined();
    expect(orderRes.data.order.status).toBe('PENDING');

    testOrderCode = orderRes.data.orderCode;
  });

  test('2. 注文が検索できる', async () => {
    const searchRes = await makeRequest('GET', `/api/order/${testOrderCode}`);

    expect(searchRes.status).toBe(200);
    expect(searchRes.data.success).toBe(true);
    expect(searchRes.data.order.orderCode).toBe(testOrderCode);
    expect(searchRes.data.order.status).toBe('PENDING');
  });

  test('3. 決済が正常に処理できる', async () => {
    const paymentRes = await makeRequest('POST', '/api/payment', {
      orderCode: testOrderCode,
      paymentMethod: 'cash'
    }, {
      'Cookie': sessionCookie
    });

    expect(paymentRes.status).toBe(200);
    expect(paymentRes.data.success).toBe(true);
    expect(paymentRes.data.order.status).toBe('PAID');
    expect(paymentRes.data.order.paymentMethod).toBe('cash');
    expect(paymentRes.data.order.paidAt).toBeDefined();
  });

  test('4. 受取が正常に完了できる', async () => {
    const pickupRes = await makeRequest('POST', '/api/pickup', {
      orderCode: testOrderCode
    }, {
      'Cookie': sessionCookie
    });

    expect(pickupRes.status).toBe(200);
    expect(pickupRes.data.success).toBe(true);
    expect(pickupRes.data.order.status).toBe('PICKED');
    expect(pickupRes.data.order.pickedAt).toBeDefined();
  });

  test('5. ステータス遷移の整合性を確認', async () => {
    const finalRes = await makeRequest('GET', `/api/order/${testOrderCode}`);

    expect(finalRes.status).toBe(200);
    expect(finalRes.data.order.status).toBe('PICKED');
    expect(finalRes.data.order.paidAt).toBeDefined();
    expect(finalRes.data.order.pickedAt).toBeDefined();
    
    // タイムスタンプの論理順序を確認
    const createdAt = new Date(finalRes.data.order.createdAt);
    const paidAt = new Date(finalRes.data.order.paidAt);
    const pickedAt = new Date(finalRes.data.order.pickedAt);

    expect(createdAt <= paidAt).toBe(true);
    expect(paidAt <= pickedAt).toBe(true);
  });
});

describe('注文API - 異常系', () => {
  let sessionCookie = '';

  beforeAll(async () => {
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    if (loginRes.cookies && loginRes.cookies.length > 0) {
      sessionCookie = loginRes.cookies[0].split(';')[0];
    }
  });

  test('存在しない注文番号で検索するとエラー', async () => {
    const searchRes = await makeRequest('GET', '/api/order/INVALID-CODE');

    expect(searchRes.status).toBe(404);
    expect(searchRes.data.success).toBe(false);
  });

  test('認証なしで決済しようとするとエラー', async () => {
    const pickupDate = new Date();
    pickupDate.setDate(pickupDate.getDate() + 2);

    const orderRes = await makeRequest('POST', '/api/order', {
      cart: [{ id: 'M001', menuId: 'M001', name: 'テスト', price: 650, quantity: 1 }],
      pickupDate: pickupDate.toISOString().split('T')[0]
    });

    const orderCode = orderRes.data.orderCode;

    const paymentRes = await makeRequest('POST', '/api/payment', {
      orderCode: orderCode,
      paymentMethod: 'cash'
    });

    expect(paymentRes.status).toBe(401);
    expect(paymentRes.data.success).toBe(false);
  });

  test('既に決済済みの注文を再決済しようとするとエラー', async () => {
    const pickupDate = new Date();
    pickupDate.setDate(pickupDate.getDate() + 2);

    const orderRes = await makeRequest('POST', '/api/order', {
      cart: [{ id: 'M001', menuId: 'M001', name: 'テスト', price: 650, quantity: 1 }],
      pickupDate: pickupDate.toISOString().split('T')[0]
    });

    const orderCode = orderRes.data.orderCode;

    // 1回目の決済
    await makeRequest('POST', '/api/payment', {
      orderCode: orderCode,
      paymentMethod: 'cash'
    }, {
      'Cookie': sessionCookie
    });

    // 2回目の決済（エラー期待）
    const secondPaymentRes = await makeRequest('POST', '/api/payment', {
      orderCode: orderCode,
      paymentMethod: 'cash'
    }, {
      'Cookie': sessionCookie
    });

    expect(secondPaymentRes.status).toBe(400);
    expect(secondPaymentRes.data.success).toBe(false);
  });
});

describe('後方互換性テスト', () => {
  test('旧API（/api/intake）でも注文が作成できる', async () => {
    const pickupDate = new Date();
    pickupDate.setDate(pickupDate.getDate() + 2);

    const intakeRes = await makeRequest('POST', '/api/intake', {
      cart: [{ id: 'M001', menuId: 'M001', name: 'テスト', price: 650, quantity: 1 }],
      pickupDate: pickupDate.toISOString().split('T')[0]
    });

    expect(intakeRes.status).toBe(200);
    expect(intakeRes.data.success).toBe(true);
    expect(intakeRes.data.intakeCode).toBeDefined();
    expect(intakeRes.data.orderCode).toBe(intakeRes.data.intakeCode);
  });

  test('intakeCodeでも注文が検索できる', async () => {
    const pickupDate = new Date();
    pickupDate.setDate(pickupDate.getDate() + 2);

    const orderRes = await makeRequest('POST', '/api/order', {
      cart: [{ id: 'M001', menuId: 'M001', name: 'テスト', price: 650, quantity: 1 }],
      pickupDate: pickupDate.toISOString().split('T')[0]
    });

    const intakeCode = orderRes.data.intakeCode;

    const searchRes = await makeRequest('GET', `/api/intake/${intakeCode}`);

    expect(searchRes.status).toBe(200);
    expect(searchRes.data.success).toBe(true);
    // intakeCodeでもorderCodeでも検索できることを確認
    expect(searchRes.data.order.orderCode || searchRes.data.order.intakeCode).toBe(intakeCode);
  });
});
