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

// ポート設定（環境変数から取得、デフォルトは8080）
const PORT = process.env.PORT || 8080;
const IS_TEST_MODE = process.env.TEST_MODE === 'true';

// データファイルパス（テストモードの場合は別ファイル）
const DATA_FILE = IS_TEST_MODE 
    ? path.join(__dirname, 'data', 'test_database.json')
    : path.join(__dirname, 'data', 'database.json');

// 排他制御用のキューとロック
let saveQueue = Promise.resolve();
let isSaving = false;
let pendingSave = false;

// データストア初期化
function initDataStore() {
    const defaultData = {
        admins: [
            {
                id: 1,
                name: "管理者",
                email: "admin@example.com",
                password: crypto.createHash('sha256').update('admin123').digest('hex'),
                approved: true,
                registeredAt: new Date().toISOString()
            }
        ],
        stores: [
            { id: 'S001', name: '店舗A', contactPhone: '000-0000-0000', active: true, createdAt: new Date().toISOString() },
            { id: 'S002', name: '店舗B', contactPhone: '000-0000-0001', active: true, createdAt: new Date().toISOString() }
        ],
        menu_items: [
            {
                id: 'M001',
                name: '日替わり弁当',
                price: 500,
                description: '毎日変わるお弁当',
                category: 'lunch',
                storeId: 'S001',
                active: true,
                image: '',
                unavailableDates: [],
                unavailableDateRanges: [],
                unavailableWeekdays: [],
                unavailableTimeRanges: [],
                createdAt: new Date().toISOString()
            },
            {
                id: 'M002',
                name: 'から揚げ弁当',
                price: 600,
                description: 'ジューシーなから揚げ',
                category: 'lunch',
                storeId: 'S001',
                active: true,
                image: '',
                unavailableDates: [],
                unavailableDateRanges: [],
                unavailableWeekdays: [],
                unavailableTimeRanges: [],
                createdAt: new Date().toISOString()
            },
            {
                id: 'M003',
                name: '幕の内弁当',
                price: 700,
                description: 'バラエティ豊かなお弁当',
                category: 'lunch',
                storeId: 'S002',
                active: true,
                image: '',
                unavailableDates: [],
                unavailableDateRanges: [],
                unavailableWeekdays: [],
                unavailableTimeRanges: [],
                createdAt: new Date().toISOString()
            }
        ],
        intakes: [],
        orders: [],
        logs: [],
        counters: { intake: 0, order: 0, log: 0, special_case: 0 },
        sessions: {},
        system_settings: {
            businessHours: { start: '08:00', end: '20:00' },
            orderTimeLimit: '15:00',
            closedMessage: '本日の受付は終了しました',
            maintenanceMode: false
        },
        cancel_policy: {
            enabled: true,
            timeLimit: 30,
            beforePickupHours: 24
        },
        special_days: [],
        special_cases: [],
        customer_notes: {},
        coupons: [],
        vip_customers: [],
        priority_orders: [],
        special_discounts: [],
        data_backups: [],
        inventory: {},
        favorites: {},
        reviews: [],
        notifications: [],
        users: []
    };

    // データファイルが存在すれば読み込み、なければデフォルトデータを使用
    try {
        if (fs.existsSync(DATA_FILE)) {
            const fileData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            console.log('✅ データファイルを読み込みました');
            // 必須プロパティの確認と補完
            if (!fileData.inventory) {
                console.log('⚠️ inventoryプロパティがないため追加します');
                fileData.inventory = {};
            }
            if (!fileData.favorites) fileData.favorites = {};
            if (!fileData.reviews) fileData.reviews = [];
            if (!fileData.notifications) fileData.notifications = [];
            if (!fileData.users) fileData.users = [];
            return fileData;
        }
    } catch (error) {
        console.error('⚠️ データファイルの読み込みに失敗:', error.message);
    }
    
    console.log('📝 デフォルトデータで初期化します');
    return defaultData;
}

// データを保存
/**
 * データ保存関数（排他制御・原子性保証版）
 * 
 * 特徴:
 * 1. Queueベースの排他制御 - 複数の同時書き込みを直列化
 * 2. アトミックな書き込み - 一時ファイル → rename で原子性保証
 * 3. 自動リトライ - 失敗時は最大3回リトライ
 * 4. エラーハンドリング - 失敗してもシステムを停止させない
 */
function saveData() {
    // 既に保存処理が進行中なら、次の保存をスケジュール
    if (isSaving) {
        pendingSave = true;
        return;
    }

    // Queueに追加して順次実行
    saveQueue = saveQueue.then(() => saveDataInternal()).catch(error => {
        console.error('❌ データ保存エラー（Queue）:', error.message);
    });

    return saveQueue;
}

/**
 * 内部保存処理（リトライ付き）
 */
async function saveDataInternal(retryCount = 0) {
    const MAX_RETRIES = 3;
    isSaving = true;

    try {
        // dataディレクトリがなければ作成
        const dataDir = path.dirname(DATA_FILE);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        // sessionsは保存しない（セッションは揮発性）
        const dataToSave = { ...dataStore };
        dataToSave.sessions = {};
        
        // アトミックな書き込み: temp file → rename
        const tempFile = `${DATA_FILE}.tmp.${Date.now()}`;
        const jsonContent = JSON.stringify(dataToSave, null, 2);
        
        // 一時ファイルに書き込み
        fs.writeFileSync(tempFile, jsonContent, 'utf8');
        
        // 原子的にリネーム（OSレベルの atomic operation）
        fs.renameSync(tempFile, DATA_FILE);
        
        console.log('💾 データを保存しました');
        
        // 日次バックアップ（1日1回）
        createDailyBackup(dataToSave);

    } catch (error) {
        console.error(`❌ データ保存エラー (試行 ${retryCount + 1}/${MAX_RETRIES}):`, error.message);
        
        // リトライ
        if (retryCount < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, 100 * (retryCount + 1))); // 指数バックオフ
            return saveDataInternal(retryCount + 1);
        } else {
            throw new Error(`データ保存に${MAX_RETRIES}回失敗しました: ${error.message}`);
        }
    } finally {
        isSaving = false;
        
        // 保存中に新しい変更があった場合、再度保存
        if (pendingSave) {
            pendingSave = false;
            setImmediate(() => saveData());
        }
    }
}

