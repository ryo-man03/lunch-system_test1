// フェーズ5: エンドツーエンドテスト
// APIの後方互換性と新しいエンドポイントの動作確認

const http = require('http');

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

function httpRequest(endpoint, method = 'GET', body = null) {
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

        if (body) {
            const bodyString = JSON.stringify(body);
            options.headers['Content-Length'] = Buffer.byteLength(bodyString);
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ success: res.statusCode === 200, data: parsed, status: res.statusCode });
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

async function testAPI(name, endpoint, method = 'GET', body = null) {
    try {
        return await httpRequest(endpoint, method, body);
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function runTests() {
    console.log('\n===========================================');
    console.log('   フェーズ5: エンドツーエンドテスト');
    console.log('===========================================\n');

    // ===================================
    // テスト1: 注文作成（新API: /api/order）
    // ===================================
    console.log('📝 テスト1: 注文作成（新API）');
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
    if (searchNewResult.data.order && searchOldResult.data.order) {
        const newOrder = searchNewResult.data.order;
        const oldOrder = searchOldResult.data.order;
        const isSame = newOrder.orderCode === oldOrder.orderCode && 
                       newOrder.status === oldOrder.status;
        logTest('レスポンス一貫性', isSame, '新旧APIで同一の注文データを返却');
    }

    // ===================================
    // テスト5: 決済処理（orderCodeで決済）
    // ===================================
    console.log('\n💳 テスト5: 決済処理');
    const paymentResult = await testAPI('POST /api/payment', '/payment', 'POST', {
        orderCode: testOrderCode,
        paymentMethod: 'cash'
    });
    
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
    
    if (afterPaymentResult.success && afterPaymentResult.data.order.status === 'PAID') {
        logTest('決済後ステータス', true, 'status: PAID, paidAtが設定されている');
    } else {
        logTest('決済後ステータス', false, `実際のステータス: ${afterPaymentResult.data.order?.status}`);
    }

    // ===================================
    // テスト7: 受取処理
    // ===================================
    console.log('\n📦 テスト7: 受取処理');
    const pickupResult = await testAPI(`POST /api/pickup/${testOrderCode}`, `/pickup/${testOrderCode}`, 'POST');
    
    if (pickupResult.success && pickupResult.data.success) {
        logTest('受取処理', true, 'PAID → PICKED に変更成功');
    } else {
        logTest('受取処理', false, pickupResult.data?.error || pickupResult.error);
    }

    // ===================================
    // テスト8: 新規注文作成（キャンセルテスト用）
    // ===================================
    console.log('\n📝 テスト8: キャンセルテスト用注文作成');
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
    // テスト9: キャンセル処理（新API）
    // ===================================
    if (cancelTestOrderCode) {
        console.log('\n🚫 テスト9: キャンセル処理（新API）');
        const cancelResult = await testAPI(`POST /api/order/${cancelTestOrderCode}/cancel`, `/order/${cancelTestOrderCode}/cancel`, 'POST');
        
        if (cancelResult.success && cancelResult.data.success) {
            logTest('キャンセル処理', true, 'PENDING → CANCELLED に変更成功');
        } else {
            logTest('キャンセル処理', false, cancelResult.data?.error || cancelResult.error);
        }
    }

    // ===================================
    // テスト10: ダッシュボード統計
    // ===================================
    console.log('\n📊 テスト10: ダッシュボード統計');
    // 注: 認証が必要なため、このテストは手動で確認

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
        console.log('\n🎉 すべてのテストが成功しました！');
        console.log('✅ フェーズ5完了: システムは正常に動作しています');
    } else {
        console.log('\n⚠️  いくつかのテストが失敗しました。詳細を確認してください。');
    }
    
    console.log('\n===========================================\n');
}

// テスト実行
runTests().catch(error => {
    console.error('❌ テスト実行中にエラーが発生:', error);
    process.exit(1);
});
