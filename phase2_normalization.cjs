/**
 * フェーズ2: データベース正規化スクリプト（後方互換性維持）
 * 
 * 目的: 
 * - orderCodeを主キーとして統一
 * - 既存のintakeCode/orderIdフィールドは残す（後方互換性）
 * - すべてのレコードに必須フィールドを追加
 * - ログデータをorderCodeに統一
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'database.json');
const BACKUP_PATH = path.join(__dirname, 'data', 'database_before_phase2.json');

console.log('\n🔧 フェーズ2: データベース正規化開始\n');

// データベース読み込み
let database;
try {
    const rawData = fs.readFileSync(DB_PATH, 'utf8');
    database = JSON.parse(rawData);
    console.log('✅ データベース読み込み完了');
} catch (error) {
    console.error('❌ エラー: データベースファイルの読み込みに失敗', error);
    process.exit(1);
}

// バックアップ作成
try {
    fs.writeFileSync(BACKUP_PATH, JSON.stringify(database, null, 2), 'utf8');
    console.log(`✅ バックアップ作成: ${BACKUP_PATH}\n`);
} catch (error) {
    console.error('❌ エラー: バックアップの作成に失敗', error);
    process.exit(1);
}

// 統計情報
let stats = {
    totalOrders: 0,
    normalized: 0,
    fieldsMissing: [],
    logsUpdated: 0
};

console.log('📊 データベース分析中...\n');

// ====================================
// 1. ordersテーブルの正規化
// ====================================
if (database.orders && Array.isArray(database.orders)) {
    stats.totalOrders = database.orders.length;
    console.log(`📦 注文レコード数: ${stats.totalOrders}`);
    
    database.orders = database.orders.map((order, index) => {
        const normalized = { ...order };
        let changed = false;
        
        // orderCodeの確保（優先順位: orderCode > intakeCode > orderId）
        if (!normalized.orderCode) {
            if (order.intakeCode) {
                normalized.orderCode = order.intakeCode;
                changed = true;
            } else if (order.orderId) {
                // orderId (O-XXXX) を orderCode (R-XXXX) 形式に変換
                normalized.orderCode = order.orderId.replace('O-', 'R-');
                changed = true;
            } else {
                console.warn(`⚠️  注文 ${index + 1}: orderCodeが見つかりません`);
                stats.fieldsMissing.push(`Order ${index + 1}: orderCode`);
            }
        }
        
        // 後方互換性: intakeCodeも保持（orderCodeと同じ値）
        if (!normalized.intakeCode && normalized.orderCode) {
            normalized.intakeCode = normalized.orderCode;
            changed = true;
        }
        
        // 必須フィールドのデフォルト値設定
        const defaults = {
            items: order.items || [],
            pickupDate: order.pickupDate || null,
            userId: order.userId || null,
            totalAmount: order.totalAmount || 0,
            status: order.status || 'PENDING',
            createdAt: order.createdAt || order.orderedAt || new Date().toISOString(),
            paidAt: order.paidAt || null,
            pickedAt: order.pickedAt || null,
            cancelledAt: order.cancelledAt || null,
            paymentMethod: order.paymentMethod || null
        };
        
        // 欠落フィールドを追加
        Object.keys(defaults).forEach(key => {
            if (normalized[key] === undefined) {
                normalized[key] = defaults[key];
                changed = true;
            }
        });
        
        // orderedAtフィールドは削除せず、createdAtにコピー
        if (order.orderedAt && !normalized.createdAt) {
            normalized.createdAt = order.orderedAt;
            changed = true;
        }
        
        if (changed) {
            stats.normalized++;
            console.log(`  ✓ 正規化: ${normalized.orderCode} (Status: ${normalized.status})`);
        }
        
        return normalized;
    });
    
    console.log(`\n✅ ${stats.normalized}/${stats.totalOrders} 件の注文を正規化しました\n`);
}

// ====================================
// 2. ログデータの正規化
// ====================================
if (database.logs && Array.isArray(database.logs)) {
    console.log('📝 ログデータを正規化中...');
    
    database.logs = database.logs.map(log => {
        if (log.details && log.details.intakeCode && !log.details.orderCode) {
            // intakeCodeをorderCodeにコピー（後方互換性のためintakeCodeも残す）
            log.details.orderCode = log.details.intakeCode;
            stats.logsUpdated++;
            return log;
        }
        return log;
    });
    
    console.log(`✅ ${stats.logsUpdated} 件のログを更新しました\n`);
}

// ====================================
// 3. intakesテーブルの確認
// ====================================
if (!database.intakes) {
    database.intakes = [];
    console.log('✅ intakes配列を初期化しました（空）\n');
} else if (database.intakes.length > 0) {
    console.warn(`⚠️  intakes配列に ${database.intakes.length} 件のデータが残っています`);
    console.warn('    これらは今後ordersテーブルに統合される予定です');
}

// ====================================
// 4. カウンター確認
// ====================================
if (!database.counters) {
    database.counters = {
        intake: 0,
        order: 0
    };
    console.log('✅ カウンターを初期化しました');
} else {
    console.log(`✅ カウンター: intake=${database.counters.intake || 0}, order=${database.counters.order || 0}`);
}

// ====================================
// 5. データベース保存
// ====================================
try {
    fs.writeFileSync(DB_PATH, JSON.stringify(database, null, 2), 'utf8');
    console.log('\n✅ データベース保存完了\n');
} catch (error) {
    console.error('❌ エラー: データベースの保存に失敗', error);
    process.exit(1);
}

// ====================================
// 最終レポート
// ====================================
console.log('═══════════════════════════════════════');
console.log('📊 正規化完了レポート');
console.log('═══════════════════════════════════════');
console.log(`総注文数:          ${stats.totalOrders}`);
console.log(`正規化済み:        ${stats.normalized}`);
console.log(`ログ更新:          ${stats.logsUpdated}`);
console.log(`インテーク残存:    ${database.intakes.length}`);
console.log('───────────────────────────────────────');
console.log(`バックアップ:      ${path.basename(BACKUP_PATH)}`);
console.log('═══════════════════════════════════════\n');

if (stats.fieldsMissing.length > 0) {
    console.warn('⚠️  以下のフィールドが欠落していました:');
    stats.fieldsMissing.forEach(item => console.warn(`   - ${item}`));
    console.log('');
}

console.log('✅ フェーズ2正規化完了！');
console.log('💡 次のステップ: APIクライアント層の更新 (phase3)\n');

process.exit(0);
