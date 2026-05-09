/**
 * データベース移行スクリプト
 * intakesとordersを統合してordersのみにする
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, 'data', 'database.json');
const BACKUP_FILE = path.join(__dirname, 'data', 'database_before_migration.json');

console.log('🔄 データベース移行を開始します...');
console.log('');

// データ読み込み
const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

// バックアップ作成
fs.writeFileSync(BACKUP_FILE, JSON.stringify(data, null, 2), 'utf8');
console.log('✅ バックアップ作成完了:', BACKUP_FILE);

// 既存のordersを確認
const existingOrders = data.orders || [];
console.log(`📊 既存の注文数: ${existingOrders.length}`);

// intakesをordersに統合
const intakes = data.intakes || [];
console.log(`📊 受付データ数: ${intakes.length}`);

const migratedOrders = intakes.map(intake => {
    // 既にorderCodeを持っている場合はそのまま使う
    const orderCode = intake.orderCode || intake.intakeCode;
    
    // ordersテーブルに既に存在するか確認
    const existingOrder = existingOrders.find(o => 
        (o.orderCode === orderCode) || 
        (o.intakeCode === intake.intakeCode)
    );
    
    if (existingOrder) {
        // 既存の注文データがある場合は、intakeの情報でマージ
        console.log(`  🔗 マージ: ${orderCode}`);
        return {
            ...existingOrder,
            orderCode: orderCode,
            items: intake.items || existingOrder.items,
            pickupDate: intake.pickupDate || existingOrder.pickupDate,
            totalAmount: intake.totalAmount || existingOrder.totalAmount,
            createdAt: intake.createdAt || existingOrder.createdAt || existingOrder.orderedAt,
            // intakeのステータスを優先
            status: intake.status === 'CANCELLED' ? 'CANCELLED' : existingOrder.status,
            cancelledAt: intake.cancelledAt || existingOrder.cancelledAt
        };
    } else {
        // 新規注文として追加
        console.log(`  ➕ 新規: ${orderCode} (${intake.status})`);
        return {
            orderCode: orderCode,
            items: intake.items,
            pickupDate: intake.pickupDate,
            totalAmount: intake.totalAmount,
            status: intake.status, // PENDING, PAID, CANCELLED
            createdAt: intake.createdAt,
            paidAt: intake.paidAt || null,
            pickedAt: intake.pickedAt || null,
            cancelledAt: intake.cancelledAt || null,
            paymentMethod: intake.paymentMethod || null,
            userId: intake.userId || null
        };
    }
});

// 既存のordersで、intakesにない注文を追加（後方互換性）
const allOrders = [...migratedOrders];
existingOrders.forEach(order => {
    const orderCode = order.orderCode || order.orderId;
    const alreadyExists = allOrders.some(o => 
        o.orderCode === orderCode || 
        o.orderCode === order.intakeCode
    );
    
    if (!alreadyExists) {
        console.log(`  📦 既存注文を保持: ${orderCode}`);
        allOrders.push({
            ...order,
            orderCode: orderCode
        });
    }
});

// 新しいデータ構造
const newData = {
    ...data,
    orders: allOrders,
    // intakesは削除（後方互換性のため空配列として残す）
    intakes: [],
    // カウンターを調整
    counters: {
        ...data.counters,
        order: Math.max(
            data.counters.order || 0,
            data.counters.intake || 0
        )
    }
};

// 保存
fs.writeFileSync(DATA_FILE, JSON.stringify(newData, null, 2), 'utf8');

console.log('');
console.log('✅ 移行完了！');
console.log(`   統合後の注文数: ${allOrders.length}`);
console.log(`   - PENDING: ${allOrders.filter(o => o.status === 'PENDING').length}`);
console.log(`   - PAID: ${allOrders.filter(o => o.status === 'PAID').length}`);
console.log(`   - PICKED: ${allOrders.filter(o => o.status === 'PICKED').length}`);
console.log(`   - CANCELLED: ${allOrders.filter(o => o.status === 'CANCELLED').length}`);
console.log('');
console.log('📝 バックアップファイル:', BACKUP_FILE);
console.log('');
