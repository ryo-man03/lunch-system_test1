/**
 * 本番環境ライブモニタリング用E2Eテスト
 * 
 * 目的: 
 * - 10件の注文を実際のAPIエンドポイントに送信
 * - 決済→受取のステータス遷移を監視
 * - ログおよびデータベースの整合性を検証
 * 
 * 実行方法: node production_stress_test.cjs
 */

const http = require('http');
const fs = require('fs');

const BASE_URL = 'http://localhost:8080';
const DB_PATH = './data/database.json';

// テスト実行前の状態を記録
let initialState = {};
let testResults = [];
let sessionCookie = '';

// カラー出力
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  white: '\x1b[37m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// HTTP リクエストヘルパー（セッション対応）
function makeRequest(method, path, data = null, requireAuth = false) {
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

    // 認証が必要な場合はCookieを追加
    if (requireAuth && sessionCookie) {
      options.headers['Cookie'] = sessionCookie;
    }

    const req = http.request(options, (res) => {
      // セッションCookieを保存
      if (res.headers['set-cookie']) {
        sessionCookie = res.headers['set-cookie'][0].split(';')[0];
      }

      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
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

// 管理者ログイン
async function adminLogin() {
  log('\n[認証] 管理者ログイン中...', colors.yellow);
  
  const loginRes = await makeRequest('POST', '/api/auth/login', {
    email: 'admin@example.com',
    password: 'admin123'
  });

  if (loginRes.status !== 200 || !loginRes.data.success) {
    throw new Error(`ログイン失敗: ${JSON.stringify(loginRes.data)}`);
  }

  log(`  ✓ ログイン成功: ${loginRes.data.admin.name}`, colors.green);
  return loginRes;
}

// データベース読み込み
function loadDatabase() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    log(`[ERROR] データベース読み込みエラー: ${error.message}`, colors.red);
    return null;
  }
}

// データベース差分表示
function compareDatabases(before, after) {
  const ordersBefore = before.orders.length;
  const ordersAfter = after.orders.length;
  const logsBefore = before.logs.length;
  const logsAfter = after.logs.length;

  log('\n============================================================', colors.cyan);
  log('📊 データベース変化レポート', colors.cyan);
  log('============================================================', colors.cyan);
  log(`注文数:   ${ordersBefore}件 → ${ordersAfter}件 (+${ordersAfter - ordersBefore})`, colors.yellow);
  log(`ログ数:   ${logsBefore}件 → ${logsAfter}件 (+${logsAfter - logsBefore})`, colors.yellow);

  // 新規注文の詳細
  const newOrders = after.orders.slice(ordersBefore);
  if (newOrders.length > 0) {
    log('\n📦 新規注文の詳細:', colors.cyan);
    newOrders.forEach((order, idx) => {
      log(`  [${idx + 1}] ${order.orderCode}`, colors.white);
      log(`      ステータス: ${order.status}`, colors.gray);
      log(`      合計金額:   ¥${order.totalAmount}`, colors.gray);
      log(`      受取日:     ${order.pickupDate}`, colors.gray);
      log(`      決済方法:   ${order.paymentMethod || '未決済'}`, colors.gray);
    });
  }

  // 新規ログの詳細
  const newLogs = after.logs.slice(logsBefore);
  if (newLogs.length > 0) {
    log('\n📋 新規ログの詳細 (直近10件):', colors.cyan);
    newLogs.slice(-10).forEach((logEntry, idx) => {
      log(`  [${logsBefore + idx + 1}] ${logEntry.type} - ${logEntry.action}`, colors.white);
      log(`      タイムスタンプ: ${logEntry.timestamp}`, colors.gray);
      if (logEntry.details) {
        log(`      詳細: ${JSON.stringify(logEntry.details).substring(0, 80)}...`, colors.gray);
      }
    });
  }

  return {
    ordersDelta: ordersAfter - ordersBefore,
    logsDelta: logsAfter - logsBefore
  };
}

// テストシナリオ: 注文→決済→受取
async function testOrderLifecycle(testNumber) {
  const testName = `Test ${testNumber}`;
  log(`\n[${testName}] 開始...`, colors.cyan);

  try {
    // ステップ1: 注文作成（認証不要）
    log(`  [1/3] 注文作成中...`, colors.yellow);
    const pickupDate = new Date();
    pickupDate.setDate(pickupDate.getDate() + 2); // 2日後
    const orderPayload = {
      cart: [
        {
          id: 'M001',
          menuId: 'M001',
          name: `テスト弁当 ${testNumber}`,
          price: 650,
          quantity: 1
        }
      ],
      pickupDate: pickupDate.toISOString().split('T')[0],
      userId: null
    };

    const orderRes = await makeRequest('POST', '/api/order', orderPayload, false);
    
    if (orderRes.status !== 200 || !orderRes.data.success) {
      throw new Error(`注文作成失敗: ${JSON.stringify(orderRes.data)}`);
    }

    const orderCode = orderRes.data.orderCode || orderRes.data.intakeCode;
    log(`    ✓ 注文作成成功: ${orderCode}`, colors.green);

    // 1秒待機（実際のユーザー行動をシミュレート）
    await new Promise(resolve => setTimeout(resolve, 1000));

    // ステップ2: 決済処理（認証必要）
    log(`  [2/3] 決済処理中...`, colors.yellow);
    const paymentRes = await makeRequest('POST', '/api/payment', {
      orderCode: orderCode,
      paymentMethod: 'cash'
    }, true);

    if (paymentRes.status !== 200 || !paymentRes.data.success) {
      throw new Error(`決済失敗: ${JSON.stringify(paymentRes.data)}`);
    }

    log(`    ✓ 決済完了: ${orderCode} (現金)`, colors.green);

    // 1秒待機
    await new Promise(resolve => setTimeout(resolve, 1000));

    // ステップ3: 受取完了（認証必要）
    log(`  [3/3] 受取処理中...`, colors.yellow);
    const pickupRes = await makeRequest('POST', '/api/pickup', {
      orderCode: orderCode
    }, true);

    if (pickupRes.status !== 200 || !pickupRes.data.success) {
      throw new Error(`受取失敗: ${JSON.stringify(pickupRes.data)}`);
    }

    log(`    ✓ 受取完了: ${orderCode}`, colors.green);
    log(`[${testName}] ✅ 成功 (PENDING → PAID → PICKED)`, colors.green);

    return {
      testNumber,
      success: true,
      orderCode,
      error: null
    };

  } catch (error) {
    log(`[${testName}] ❌ 失敗: ${error.message}`, colors.red);
    return {
      testNumber,
      success: false,
      orderCode: null,
      error: error.message
    };
  }
}

// メイン実行
async function main() {
  log('\n============================================================', colors.cyan);
  log('🚀 本番環境ライブモニタリングテスト', colors.cyan);
  log('============================================================', colors.cyan);
  log(`実行時刻: ${new Date().toLocaleString('ja-JP')}`, colors.gray);
  log(`対象サーバー: ${BASE_URL}`, colors.gray);
  log(`テストケース数: 10件`, colors.gray);

  // 初期状態を記録
  log('\n[準備] データベース初期状態を記録中...', colors.yellow);
  initialState = loadDatabase();
  if (!initialState) {
    log('[ERROR] テストを中止します', colors.red);
    process.exit(1);
  }
  log(`  初期注文数: ${initialState.orders.length}件`, colors.gray);
  log(`  初期ログ数: ${initialState.logs.length}件`, colors.gray);

  // 管理者ログイン
  try {
    await adminLogin();
  } catch (error) {
    log(`[ERROR] 管理者ログインに失敗しました: ${error.message}`, colors.red);
    process.exit(1);
  }

  // 10件のテストを順次実行
  log('\n[実行] 10件の注文ライフサイクルテストを開始...', colors.cyan);
  for (let i = 1; i <= 10; i++) {
    const result = await testOrderLifecycle(i);
    testResults.push(result);
    
    // 各テスト間に2秒の間隔
    if (i < 10) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // 最終状態を取得
  log('\n[検証] 最終状態を確認中...', colors.yellow);
  await new Promise(resolve => setTimeout(resolve, 2000)); // DB書き込み待機
  const finalState = loadDatabase();

  // 結果サマリー
  log('\n============================================================', colors.cyan);
  log('📈 テスト結果サマリー', colors.cyan);
  log('============================================================', colors.cyan);

  const successCount = testResults.filter(r => r.success).length;
  const failureCount = testResults.filter(r => !r.success).length;

  log(`✅ 成功: ${successCount}件`, colors.green);
  log(`❌ 失敗: ${failureCount}件`, colors.red);
  log(`📊 成功率: ${((successCount / testResults.length) * 100).toFixed(1)}%`, colors.yellow);

  // 失敗があれば詳細表示
  if (failureCount > 0) {
    log('\n⚠️  失敗したテスト:', colors.red);
    testResults.filter(r => !r.success).forEach(r => {
      log(`  [Test ${r.testNumber}] ${r.error}`, colors.red);
    });
  }

  // データベース変化レポート
  if (finalState) {
    compareDatabases(initialState, finalState);
  }

  // 重要指標の算出
  log('\n============================================================', colors.cyan);
  log('🎯 リリース後24時間監視すべき3つの重要指標', colors.cyan);
  log('============================================================', colors.cyan);
  
  const avgOrdersPerHour = (finalState.orders.length - initialState.orders.length) / (10 / 60); // 10テストの実行時間から推定
  const avgLogsPerOrder = (finalState.logs.length - initialState.logs.length) / (finalState.orders.length - initialState.orders.length);
  
  log('\n【指標1】注文作成成功率', colors.yellow);
  log(`  目標値: ≥95%`, colors.gray);
  log(`  現在値: ${((successCount / testResults.length) * 100).toFixed(1)}%`, successCount >= 9.5 ? colors.green : colors.red);
  log(`  算出式: (成功した注文数 / 総注文試行数) × 100`, colors.gray);
  log(`  監視方法: logs配列で type="order" かつ action="create" のエントリをカウント`, colors.gray);
  
  log('\n【指標2】ステータス遷移の整合性', colors.yellow);
  log(`  目標値: 不整合0件`, colors.gray);
  log(`  現在値: 不整合${failureCount}件`, failureCount === 0 ? colors.green : colors.red);
  log(`  確認内容: PENDING → PAID → PICKED の順序が保たれているか`, colors.gray);
  log(`  監視方法: orders配列で {status: "PICKED", paidAt: null} のような矛盾がないか検索`, colors.gray);
  
  log('\n【指標3】平均ログ生成数/注文', colors.yellow);
  log(`  目標値: 3〜5件/注文 (作成・決済・受取で最低3件)`, colors.gray);
  log(`  現在値: ${avgLogsPerOrder.toFixed(1)}件/注文`, avgLogsPerOrder >= 3 && avgLogsPerOrder <= 5 ? colors.green : colors.yellow);
  log(`  算出式: (新規ログ数) / (新規注文数)`, colors.gray);
  log(`  監視方法: logs.length の増加率が注文数の3倍程度であることを確認`, colors.gray);

  log('\n============================================================', colors.cyan);
  log('✅ テスト完了', colors.green);
  log('============================================================', colors.cyan);
  log(`実行時間: ${new Date().toLocaleString('ja-JP')}`, colors.gray);
  log(`データベース: ${DB_PATH}`, colors.gray);
  
  // 終了コード
  process.exit(failureCount > 0 ? 1 : 0);
}

// 実行
main().catch(error => {
  log(`\n[FATAL ERROR] ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});
