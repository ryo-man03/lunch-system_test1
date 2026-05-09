/**
 * 認証APIテスト
 */

import { describe, test, expect } from '@jest/globals';
import http from 'http';

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
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

describe('認証API', () => {
  test('正しい認証情報でログインできる', async () => {
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.data.success).toBe(true);
    expect(loginRes.data.admin).toBeDefined();
    expect(loginRes.data.admin.email).toBe('admin@example.com');
    expect(loginRes.cookies).toBeDefined();
  });

  test('間違ったパスワードでログインに失敗する', async () => {
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@example.com',
      password: 'wrong-password'
    });

    expect(loginRes.status).toBe(401);
    expect(loginRes.data.success).toBe(false);
  });

  test('存在しないメールアドレスでログインに失敗する', async () => {
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      email: 'nonexistent@example.com',
      password: 'admin123'
    });

    expect(loginRes.status).toBe(401);
    expect(loginRes.data.success).toBe(false);
  });

  test('セッション確認APIが動作する', async () => {
    // まずログイン
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });

    const sessionCookie = loginRes.cookies[0].split(';')[0];

    // セッション確認
    const sessionRes = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 8080,
        path: '/api/auth/session',
        method: 'GET',
        headers: {
          'Cookie': sessionCookie
        }
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          resolve({ 
            status: res.statusCode, 
            data: JSON.parse(body)
          });
        });
      });

      req.on('error', reject);
      req.end();
    });

    expect(sessionRes.status).toBe(200);
    expect(sessionRes.data.authenticated).toBe(true);
    expect(sessionRes.data.admin.email).toBe('admin@example.com');
  });
});