// 日次バックアップ
function createDailyBackup(data) {
    try {
        const backupDir = path.join(__dirname, 'data', 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const backupFile = path.join(backupDir, `backup-${today}.json`);
        
        // 今日のバックアップがまだなければ作成
        if (!fs.existsSync(backupFile)) {
            fs.writeFileSync(backupFile, JSON.stringify(data, null, 2), 'utf8');
            console.log(`📦 バックアップ作成: ${today}`);
            
            // 古いバックアップを削除（30日以上前）
            cleanOldBackups(backupDir);
        }
    } catch (error) {
        console.error('⚠️ バックアップエラー:', error.message);
    }
}

// 古いバックアップを削除
function cleanOldBackups(backupDir) {
    try {
        const files = fs.readdirSync(backupDir);
        const now = Date.now();
        const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
        
        files.forEach(file => {
            if (file.startsWith('backup-') && file.endsWith('.json')) {
                const filePath = path.join(backupDir, file);
                const stats = fs.statSync(filePath);
                
                if (stats.mtimeMs < thirtyDaysAgo) {
                    fs.unlinkSync(filePath);
                    console.log(`🗑️ 古いバックアップを削除: ${file}`);
                }
            }
        });
    } catch (error) {
        console.error('⚠️ バックアップクリーニングエラー:', error.message);
    }
}

// データストア
const dataStore = initDataStore();

// MIMEタイプマッピング
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// ログ追加関数
function addLog(type, action, details, adminEmail = null) {
    dataStore.counters.log++;
    const log = {
        id: dataStore.counters.log,
        type,
        action,
        details,
        adminEmail,
        timestamp: new Date().toISOString()
    };
    dataStore.logs.unshift(log);
    if (dataStore.logs.length > 1000) {
        dataStore.logs = dataStore.logs.slice(0, 1000);
    }
    return log;
}

// セッション確認
function checkSession(req) {
    const cookies = parseCookies(req.headers.cookie || '');
    const sessionId = cookies.sessionId;
    
    // sessionsオブジェクトが存在しない場合は初期化
    if (!dataStore.sessions) {
        dataStore.sessions = {};
    }
    
    return sessionId && dataStore.sessions[sessionId] ? dataStore.sessions[sessionId] : null;
}

// Cookie解析
function parseCookies(cookieHeader) {
    const cookies = {};
    cookieHeader.split(';').forEach(cookie => {
        const parts = cookie.trim().split('=');
        if (parts.length === 2) {
            cookies[parts[0]] = parts[1];
        }
    });
    return cookies;
}

// リクエストボディ解析
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                resolve({});
            }
        });
        req.on('error', reject);
    });
}

// JSON レスポンス送信
function sendJSON(res, data, statusCode = 200) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

