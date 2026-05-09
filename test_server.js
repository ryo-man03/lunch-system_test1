// テスト用サーバー（ポート8081で起動）
// グローバル例外・未処理Promise拒否をログ出力
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
});

import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// テスト用ポート
const PORT = 8081;
console.log('テスト環境：ポート ' + PORT + ' で起動します');

// データファイルパス（テスト用に別のファイルを使用）
const DATA_FILE = path.join(__dirname, 'data', 'test_database.json');

// データストア初期化
function initDataStore() {
    // まず本番のデータをコピー
    const prodDataFile = path.join(__dirname, 'data', 'database.json');
    if(fs.existsSync(prodDataFile) && !fs.existsSync(DATA_FILE)){
        const prodData = JSON.parse(fs.readFileSync(prodDataFile, 'utf8'));
        fs.writeFileSync(DATA_FILE, JSON.stringify(prodData, null, 2), 'utf8');
        console.log('本番データをテスト環境にコピーしました');
    }
    
    // テストデータの初期化
    if (!fs.existsSync(DATA_FILE)) {
        const defaultData = {
            admins: [
                {
                    id: 1,
                    name: "テスト管理者",
                    email: "test@example.com",
                    password: crypto.createHash('sha256').update('test123').digest('hex'),
                    approved: true,
                    registeredAt: new Date().toISOString()
                }
            ],
            stores: [
                { id: 'TS001', name: 'テスト店舗A', contactPhone: '000-0000-0000', active: true, createdAt: new Date().toISOString() },
                { id: 'TS002', name: 'テスト店舗B', contactPhone: '000-0000-0001', active: true, createdAt: new Date().toISOString() }
            ],
            menu_items: [
                {
                    id: 'TM001',
                    name: 'テスト日替わり弁当',
                    price: 500,
                    description: 'テスト用お弁当',
                    category: 'lunch',
                    storeId: 'TS001',
                    active: true,
                    image: '',
                    unavailableDates: [],
                    stock: 50,
                    maxPerOrder: 5,
                    tags: ['人気', 'おすすめ'],
                    allergens: [],
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'TM002',
                    name: 'テストからあげ弁当',
                    price: 600,
                    description: 'ジューシーなからあげ',
                    category: 'lunch',
                    storeId: 'TS001',
                    active: true,
                    image: '',
                    unavailableDates: [],
                    stock: 30,
                    maxPerOrder: 3,
                    tags: ['人気'],
                    allergens: ['小麦', '卵'],
                    createdAt: new Date().toISOString()
                }
            ],
            orders: [],
            coupons: [],
            pickupSlots: [],
            settings: {
                systemMessage: 'テスト環境です',
                maintenanceMode: false,
                orderDeadline: '10:00',
                businessHours: { start: '08:00', end: '18:00' }
            }
        };
        
        fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2), 'utf8');
        console.log('テストデータを初期化しました');
    }
    
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

// run_server_only.jsの内容をコピー（ポート番号を変更）
// 以下、元のrun_server_only.jsの内容を挿入してください
// この部分は長いので省略しますが、実際には元のファイルの内容をコピーします

let dataStore = initDataStore();

function saveData() {
    try {
        const backupDir = path.join(__dirname, 'data', 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        fs.writeFileSync(DATA_FILE, JSON.stringify(dataStore, null, 2), 'utf8');
        console.log(`[${new Date().toISOString()}] テストデータ保存完了`);
    } catch (err) {
        console.error('データ保存エラー:', err);
    }
}

// 簡易HTTPサーバー
const server = http.createServer((req, res) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    
    // CORS対応
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // 静的ファイル配信
    if (req.method === 'GET' && !req.url.startsWith('/api/')) {
        const publicDir = path.join(__dirname, 'public');
        let filePath = req.url === '/' ? '/index.html' : req.url;
        filePath = path.join(publicDir, filePath);
        
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('Not Found');
                return;
            }
            
            const ext = path.extname(filePath);
            const mimeTypes = {
                '.html': 'text/html',
                '.js': 'text/javascript',
                '.css': 'text/css',
                '.json': 'application/json',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.svg': 'image/svg+xml'
            };
            
            res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
            res.end(data);
        });
        return;
    }
    
    // API エンドポイント
    if (req.url.startsWith('/api/')) {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = body ? JSON.parse(body) : {};
                handleAPI(req, res, data);
            } catch (err) {
                console.error('API処理エラー:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
    }
});

function handleAPI(req, res, data) {
    res.setHeader('Content-Type', 'application/json');
    
    // ダッシュボード統計
    if (req.url === '/api/admin/dashboard-stats' && req.method === 'GET') {
        const today = new Date().toISOString().split('T')[0];
        const todayOrders = dataStore.orders.filter(o => o.pickupDate === today);
        const stats = {
            intake: todayOrders.filter(o => o.status === 'INTAKE').length,
            paid: todayOrders.filter(o => o.status === 'PAID').length,
            picked: todayOrders.filter(o => o.status === 'PICKED_UP').length,
            total: todayOrders.filter(o => o.status !== 'CANCELLED').reduce((sum, o) => sum + o.totalAmount, 0)
        };
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, stats }));
        return;
    }
    
    // その他のAPIエンドポイントは省略（必要に応じて追加）
    
    res.writeHead(404);
    res.end(JSON.stringify({ success: false, error: 'エンドポイントが見つかりません' }));
}

server.listen(PORT, () => {
    console.log('=====================================');
    console.log(`🧪 テストサーバーが起動しました`);
    console.log(`📍 http://localhost:${PORT}`);
    console.log(`📂 データファイル: ${DATA_FILE}`);
    console.log('=====================================');
});
