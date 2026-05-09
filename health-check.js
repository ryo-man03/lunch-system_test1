/**
 * システム健全性チェックスクリプト
 * データの整合性とシステムの状態を確認
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, 'data', 'database.json');

console.log('🔍 システム健全性チェックを開始...\n');

// データファイルの存在確認
if (!fs.existsSync(DATA_FILE)) {
    console.log('⚠️  データファイルが見つかりません');
    console.log('   初回起動時にデフォルトデータで作成されます');
    process.exit(0);
}

// データファイルの読み込み
let data;
try {
    const fileContent = fs.readFileSync(DATA_FILE, 'utf8');
    data = JSON.parse(fileContent);
    console.log('✅ データファイルの読み込み成功');
} catch (error) {
    console.error('❌ データファイルの読み込みエラー:', error.message);
    process.exit(1);
}

// データ構造のチェック
const requiredKeys = [
    'admins', 'stores', 'menu_items', 'intakes', 'orders', 
    'logs', 'counters', 'cancel_policy'
];

const optionalKeys = ['system_settings', 'special_days', 'special_cases', 
                       'customer_notes', 'coupons', 'vip_customers'];

console.log('\n📋 データ構造チェック:');
let structureOk = true;
for (const key of requiredKeys) {
    if (data[key] === undefined) {
        console.log(`   ❌ ${key} が見つかりません（必須）`);
        structureOk = false;
    } else {
        console.log(`   ✅ ${key}`);
    }
}

for (const key of optionalKeys) {
    if (data[key] !== undefined) {
        console.log(`   ✅ ${key} (オプション)`);
    }
}

if (!structureOk) {
    console.log('\n⚠️  データ構造に問題があります');
    process.exit(1);
}

// 統計情報
console.log('\n📊 データ統計:');
console.log(`   管理者数: ${data.admins?.length || 0}`);
console.log(`   店舗数: ${data.stores?.length || 0}`);
console.log(`   メニュー数: ${data.menu_items?.length || 0}`);
console.log(`   受付数: ${data.intakes?.length || 0}`);
console.log(`   注文数: ${data.orders?.length || 0}`);
console.log(`   ログ数: ${data.logs?.length || 0}`);

// カウンター情報
console.log('\n🔢 カウンター:');
console.log(`   受付カウンター: ${data.counters?.intake || 0}`);
console.log(`   注文カウンター: ${data.counters?.order || 0}`);

// 未決済の受付をチェック
const pendingIntakes = data.intakes?.filter(i => i.status === 'PENDING') || [];
console.log(`\n⏳ 未決済の受付: ${pendingIntakes.length}件`);

if (pendingIntakes.length > 0) {
    console.log('   最新5件:');
    pendingIntakes.slice(0, 5).forEach(intake => {
        const createdAt = new Date(intake.createdAt);
        const age = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60));
        console.log(`   - ${intake.intakeCode}: ¥${intake.totalAmount} (${age}分前)`);
    });
}

// 古いデータのチェック
const oldIntakes = data.intakes?.filter(i => {
    const age = Date.now() - new Date(i.createdAt).getTime();
    return age > 30 * 24 * 60 * 60 * 1000; // 30日以上前
}) || [];

console.log(`\n🗄️  古いデータ (30日以上): ${oldIntakes.length}件`);
if (oldIntakes.length > 10) {
    console.log('   ⚠️  古いデータが蓄積しています。定期的なクリーンアップを推奨します');
}

// バックアップの確認
const backupDir = path.join(__dirname, 'data', 'backups');
if (fs.existsSync(backupDir)) {
    const backups = fs.readdirSync(backupDir).filter(f => f.startsWith('backup-'));
    console.log(`\n💾 バックアップ: ${backups.length}件`);
    if (backups.length > 0) {
        const latest = backups.sort().reverse()[0];
        console.log(`   最新: ${latest}`);
    }
} else {
    console.log('\n💾 バックアップ: なし');
}

// データサイズ
const stats = fs.statSync(DATA_FILE);
const sizeKB = (stats.size / 1024).toFixed(2);
console.log(`\n💽 データファイルサイズ: ${sizeKB}KB`);
if (stats.size > 5 * 1024 * 1024) {
    console.log('   ⚠️  データファイルが5MBを超えています。パフォーマンスに影響する可能性があります');
}

// 画像データのチェック
const menuWithImages = data.menu_items?.filter(m => m.image && m.image.length > 0) || [];
console.log(`\n🖼️  画像付きメニュー: ${menuWithImages.length}/${data.menu_items?.length || 0}件`);

const totalImageSize = menuWithImages.reduce((sum, m) => sum + (m.image?.length || 0), 0);
const imageSizeMB = (totalImageSize * 0.75 / 1024 / 1024).toFixed(2); // Base64は約1.33倍なので0.75を掛ける
console.log(`   合計画像サイズ: 約${imageSizeMB}MB`);

if (totalImageSize > 10 * 1024 * 1024) {
    console.log('   ⚠️  画像データが大きいため、読み込みが遅くなる可能性があります');
}

// エラーログのチェック
const errorLogs = data.logs?.filter(log => log.type === 'error') || [];
console.log(`\n🚨 エラーログ: ${errorLogs.length}件`);
if (errorLogs.length > 0) {
    console.log('   最新5件:');
    errorLogs.slice(0, 5).forEach(log => {
        console.log(`   - ${new Date(log.timestamp).toLocaleString('ja-JP')}: ${log.action}`);
    });
}

console.log('\n✅ システム健全性チェック完了\n');