// APIルーティング
async function handleAPI(req, res, pathname, body) {
    const adminEmail = checkSession(req);

    // 認証API
    if (pathname === '/api/auth/login' && req.method === 'POST') {
        const { email, password } = body;
        console.log('🔐 ログイン試行:', { email, password: password ? '***' : '(空)' });
        console.log('📊 登録済み管理者数:', dataStore.admins ? dataStore.admins.length : 0);
        
        if (dataStore.admins && dataStore.admins.length > 0) {
            console.log('👥 管理者一覧:');
            dataStore.admins.forEach((a, i) => {
                console.log(`  ${i + 1}. email: ${a.email}, approved: ${a.approved}, hasPassword: ${!!a.password}`);
            });
        }
        
        const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
        console.log('🔑 入力パスワードハッシュ:', passwordHash);
        
        if (dataStore.admins && dataStore.admins.length > 0) {
            console.log('🔐 DB内パスワードハッシュ:', dataStore.admins[0].password);
            console.log('📏 入力ハッシュ長:', passwordHash.length, 'DBハッシュ長:', dataStore.admins[0].password.length);
            console.log('📝 型:', typeof passwordHash, 'vs', typeof dataStore.admins[0].password);
            console.log('📝 厳密比較:', passwordHash === dataStore.admins[0].password);
            console.log('📝 通常比較:', passwordHash == dataStore.admins[0].password);
        }
        
        const admin = dataStore.admins.find(a => {
            console.log(`  チェック中: ${a.email}, emailMatch: ${a.email === email}, passwordMatch: ${a.password === passwordHash}, approved: ${a.approved}`);
            return a.email === email && a.password === passwordHash && a.approved;
        });
        
        if (admin) {
            const sessionId = crypto.randomBytes(32).toString('hex');
            dataStore.sessions[sessionId] = email;
            res.setHeader('Set-Cookie', `sessionId=${sessionId}; Path=/; HttpOnly; Max-Age=86400`);
            sendJSON(res, { success: true, admin: { name: admin.name, email: admin.email } });
            addLog('auth', 'login', { email }, email);
            console.log('✅ ログイン成功:', email);
        } else {
            console.log('❌ ログイン失敗:', email);
            sendJSON(res, { success: false, error: 'メールアドレスまたはパスワードが間違っています' }, 401);
        }
        return;
    }

    if (pathname === '/api/auth/logout' && req.method === 'POST') {
        const cookies = parseCookies(req.headers.cookie || '');
        const sessionId = cookies.sessionId;
        if (sessionId) delete dataStore.sessions[sessionId];
        res.setHeader('Set-Cookie', 'sessionId=; Path=/; HttpOnly; Max-Age=0');
        sendJSON(res, { success: true });
        return;
    }

    if (pathname === '/api/auth/session') {
        if (adminEmail) {
            const admin = dataStore.admins.find(a => a.email === adminEmail);
            sendJSON(res, { success: true, authenticated: true, admin: { name: admin.name, email: admin.email } });
        } else {
            sendJSON(res, { success: true, authenticated: false });
        }
        return;
    }

    // メニューAPI

    // メニュー取得API
    if (pathname === '/api/menu' && req.method === 'GET') {
        sendJSON(res, { success: true, items: dataStore.menu_items.filter(m => m.active) });
        return;
    }
    // メニュー追加API
    if (pathname === '/api/menu' && req.method === 'POST') {
        const { storeId, name, price, originalPrice, active, description, imageUrl } = body;
        if (!storeId || !name || typeof price !== 'number') {
            sendJSON(res, { success: false, error: 'storeId, name, priceは必須です' });
            return;
        }
        // ID自動生成
        const newId = `M${(dataStore.menu_items.length + 1).toString().padStart(3, '0')}`;
        const newMenu = {
            id: newId,
            storeId,
            name,
            price,
            originalPrice: originalPrice || null,
            active: active !== false,
            description: description || '',
            imageUrl: imageUrl || ''
        };
        dataStore.menu_items.push(newMenu);
        saveDataStore();
        sendJSON(res, { success: true, item: newMenu });
        return;
    }

    // 店舗取得API
    if (pathname === '/api/stores' && req.method === 'GET') {
        sendJSON(res, { success: true, stores: dataStore.stores.filter(s => s.active) });
        return;
    }
    // 店舗追加API
    if (pathname === '/api/stores' && req.method === 'POST') {
        const { name, contactPhone, active } = body;
        if (!name || !contactPhone) {
            sendJSON(res, { success: false, error: 'name, contactPhoneは必須です' });
            return;
        }
        // ID自動生成
        const newId = `S${(dataStore.stores.length + 1).toString().padStart(3, '0')}`;
        const newStore = {
            id: newId,
            name,
            active: active !== false,
            contactPhone
        };
        dataStore.stores.push(newStore);
        saveDataStore();
        sendJSON(res, { success: true, store: newStore });
        return;
    }

    // 店舗問い合わせ取得API
    if (pathname.match(/^\/api\/stores\/[^/]+\/inquiries$/) && req.method === 'GET') {
        const storeId = pathname.split('/')[3];
        // inquiriesプロパティの存在を保証
        if (!dataStore.inquiries) {
            dataStore.inquiries = [];
        }
        const inquiries = dataStore.inquiries.filter(i => i.storeId === storeId);
        sendJSON(res, { success: true, inquiries });
        return;
    }

    // 注文作成API（旧：受付API）
    if ((pathname === '/api/order' || pathname === '/api/intake') && req.method === 'POST') {
        const { cart, pickupDate, userId } = body;
        
        // inventoryプロパティの存在を保証
        if (!dataStore.inventory) {
            dataStore.inventory = {};
        }
        
        // 在庫チェック
        for (const item of cart) {
            const menuId = item.menuId;
            const quantity = item.quantity;
            const inventory = dataStore.inventory[menuId]?.[pickupDate];
            
            if (inventory && inventory.available < quantity) {
                const menu = dataStore.menu_items.find(m => m.id === menuId);
                sendJSON(res, { 
                    success: false, 
                    error: `${menu ? menu.name : menuId}の在庫が不足しています（在庫: ${inventory.available}個）` 
                });
                return;
            }
        }
        
        const total = cart.reduce((sum, item) => {
            const menu = dataStore.menu_items.find(m => m.id === item.menuId);
            return sum + (menu ? menu.price * item.quantity : 0);
        }, 0);
        
        // 注文番号を生成（R-YYMMDD-XXX形式）
        const generateOrderCode = () => {
            const now = new Date();
            const yy = now.getFullYear().toString().slice(-2);
            const mm = (now.getMonth() + 1).toString().padStart(2, '0');
            const dd = now.getDate().toString().padStart(2, '0');
            const dateStr = `${yy}${mm}${dd}`;
            
            // ランダムな英字3文字（大文字小文字混在）
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
            let randomStr = '';
            for (let i = 0; i < 3; i++) {
                randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            
            return `R-${dateStr}-${randomStr}`;
        };
        
        // 重複チェック
        let orderCode;
        let attempts = 0;
        do {
            orderCode = generateOrderCode();
            attempts++;
            if (attempts > 100) {
                // 安全のため100回試行して見つからない場合はタイムスタンプを追加
                orderCode = `R-${Date.now()}`;
                break;
            }
        } while (dataStore.orders.some(o => o.orderCode === orderCode));
        
        // 在庫を減算
        for (const item of cart) {
            const menuId = item.menuId;
            const quantity = item.quantity;
            
            if (!dataStore.inventory[menuId]) {
                dataStore.inventory[menuId] = {};
            }
            
            if (!dataStore.inventory[menuId][pickupDate]) {
                dataStore.inventory[menuId][pickupDate] = {
                    total: 999999,
                    available: 999999,
                    reserved: 0
                };
            }
            
            dataStore.inventory[menuId][pickupDate].reserved += quantity;
            dataStore.inventory[menuId][pickupDate].available -= quantity;
        }
        
        const order = {
            orderCode,
            items: cart,
            pickupDate,
            userId: userId || null,
            totalAmount: total,
            status: 'PENDING', // 未決済
            createdAt: new Date().toISOString(),
            paidAt: null,
            pickedAt: null,
            paymentMethod: null
        };
        dataStore.orders.push(order);
        addLog('order', 'create', { orderCode, items: cart.length, totalAmount: total });
        saveData(); // データ保存
        
        // 後方互換性のため、intakeCodeも返す
        sendJSON(res, { success: true, orderCode, intakeCode: orderCode, order, intake: order });
        return;
    }
    
    // 注文検索API（旧：受付検索API）- 後方互換性のため/api/intakeも対応
    if ((pathname.match(/^\/api\/order\/(.+)$/) || pathname.match(/^\/api\/intake\/(.+)$/)) && req.method === 'GET') {
        const orderCode = pathname.split('/')[3];
        const order = dataStore.orders.find(o => {
            const code = o.orderCode || o.orderId;
            return code && code.toLowerCase() === orderCode.toLowerCase();
        });
        
        if (!order) {
            sendJSON(res, { success: false, error: '注文番号が見つかりません' }, 404);
            return;
        }
        
        // 後方互換性のため、intakeとしても返す
        sendJSON(res, { success: true, order, intake: order });
        return;
    }
    
    // 注文キャンセルAPI（旧：受付キャンセルAPI）- 後方互換性のため/api/intakeも対応
    if ((pathname.match(/^\/api\/order\/(.+)\/cancel$/) || pathname.match(/^\/api\/intake\/(.+)\/cancel$/)) && req.method === 'POST') {
        const orderCode = pathname.split('/')[3];
        const order = dataStore.orders.find(o => {
            const code = o.orderCode || o.orderId;
            return code && code.toLowerCase() === orderCode.toLowerCase();
        });
        
        if (!order) {
            sendJSON(res, { success: false, error: '注文番号が見つかりません' }, 404);
            return;
        }
        
        if (order.status !== 'PENDING') {
            sendJSON(res, { success: false, error: '既に決済済みの注文はキャンセルできません' }, 400);
            return;
        }
        
        // キャンセルポリシーチェック（注文後30分以内、受取24時間前まで）
        const createdTime = new Date(order.createdAt).getTime();
        const now = new Date().getTime();
        const minutesSinceOrder = (now - createdTime) / (1000 * 60);
        
        const pickupTime = new Date(order.pickupDate + 'T12:00:00').getTime();
        const hoursUntilPickup = (pickupTime - now) / (1000 * 60 * 60);
        
        const policy = dataStore.cancel_policy || { enabled: true, timeLimit: 30, beforePickupHours: 24 };
        
        if (policy.enabled) {
            if (minutesSinceOrder > policy.timeLimit && hoursUntilPickup < policy.beforePickupHours) {
                sendJSON(res, { 
                    success: false, 
                    error: `キャンセル期限を過ぎています（注文後${policy.timeLimit}分以内、または受取${policy.beforePickupHours}時間前まで）` 
                }, 400);
                return;
            }
        }
        
        // キャンセル処理
        order.status = 'CANCELLED';
        order.cancelledAt = new Date().toISOString();
        
        // 在庫復元
        for (const item of order.items) {
            const menuId = item.menuId;
            const quantity = item.quantity;
            
            if (dataStore.inventory[menuId]?.[order.pickupDate]) {
                dataStore.inventory[menuId][order.pickupDate].reserved -= quantity;
                dataStore.inventory[menuId][order.pickupDate].available += quantity;
            }
        }
        
        addLog('order', 'cancel', { orderCode }, null);
        saveData(); // データ保存
        
        sendJSON(res, { success: true, message: 'キャンセルしました' });
        return;
    }

        // 注文内容編集API（旧：受付内容編集API、管理者用）- 後方互換性のため/api/intakeも対応
        if ((pathname.match(/^\/api\/order\/(.+)$/) || pathname.match(/^\/api\/intake\/(.+)$/)) && req.method === 'PUT') {
            if (!adminEmail) return sendJSON(res, { success: false, error: '認証が必要です' }, 401);
            const orderCode = pathname.split('/')[3];
            const order = dataStore.orders.find(o => {
                const code = o.orderCode || o.orderId;
                return code && code.toLowerCase() === orderCode.toLowerCase();
            });
            if (!order) return sendJSON(res, { success: false, error: '注文番号が見つかりません' }, 404);
            if (order.status !== 'PENDING') return sendJSON(res, { success: false, error: '編集できません（決済済み/キャンセル済み）' }, 400);
            // 許可する編集項目: items, pickupDate
            if (body.items) order.items = body.items;
            if (body.pickupDate) order.pickupDate = body.pickupDate;
            // 合計金額再計算
            order.totalAmount = (order.items||[]).reduce((sum, item) => {
                const menu = dataStore.menu_items.find(m => m.id === item.menuId);
                return sum + (menu ? menu.price * item.quantity : 0);
            }, 0);
            saveData();
            addLog('order', 'update', { orderCode }, adminEmail);
            sendJSON(res, { success: true, order, intake: order });
            return;
        }

        // 注文削除API（旧：受付削除API、管理者用）- 後方互換性のため/api/intakeも対応
        if ((pathname.match(/^\/api\/order\/(.+)$/) || pathname.match(/^\/api\/intake\/(.+)$/)) && req.method === 'DELETE') {
            if (!adminEmail) return sendJSON(res, { success: false, error: '認証が必要です' }, 401);
            const orderCode = pathname.split('/')[3];
            const idx = dataStore.orders.findIndex(o => {
                const code = o.orderCode || o.orderId;
                return code && code.toLowerCase() === orderCode.toLowerCase();
            });
            if (idx === -1) return sendJSON(res, { success: false, error: '注文番号が見つかりません' }, 404);
            const [deleted] = dataStore.orders.splice(idx, 1);
            saveData();
            addLog('order', 'delete', { orderCode }, adminEmail);
            sendJSON(res, { success: true });
            return;
        }

    // 注文API
    if (pathname === '/api/orders' && req.method === 'GET') {
        if (!adminEmail) return sendJSON(res, { success: false, error: '認証が必要です' }, 401);
        sendJSON(res, { success: true, orders: dataStore.orders });
        return;
    }

    // 本日の注文取得API
    if (pathname === '/api/orders/today' && req.method === 'GET') {
        if (!adminEmail) return sendJSON(res, { success: false, error: '認証が必要です' }, 401);
        
        const today = new Date().toISOString().split('T')[0];
        const todayOrders = dataStore.orders.filter(o => {
            return o.pickupDate === today || 
                   (o.createdAt && o.createdAt.startsWith(today));
        });
        
        sendJSON(res, { success: true, orders: todayOrders, date: today });
        return;
    }

    // ダッシュボード統計（統合システム対応）
    if (pathname === '/api/dashboard/stats') {
        if (!adminEmail) return sendJSON(res, { success: false, error: '認証が必要です' }, 401);
        
        const today = new Date().toISOString().split('T')[0];
        const todayOrders = dataStore.orders.filter(o => o.pickupDate === today);
        
        const stats = {
            intake: dataStore.orders.filter(o => o.status === 'PENDING').length, // 未決済注文数
            paid: todayOrders.filter(o => o.status === 'PAID').length,
            picked: todayOrders.filter(o => o.status === 'PICKED').length,
            total: todayOrders.reduce((sum, o) => sum + o.totalAmount, 0)
        };
        
        sendJSON(res, { success: true, stats });
        return;
    }

    // 決済API（統合システム対応）- orderCode/intakeCode両方受付
    if (pathname === '/api/payment' && req.method === 'POST') {
        if (!adminEmail) return sendJSON(res, { success: false, error: '認証が必要です' }, 401);
        
        const { orderCode, intakeCode, paymentMethod = 'cash' } = body;
        const code = orderCode || intakeCode; // 後方互換性のためどちらも受け付ける
        
        if (!code) return sendJSON(res, { success: false, error: '注文番号が必要です' }, 400);
        
        const order = dataStore.orders.find(o => {
            const oCode = o.orderCode || o.orderId;
            return oCode && oCode.toLowerCase() === code.toLowerCase();
        });
        
        if (!order) return sendJSON(res, { success: false, error: '注文番号が見つかりません' }, 404);
        if (order.status !== 'PENDING') return sendJSON(res, { success: false, error: 'すでに処理済みです' }, 400);
        
        // PENDING → PAID に変更
        order.status = 'PAID';
        order.paidAt = new Date().toISOString();
        order.paymentMethod = paymentMethod;
        
        addLog('order', 'payment', { 
            orderCode: order.orderCode, 
            totalAmount: order.totalAmount,
            paymentMethod 
        }, adminEmail);
        saveData(); // データ保存
        
        // 後方互換性のため、intakeCodeも返す
        sendJSON(res, { success: true, orderCode: order.orderCode, intakeCode: order.orderCode, order });
        return;
    }

    // 受取API (パスパラメータ版)
    if (pathname.startsWith('/api/pickup/') && req.method === 'POST') {
        if (!adminEmail) return sendJSON(res, { success: false, error: '認証が必要です' }, 401);
        
        const orderCode = pathname.split('/')[3];
        const order = dataStore.orders.find(o => {
            const code = o.orderCode || o.orderId;
            return code && code.toLowerCase() === orderCode.toLowerCase();
        });
        
        if (!order) return sendJSON(res, { success: false, error: '注文番号が見つかりません' }, 404);
        if (order.status !== 'PAID') return sendJSON(res, { success: false, error: 'すでに処理済みです' }, 400);
        
        order.status = 'PICKED';
        order.pickedAt = new Date().toISOString();
        
        addLog('order', 'pickup', { orderCode }, adminEmail);
        saveData(); // データ保存
        sendJSON(res, { success: true, order });
        return;
    }

    // 受取API (リクエストボディ版)
    if (pathname === '/api/pickup' && req.method === 'POST') {
        if (!adminEmail) return sendJSON(res, { success: false, error: '認証が必要です' }, 401);
        
        const { orderCode } = body;
        if (!orderCode) return sendJSON(res, { success: false, error: 'orderCodeは必須です' }, 400);
        
        const order = dataStore.orders.find(o => {
            const code = o.orderCode || o.orderId;
            return code && code.toLowerCase() === orderCode.toLowerCase();
        });
        
        if (!order) return sendJSON(res, { success: false, error: '注文番号が見つかりません' }, 404);
        if (order.status !== 'PAID') return sendJSON(res, { success: false, error: 'すでに処理済みです' }, 400);
        
        order.status = 'PICKED';
        order.pickedAt = new Date().toISOString();
        
        addLog('order', 'pickup', { orderCode }, adminEmail);
        saveData(); // データ保存
        sendJSON(res, { success: true, order });
        return;
    }

    // 特例処理API
    if (pathname === '/api/special-cases') {
        if (!adminEmail) return sendJSON(res, { success: false, error: '認証が必要です' }, 401);
        sendJSON(res, { success: true, specialCases: dataStore.special_cases });
        return;
    }

    // 承認待ち管理者
    if (pathname === '/api/admins/pending') {
        if (!adminEmail) return sendJSON(res, { success: false, error: '認証が必要です' }, 401);
        const pending = dataStore.admins.filter(a => !a.approved);
        sendJSON(res, { success: true, admins: pending });
        return;
    }

    // ログAPI
    if (pathname === '/api/logs') {
        if (!adminEmail) return sendJSON(res, { success: false, error: '認証が必要です' }, 401);
        sendJSON(res, { success: true, logs: dataStore.logs.slice(0, 100) });
        return;
    }

    // システム設定API
    if (pathname === '/api/settings') {
        if (!adminEmail) return sendJSON(res, { success: false, error: '認証が必要です' }, 401);
        sendJSON(res, { success: true, settings: dataStore.system_settings });
        return;
    }

    // ビジネスアワーAPI
    if (pathname === '/api/business-hours') {
        sendJSON(res, { 
            success: true, 
            hours: {
                businessDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
                pickup: { start: '11:30', end: '13:30' }
            }
        });
        return;
    }

    // システムメッセージAPI
    if (pathname === '/api/system-message') {
        sendJSON(res, { 
            success: true, 
            message: { enabled: false, type: 'info', title: '', content: '' }
        });
        return;
    }

    // メニュー追加API
    if (pathname === '/api/menu/add' && req.method === 'POST') {
        if (!adminEmail) return sendJSON(res, { success: false, error: '認証が必要です' }, 401);
        
        const menuData = body;
        const menuId = `M${(dataStore.menu_items.length + 1).toString().padStart(3, '0')}`;
        
        const newMenu = {
            id: menuId,
            name: menuData.name,
            price: menuData.price,
            description: menuData.description || '',
            category: menuData.category || 'lunch',
            storeId: menuData.storeId,
            active: true,
            image: menuData.image || '',
            unavailableDates: [],
            unavailableDateRanges: [],
            unavailableWeekdays: [],
            unavailableTimeRanges: [],
            createdAt: new Date().toISOString()
        };
        
        dataStore.menu_items.push(newMenu);
        addLog('menu', 'add', { menuId, name: menuData.name }, adminEmail);
        saveData(); // データ保存
        
        sendJSON(res, { success: true, menu: newMenu });
        return;
    }

    // メニュー更新API
    if (pathname.match(/^\/api\/menu\/(.+)$/) && req.method === 'PUT') {
        if (!adminEmail) return sendJSON(res, { success: false, error: '認証が必要です' }, 401);
        
        const menuId = pathname.split('/')[3];
        const menu = dataStore.menu_items.find(m => m.id === menuId);
        
        if (!menu) return sendJSON(res, { success: false, error: 'メニューが見つかりません' }, 404);
        
        Object.assign(menu, body);
        addLog('menu', 'update', { menuId, changes: Object.keys(body) }, adminEmail);
        saveData(); // データ保存
        
        sendJSON(res, { success: true, menu });
        return;
    }

    // メニュー削除API
    if (pathname.match(/^\/api\/menu\/(.+)$/) && req.method === 'DELETE') {
        if (!adminEmail) return sendJSON(res, { success: false, error: '認証が必要です' }, 401);
        
        const menuId = pathname.split('/')[3];
        const index = dataStore.menu_items.findIndex(m => m.id === menuId);
        
        if (index === -1) return sendJSON(res, { success: false, error: 'メニューが見つかりません' }, 404);
        
        dataStore.menu_items.splice(index, 1);
        addLog('menu', 'delete', { menuId }, adminEmail);
        saveData(); // データ保存
        
        sendJSON(res, { success: true });
        return;
    }

    // メニュー有効/無効切り替えAPI
    if (pathname.match(/^\/api\/menu\/(.+)\/toggle$/) && req.method === 'PATCH') {
        if (!adminEmail) return sendJSON(res, { success: false, error: '認証が必要です' }, 401);
        
        const menuId = pathname.split('/')[3];
        const menu = dataStore.menu_items.find(m => m.id === menuId);
        
        if (!menu) return sendJSON(res, { success: false, error: 'メニューが見つかりません' }, 404);
        
        menu.active = !menu.active;
        addLog('menu', 'toggle', { menuId, active: menu.active }, adminEmail);
        saveData(); // データ保存
        
        sendJSON(res, { success: true, menu });
        return;
    }

    // 店舗追加API
    if (pathname === '/api/stores/add' && req.method === 'POST') {
        if (!adminEmail) return sendJSON(res, { success: false, error: '認証が必要です' }, 401);
        
        const storeData = body;
        const storeId = `S${(dataStore.stores.length + 1).toString().padStart(3, '0')}`;
        
        const newStore = {
            id: storeId,
            name: storeData.name,
            contactPhone: storeData.contactPhone || '',
            active: true,
            createdAt: new Date().toISOString()
        };
        
        dataStore.stores.push(newStore);
        addLog('store', 'add', { storeId, name: storeData.name }, adminEmail);
        saveData(); // データ保存
        
        sendJSON(res, { success: true, store: newStore });
        return;
    }

    // 店舗更新API
    if (pathname.match(/^\/api\/stores\/(.+)$/) && req.method === 'PUT') {
        if (!adminEmail) return sendJSON(res, { success: false, error: '認証が必要です' }, 401);
        
        const storeId = pathname.split('/')[3];
        const store = dataStore.stores.find(s => s.id === storeId);
        
        if (!store) return sendJSON(res, { success: false, error: '店舗が見つかりません' }, 404);
        
        Object.assign(store, body);
        addLog('store', 'update', { storeId, changes: Object.keys(body) }, adminEmail);
        saveData(); // データ保存
        
        sendJSON(res, { success: true, store });
        return;
    }

    // 店舗削除API
    if (pathname.match(/^\/api\/stores\/(.+)$/) && req.method === 'DELETE') {
        if (!adminEmail) return sendJSON(res, { success: false, error: '認証が必要です' }, 401);
        
        const storeId = pathname.split('/')[3];
        const index = dataStore.stores.findIndex(s => s.id === storeId);
        
        if (index === -1) return sendJSON(res, { success: false, error: '店舗が見つかりません' }, 404);
        
        dataStore.stores.splice(index, 1);
        addLog('store', 'delete', { storeId }, adminEmail);
        saveData(); // データ保存
        
        sendJSON(res, { success: true });
        return;
    }

    // ========== 在庫管理API ==========
    
    // 在庫取得API（特定の日付とメニューID）
    if (pathname.match(/^\/api\/inventory\/(.+)\/(.+)$/) && req.method === 'GET') {
        const menuId = pathname.split('/')[3];
        const date = pathname.split('/')[4];
        const inventory = dataStore.inventory[menuId]?.[date] || { total: 0, available: 0, reserved: 0 };
        sendJSON(res, { success: true, inventory });
        return;
    }
    
    // 在庫設定API（管理者のみ）
    if (pathname === '/api/inventory' && req.method === 'POST') {
        if (!adminEmail) return sendJSON(res, { success: false, error: '認証が必要です' }, 401);
        
        const { menuId, date, total } = body;
        if (!menuId || !date || typeof total !== 'number') {
            sendJSON(res, { success: false, error: 'menuId, date, totalは必須です' });
            return;
        }
        
        // 在庫データ初期化
        if (!dataStore.inventory[menuId]) {
            dataStore.inventory[menuId] = {};
        }
        
        const current = dataStore.inventory[menuId][date] || { total: 0, available: 0, reserved: 0 };
        const reserved = current.reserved || 0;
        
        dataStore.inventory[menuId][date] = {
            total: total,
            available: total - reserved,
            reserved: reserved
        };
        
        addLog('inventory', 'set', { menuId, date, total }, adminEmail);
        saveData();
        
        sendJSON(res, { success: true, inventory: dataStore.inventory[menuId][date] });
        return;
    }
    
    // 在庫一覧取得API（管理者のみ）
    if (pathname === '/api/inventory/list' && req.method === 'GET') {
        if (!adminEmail) return sendJSON(res, { success: false, error: '認証が必要です' }, 401);
        
        sendJSON(res, { success: true, inventory: dataStore.inventory });
        return;
    }
    
    // ========== お気に入り機能API ==========
    
    // お気に入り追加API
    if (pathname === '/api/favorites' && req.method === 'POST') {
        const { userId, menuId } = body;
        if (!userId || !menuId) {
            sendJSON(res, { success: false, error: 'userId, menuIdは必須です' });
            return;
        }
        
        if (!dataStore.favorites[userId]) {
            dataStore.favorites[userId] = [];
        }
        
        if (!dataStore.favorites[userId].includes(menuId)) {
            dataStore.favorites[userId].push(menuId);
            addLog('favorite', 'add', { userId, menuId });
            saveData();
        }
        
        sendJSON(res, { success: true, favorites: dataStore.favorites[userId] });
        return;
    }
    
    // お気に入り削除API
    if (pathname.match(/^\/api\/favorites\/(.+)\/(.+)$/) && req.method === 'DELETE') {
        const userId = pathname.split('/')[3];
        const menuId = pathname.split('/')[4];
        
        if (dataStore.favorites[userId]) {
            dataStore.favorites[userId] = dataStore.favorites[userId].filter(id => id !== menuId);
            addLog('favorite', 'remove', { userId, menuId });
            saveData();
        }
        
        sendJSON(res, { success: true, favorites: dataStore.favorites[userId] || [] });
        return;
    }
    
    // お気に入り取得API
    if (pathname.match(/^\/api\/favorites\/(.+)$/) && req.method === 'GET') {
        const userId = pathname.split('/')[3];
        const favorites = dataStore.favorites[userId] || [];
        sendJSON(res, { success: true, favorites });
        return;
    }
    
    // ========== レビュー機能API ==========
    
    // レビュー投稿API
    if (pathname === '/api/reviews' && req.method === 'POST') {
        const { menuId, userId, rating, comment, images } = body;
        if (!menuId || !userId || typeof rating !== 'number') {
            sendJSON(res, { success: false, error: 'menuId, userId, ratingは必須です' });
            return;
        }
        
        if (rating < 1 || rating > 5) {
            sendJSON(res, { success: false, error: '評価は1〜5の範囲で入力してください' });
            return;
        }
        
        const reviewId = `REV-${(dataStore.reviews.length + 1).toString().padStart(4, '0')}`;
        const review = {
            id: reviewId,
            menuId,
            userId,
            rating,
            comment: comment || '',
            images: images || [],
            createdAt: new Date().toISOString()
        };
        
        dataStore.reviews.push(review);
        addLog('review', 'create', { reviewId, menuId, rating });
        saveData();
        
        sendJSON(res, { success: true, review });
        return;
    }
    
    // レビュー取得API（メニューID指定）
    if (pathname.match(/^\/api\/reviews\/menu\/(.+)$/) && req.method === 'GET') {
        const menuId = pathname.split('/')[4];
        const reviews = dataStore.reviews.filter(r => r.menuId === menuId);
        
        // 平均評価を計算
        const avgRating = reviews.length > 0 
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
            : 0;
        
        sendJSON(res, { 
            success: true, 
            reviews, 
            avgRating: Math.round(avgRating * 10) / 10,
            reviewCount: reviews.length 
        });
        return;
    }
    
    // ========== クーポン機能API ==========
    
    // クーポン作成API（管理者のみ）
    if (pathname === '/api/coupons' && req.method === 'POST') {
        if (!adminEmail) return sendJSON(res, { success: false, error: '認証が必要です' }, 401);
        
        const { code, type, value, description, validFrom, validUntil, maxUses } = body;
        if (!code || !type || typeof value !== 'number') {
            sendJSON(res, { success: false, error: 'code, type, valueは必須です' });
            return;
        }
        
        // クーポンコードの重複チェック
        if (dataStore.coupons.find(c => c.code === code)) {
            sendJSON(res, { success: false, error: 'このクーポンコードは既に使用されています' });
            return;
        }
        
        const couponId = `COUPON-${(dataStore.coupons.length + 1).toString().padStart(3, '0')}`;
        const coupon = {
            id: couponId,
            code,
            type, // 'percentage' or 'fixed'
            value,
            description: description || '',
            validFrom: validFrom || new Date().toISOString().split('T')[0],
            validUntil: validUntil || '2099-12-31',
            maxUses: maxUses || 999999,
            usedCount: 0,
            active: true,
            createdAt: new Date().toISOString()
        };
        
        dataStore.coupons.push(coupon);
        addLog('coupon', 'create', { couponId, code, value }, adminEmail);
        saveData();
        
        sendJSON(res, { success: true, coupon });
        return;
    }
    
    // クーポン一覧取得API（管理者のみ）
    if (pathname === '/api/coupons' && req.method === 'GET') {
        if (!adminEmail) return sendJSON(res, { success: false, error: '認証が必要です' }, 401);
        
        sendJSON(res, { success: true, coupons: dataStore.coupons });
        return;
    }
    
    // クーポン適用API
    if (pathname === '/api/coupons/validate' && req.method === 'POST') {
        const { code, amount } = body;
        if (!code || typeof amount !== 'number') {
            sendJSON(res, { success: false, error: 'code, amountは必須です' });
            return;
        }
        
        const coupon = dataStore.coupons.find(c => c.code === code && c.active);
        if (!coupon) {
            sendJSON(res, { success: false, error: '無効なクーポンコードです' });
            return;
        }
        
        // 使用可能期間チェック
        const today = new Date().toISOString().split('T')[0];
        if (today < coupon.validFrom || today > coupon.validUntil) {
            sendJSON(res, { success: false, error: 'このクーポンは使用期限外です' });
            return;
        }
        
        // 使用回数チェック
        if (coupon.usedCount >= coupon.maxUses) {
            sendJSON(res, { success: false, error: 'このクーポンは使用上限に達しています' });
            return;
        }
        
        // 割引額計算
        let discount = 0;
        if (coupon.type === 'percentage') {
            discount = Math.floor(amount * coupon.value / 100);
        } else if (coupon.type === 'fixed') {
            discount = coupon.value;
        }
        
        const finalAmount = Math.max(0, amount - discount);
        
        sendJSON(res, { 
            success: true, 
            coupon: {
                id: coupon.id,
                code: coupon.code,
                description: coupon.description
            },
            originalAmount: amount,
            discount,
            finalAmount
        });
        return;
    }
    
    // ========== ユーザー管理API ==========
    
    // ユーザー登録API
    if (pathname === '/api/users' && req.method === 'POST') {
        const { studentId, name, email, phone, department, grade, allergies } = body;
        if (!studentId || !name || !email) {
            sendJSON(res, { success: false, error: 'studentId, name, emailは必須です' });
            return;
        }
        
        // 学生ID重複チェック
        if (dataStore.users.find(u => u.studentId === studentId)) {
            sendJSON(res, { success: false, error: 'この学生IDは既に登録されています' });
            return;
        }
        
        const userId = `USER-${(dataStore.users.length + 1).toString().padStart(4, '0')}`;
        const user = {
            id: userId,
            studentId,
            name,
            email,
            phone: phone || '',
            department: department || '',
            grade: grade || 1,
            allergies: allergies || [],
            points: 0,
            rank: 'bronze',
            totalOrders: 0,
            createdAt: new Date().toISOString()
        };
        
        dataStore.users.push(user);
        addLog('user', 'register', { userId, studentId, name });
        saveData();
        
        sendJSON(res, { success: true, user });
        return;
    }
    
    // ユーザー情報取得API
    if (pathname.match(/^\/api\/users\/(.+)$/) && req.method === 'GET') {
        const studentId = pathname.split('/')[3];
        const user = dataStore.users.find(u => u.studentId === studentId);
        
        if (!user) {
            sendJSON(res, { success: false, error: 'ユーザーが見つかりません' }, 404);
            return;
        }
        
        // 注文履歴を取得
        const orders = dataStore.orders.filter(o => o.userId === user.id);
        
        sendJSON(res, { success: true, user, orders });
        return;
    }
    
    // 管理者承認API
    if (pathname.match(/^\/api\/admin\/approve\/(.+)$/) && req.method === 'POST') {
        if (!adminEmail) return sendJSON(res, { success: false, error: '認証が必要です' }, 401);
        
        const adminId = parseInt(pathname.split('/')[4]);
        const admin = dataStore.admins.find(a => a.id === adminId);
        
        if (!admin) return sendJSON(res, { success: false, error: '管理者が見つかりません' }, 404);
        
        admin.approved = true;
        addLog('admin', 'approve', { adminId, email: admin.email }, adminEmail);
        saveData(); // データ保存
        
        sendJSON(res, { success: true });
        return;
    }

    // 404
    sendJSON(res, { success: false, error: 'API not found' }, 404);
}

// 静的ファイルサーバー
function serveStaticFile(res, filePath) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('404 Not Found');
            return;
        }
        
        const ext = path.extname(filePath);
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

// メインサーバー
const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname;
    
    console.log(`${req.method} ${pathname}`);
    
    // CORS対応
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // APIリクエスト
    if (pathname.startsWith('/api/')) {
        const body = await parseBody(req);
        await handleAPI(req, res, pathname, body);
        return;
    }
    
    // 静的ファイル
    let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
    
    // ファイルが存在するか確認
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        serveStaticFile(res, filePath);
    } else {
        res.writeHead(404);
        res.end('404 Not Found');
    }
});

// サーバー起動
server.listen(PORT, () => {
    console.log('');
    console.log('='.repeat(60));
    console.log('🍱 弁当予約システム起動しました');
    console.log('='.repeat(60));
    console.log('');
    console.log(`   URL: http://localhost:${PORT}`);
    console.log('');
    console.log('   管理者ログイン情報:');
    console.log('   Email: admin@example.com');
    console.log('   Password: admin123');
    console.log('');
    console.log('   Ctrl+C で終了');
    console.log('');
    console.log('='.repeat(60));
    console.log('');
});

// 終了処理
process.on('SIGINT', () => {
    console.log('\n\nサーバーを停止しています...');
    server.close(() => {
        console.log('サーバーが停止しました');
        process.exit(0);
    });
});
