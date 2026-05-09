// データベース正規化スクリプト v2.0
// 目的: orderIdフィールドを削除し、orderCodeに統一

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'database.json');
const BACKUP_DIR = path.join(__dirname, 'data', 'backups');

console.log('');
console.log('='.repeat(60));
console.log('📋 データベース正規化スクリプト v2.0');
console.log('='.repeat(60));
console.log('');

// バックアップディレクトリの作成
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// データベースの読み込み
console.log('📂 データベースを読み込んでいます...');
let dataStore;
try {
    const rawData = fs.readFileSync(DATA_FILE, 'utf8');
    dataStore = JSON.parse(rawData);
    console.log('✅ データベースを読み込みました');
} catch (error) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
}

// バックアップの作成
const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
const backupFile = path.join(BACKUP_DIR, `backup-before-normalization-${timestamp}.json`);
console.log('');
console.log('💾 バックアップを作成しています...');
fs.writeFileSync(backupFile, JSON.stringify(dataStore, null, 2), 'utf8');
console.log(`✅ バックアップ作成: ${path.basename(backupFile)}`);

// 正規化処理
console.log('');
console.log('🔧 注文データを正規化しています...');
console.log('');

let normalizedCount = 0;
let unchangedCount = 0;
const changes = [];

dataStore.orders = dataStore.orders.map((order, index) => {
    const before = JSON.parse(JSON.stringify(order)); // ディープコピー
    
    // orderCodeを決定（優先順位: orderCode > orderId > intakeCode）
    const orderCode = order.orderCode || order.orderId || order.intakeCode;
    
    if (!orderCode) {
        console.error(`⚠️ 注文 #${index + 1}: 有効なIDが見つかりません！`);
        return order;
    }
    
    // 正規化された注文オブジェクト
    const normalized = {
        orderCode: orderCode,               // 主キー
        intakeCode: orderCode,              // 後方互換用（同じ値）
        items: order.items || [],
        pickupDate: order.pickupDate,
        userId: order.userId || null,
        totalAmount: order.totalAmount || 0,
        status: order.status || 'PENDING',
        createdAt: order.createdAt,
        paidAt: order.paidAt || null,
        pickedAt: order.pickedAt || null,
        paymentMethod: order.paymentMethod || null,
        cancelledAt: order.cancelledAt || null
    };
    
    // 変更があったかチェック
    const hasChanges = JSON.stringify(before) !== JSON.stringify(normalized);
    
    if (hasChanges) {
        normalizedCount++;
        const change = {
            index: index + 1,
            before: {
                orderId: before.orderId,
                orderCode: before.orderCode,
                intakeCode: before.intakeCode
            },
            after: {
                orderCode: normalized.orderCode,
                intakeCode: normalized.intakeCode
            }
        };
        changes.push(change);
        
        console.log(`  [${index + 1}] ${order.orderCode || order.orderId || order.intakeCode}`);
        if (before.orderId) console.log(`      - orderId削除: ${before.orderId}`);
        if (!before.intakeCode) console.log(`      + intakeCode追加: ${normalized.intakeCode}`);
    } else {
        unchangedCount++;
    }
    
    return normalized;
});

// countersの更新（不要なintakeカウンタを削除検討）
if (dataStore.counters && dataStore.counters.intake !== undefined) {
    console.log('');
    console.log('⚠️ counters.intakeフィールドが検出されました');
    console.log('   現在値:', dataStore.counters.intake);
    console.log('   → 後方互換性のため保持します');
}

// last_savedの更新
dataStore.last_saved = new Date().toISOString();

// 保存
console.log('');
console.log('💾 正規化されたデータを保存しています...');
fs.writeFileSync(DATA_FILE, JSON.stringify(dataStore, null, 2), 'utf8');
console.log('✅ データベースを保存しました');

// サマリー
console.log('');
console.log('='.repeat(60));
console.log('📊 正規化完了サマリー');
console.log('='.repeat(60));
console.log('');
console.log(`  総注文数:      ${dataStore.orders.length}件`);
console.log(`  正規化済み:    ${normalizedCount}件`);
console.log(`  変更なし:      ${unchangedCount}件`);
console.log('');

if (changes.length > 0) {
    console.log('🔍 変更詳細:');
    console.log('');
    changes.forEach(c => {
        console.log(`  [${c.index}]`);
        console.log(`    Before: orderId=${c.before.orderId}, orderCode=${c.before.orderCode}, intakeCode=${c.before.intakeCode}`);
        console.log(`    After:  orderCode=${c.after.orderCode}, intakeCode=${c.after.intakeCode}`);
        console.log('');
    });
}

console.log('✅ データベースの正規化が完了しました！');
console.log('');
console.log(`📦 バックアップファイル: ${backupFile}`);
console.log('');
console.log('🚀 サーバーを再起動してください:');
console.log('   cd c:\\お弁当\\lunch-system');
console.log('   node run_server_only.js');
console.log('');
console.log('='.repeat(60));
console.log('');
