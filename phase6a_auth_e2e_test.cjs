// フェーズ6A: 認証付き完全E2Eテスト
// 管理者ログインを含む全機能の統合テスト

const http = require('http');
const crypto = require('crypto');

const BASE_URL = 'http://localhost:8080';
const API_PATH = '/api';
const TEST_CART = [
    {
        id: 'M001',
        menuId: 'M001',
        name: 'テスト弁当',
        price: 650,
        quantity: 1
    }
];
const TEST_PICKUP_DATE = '2026-02-20';

// テスト用管理者アカウント
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123';

let sessionCookie = null;  // 認証用Cookieを保存
let testOrderCode = null;
let testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

function logTest(name, passed, details = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${name}`);
    if (details) console.log(`    ${details}`);
    testResults.tests.push({ name, passed, details });
    if (passed) testResults.passed++;
    else testResults.failed++;
}

function httpRequest(endpoint, method = 'GET', body = null, useCookie = false) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 8080,
            path: API_PATH + endpoint,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        // 認証が必要なリクエストにCookieを追加
        if (useCookie && sessionCookie) {
            options.headers['Cookie'] = sessionCookie;
        }

        if (body) {
            const bodyString = JSON.stringify(body);
            options.headers['Content-Length'] = Buffer.byteLength(bodyString);
        }

        const req = http.request(options, (res) => {
            let data = '';
            
            // Set-Cookieヘッダーを取得（ログイン時）
            if (res.headers['set-cookie']) {
                const cookies = res.headers['set-cookie'];
                const sessionCookieMatch = cookies.find(c => c.startsWith('sessionId='));
                if (sessionCookieMatch) {
                    sessionCookie = sessionCookieMatch.split(';')[0];
                }
            }
            
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ 
                        success: res.statusCode === 200, 
                        data: parsed, 
                        status: res.statusCode,
                        cookie: sessionCookie
                    });
                } catch (e) {
                    resolve({ success: false, error: 'JSON parse error', raw: data });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function testAPI(name, endpoint, method = 'GET', body = null, requireAuth = false) {
    try {
        return await httpRequest(endpoint, method, body, requireAuth);
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function runTests() {
    console.log('\n===========================================');
    console.log('   フェーズ6A: 認証付き完全E2Eテスト');
    console.log('===========================================\n');

    // ===================================
    // テスト0: 管理者ログイン
    // ===================================
    console.log('🔐 テスト0: 管理者ログイン');
    const loginResult = await testAPI('POST /api/auth/login', '/auth/login', 'POST', {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
    });
    
    if (loginResult.success && loginResult.data.success && loginResult.cookie) {
        logTest('管理者ログイン', true, `Cookie取得: ${loginResult.cookie.substring(0, 30)}...`);
        console.log(`    📝 完全なCookie: ${loginResult.cookie}`);
    } else {
        logTest('管理者ログイン', false, loginResult.error || loginResult.data?.error);
        console.log('❌ ログイン失敗のため、以降の認証テストをスキップします\n');
    }

    // ===================================
    // テスト1: 注文作成（新API: /api/order）
    // ===================================
    console.log('\n📝 テスト1: 注文作成（新API）');
    const createResult = await testAPI('POST /api/order', '/order', 'POST', {
        cart: TEST_CART,
        pickupDate: TEST_PICKUP_DATE
    });
    
    if (createResult.success && createResult.data.success && createResult.data.orderCode) {
        testOrderCode = createResult.data.orderCode;
        logTest('注文作成（新API）', true, `orderCode: ${testOrderCode}`);
    } else {
        logTest('注文作成（新API）', false, createResult.error || createResult.data?.error);
        console.log('❌ 注文作成失敗のため、以降のテストをスキップします\n');
        return;
    }

    // ===================================
    // テスト2: 注文検索（新API: /api/order/:code）
    // ===================================
    console.log('\n🔍 テスト2: 注文検索（新API）');
    const searchNewResult = await testAPI(`GET /api/order/${testOrderCode}`, `/order/${testOrderCode}`, 'GET');
    
    if (searchNewResult.success && searchNewResult.data.order) {
        const order = searchNewResult.data.order;
        logTest('注文検索（新API）', true, `status: ${order.status}, amount: ${order.totalAmount}`);
    } else {
        logTest('注文検索（新API）', false, searchNewResult.error);
    }

    // ===================================
    // テスト3: 注文検索（旧API: /api/intake/:code - 後方互換性）
    // ===================================
    console.log('\n🔍 テスト3: 注文検索（旧API - 後方互換性）');
    const searchOldResult = await testAPI(`GET /api/intake/${testOrderCode}`, `/intake/${testOrderCode}`, 'GET');
    
    if (searchOldResult.success && searchOldResult.data.order && searchOldResult.data.intake) {
        logTest('注文検索（旧API）', true, '旧APIでも正常にorderとintakeを返却');
    } else {
        logTest('注文検索（旧API）', false, '後方互換性が機能していません');
    }

    // ===================================
    // テスト4: レスポンス構造の一貫性
    // ===================================
    console.log('\n📊 テスト4: レスポンス構造の一貫性');
    if (searchNewResult.data?.order && searchOldResult.data?.order) {
        const newOrder = searchNewResult.data.order;
        const oldOrder = searchOldResult.data.order;
        const isSame = newOrder.orderCode === oldOrder.orderCode && 
                       newOrder.status === oldOrder.status;
        logTest('レスポンス一貫性', isSame, '新旧APIで同一の注文データを返却');
    } else {
        logTest('レスポンス一貫性', false, '注文データの取得に失敗');
    }

    // ===================================
    // テスト5: 決済処理（認証あり）🔐
    // ===================================
    console.log('\n💳 テスト5: 決済処理（認証あり）');
    const paymentResult = await testAPI('POST /api/payment', '/payment', 'POST', {
        orderCode: testOrderCode,
        paymentMethod: 'cash'
    }, true);  // ← 認証が必要
    
    if (paymentResult.success && paymentResult.data.success) {
        logTest('決済処理', true, 'PENDING → PAID に変更成功');
    } else {
        logTest('決済処理', false, paymentResult.data?.error || paymentResult.error);
    }

    // ===================================
    // テスト6: 決済後の注文検索
    // ===================================
    console.log('\n🔍 テスト6: 決済後の注文状態確認');
    const afterPaymentResult = await testAPI(`GET /api/order/${testOrderCode}`, `/order/${testOrderCode}`, 'GET');
    
    if (afterPaymentResult.success && afterPaymentResult.data.order) {
        const isPaid = afterPaymentResult.data.order.status === 'PAID';
        logTest('決済後ステータス', isPaid, `status: ${afterPaymentResult.data.order.status}, paidAt: ${afterPaymentResult.data.order.paidAt ? '設定済み' : 'null'}`);
    } else {
        logTest('決済後ステータス', false, `注文取得失敗`);
    }

    // ===================================
    // テスト7: 受取処理（認証あり）🔐
    // ===================================
    console.log('\n📦 テスト7: 受取処理（認証あり）');
    const pickupResult = await testAPI(`POST /api/pickup/${testOrderCode}`, `/pickup/${testOrderCode}`, 'POST', null, true);  // ← 認証が必要
    
    if (pickupResult.success && pickupResult.data.success) {
        logTest('受取処理', true, 'PAID → PICKED に変更成功');
    } else {
        logTest('受取処理', false, pickupResult.data?.error || pickupResult.error);
    }

    // ===================================
    // テスト8: 受取後の注文状態確認
    // ===================================
    console.log('\n🔍 テスト8: 受取後の注文状態確認');
    const afterPickupResult = await testAPI(`GET /api/order/${testOrderCode}`, `/order/${testOrderCode}`, 'GET');
    
    if (afterPickupResult.success && afterPickupResult.data.order) {
        const isPicked = afterPickupResult.data.order.status === 'PICKED';
        logTest('受取後ステータス', isPicked, `status: ${afterPickupResult.data.order.status}, pickedAt: ${afterPickupResult.data.order.pickedAt ? '設定済み' : 'null'}`);
    } else {
        logTest('受取後ステータス', false, '注文取得失敗');
    }

    // ===================================
    // テスト9: 新規注文作成（キャンセルテスト用）
    // ===================================
    console.log('\n📝 テスト9: キャンセルテスト用注文作成');
    const createForCancelResult = await testAPI('POST /api/order', '/order', 'POST', {
        cart: TEST_CART,
        pickupDate: TEST_PICKUP_DATE
    });
    
    let cancelTestOrderCode = null;
    if (createForCancelResult.success && createForCancelResult.data.orderCode) {
        cancelTestOrderCode = createForCancelResult.data.orderCode;
        logTest('キャンセル用注文作成', true, `orderCode: ${cancelTestOrderCode}`);
    } else {
        logTest('キャンセル用注文作成', false, '注文作成失敗');
    }

    // ===================================
    // テスト10: キャンセル処理（新API）
    // ===================================
    if (cancelTestOrderCode) {
        console.log('\n🚫 テスト10: キャンセル処理（新API）');
        const cancelResult = await testAPI(`POST /api/order/${cancelTestOrderCode}/cancel`, `/order/${cancelTestOrderCode}/cancel`, 'POST');
        
        if (cancelResult.success && cancelResult.data.success) {
            logTest('キャンセル処理', true, 'PENDING → CANCELLED に変更成功');
        } else {
            logTest('キャンセル処理', false, cancelResult.data?.error || cancelResult.error);
        }
    }

    // ===================================
    // テスト11: 管理者ログアウト
    // ===================================
    console.log('\n🔐 テスト11: 管理者ログアウト');
    const logoutResult = await testAPI('POST /api/auth/logout', '/auth/logout', 'POST', null, true);
    
    if (logoutResult.success && logoutResult.data.success) {
        logTest('管理者ログアウト', true, 'セッション破棄成功');
    } else {
        logTest('管理者ログアウト', false, logoutResult.error);
    }

    // ===================================
    // 結果サマリー
    // ===================================
    console.log('\n===========================================');
    console.log('   テスト結果サマリー');
    console.log('===========================================');
    console.log(`✅ 成功: ${testResults.passed}`);
    console.log(`❌ 失敗: ${testResults.failed}`);
    console.log(`📊 成功率: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
    
    if (testResults.failed === 0) {
        console.log('\n🎉🎉🎉 すべてのテストが成功しました！ 🎉🎉🎉');
        console.log('✅ フェーズ6A完了: 認証付きテスト100%成功');
        console.log('✅ システムは完全に統合されています');
    } else {
        console.log('\n⚠️  いくつかのテストが失敗しました。');
        console.log('\n失敗したテスト:');
        testResults.tests.filter(t => !t.passed).forEach(t => {
            console.log(`  ❌ ${t.name}: ${t.details}`);
        });
    }
    
    console.log('\n===========================================\n');
}

// テスト実行
runTests().catch(error => {
    console.error('❌ テスト実行中にエラーが発生:', error);
    process.exit(1);
});
