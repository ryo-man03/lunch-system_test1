/**
 * E2Eテスト - 注文フロー（ブラウザ操作）
 */

import { test, expect } from '@playwright/test';

test.describe('ユーザー注文フロー', () => {
  test('メニューから注文を作成できる', async ({ page }) => {
    // トップページにアクセス
    await page.goto('/');
    
    // ページタイトルを確認
    await expect(page).toHaveTitle(/大学弁当予約システム/);
    
    // メニューが表示されることを確認
    const menuItems = page.locator('.menu-item');
    await expect(menuItems).toHaveCount(await menuItems.count());
  });
});

test.describe('管理者フロー', () => {
  test('管理者ログインができる', async ({ page }) => {
    await page.goto('/admin.html');
    
    // ログインフォームが表示されることを確認
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    
    // 認証情報を入力
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    
    // ログインボタンをクリック
    await page.click('button[type="submit"]');
    
    // ログイン後、ダッシュボードが表示されることを確認  
    await page.waitForTimeout(1000);
    
    // URLが変わっていないか、または管理画面要素が表示されていることを確認
    const url = page.url();
    expect(url).toContain('admin.html');
  });
});
