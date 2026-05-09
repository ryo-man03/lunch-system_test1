import './error-handler.js';
/**
 * メインアプリケーション
 */
import { ApiClient } from './api.js';
import { AuthUI } from './auth.js';
import { AdminUI } from './admin.js';
import { UserUI } from './user.js';

class LunchApp {
    constructor() {
        this.api = new ApiClient();
        this.authUI = new AuthUI(this.api, this);
        this.adminUI = new AdminUI(this.api, this);
        this.userUI = new UserUI(this.api, this);
        
        this.currentView = 'mode-select';
        this.currentUser = null;
        this.pendingEmail = null;
        this.pendingCode = null;
        
        this.init();
    }

    async init() {
        // 初期ローディング表示
        const appElement = document.getElementById('app');
        if (appElement) {
            appElement.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f3f4f6;">
                    <div style="text-align: center;">
                        <div style="font-size: 64px; margin-bottom: 20px;">🍱</div>
                        <h2 style="color: #374151; margin-bottom: 10px;">大学弁当予約システム</h2>
                        <p style="color: #6b7280;">読み込み中...</p>
                    </div>
                </div>
            `;
        }
        
        try {
            console.log('🚀 アプリケーションを初期化中...');
            // セッションチェック
            const session = await this.api.checkSession();
            console.log('✅ セッションチェック完了:', session);
            
            if (session.authenticated) {
                this.currentUser = session.admin;
                this.showDashboard();
            } else {
                this.showModeSelect();
            }
            
            console.log('✅ 初期化完了');
        } catch (error) {
            console.error('❌ 初期化エラー:', error);
            // エラー時もモード選択画面を表示
            try {
                this.showModeSelect();
            } catch (fallbackError) {
                console.error('❌ フォールバック初期化も失敗:', fallbackError);
                // 最後の手段: 直接HTMLを表示
                const appElement = document.getElementById('app');
                if (appElement) {
                    appElement.innerHTML = `
                        <div style="padding: 40px; text-align: center; font-family: sans-serif;">
                            <h1 style="color: #ef4444;">❌ エラーが発生しました</h1>
                            <p style="color: #6b7280; margin: 20px 0;">アプリケーションの起動に失敗しました。</p>
                            <button onclick="location.reload()" style="padding: 12px 24px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer;">
                                ページを再読み込み
                            </button>
                        </div>
                    `;
                }
            }
        }
    }
    


    render(html) {
        const appElement = document.getElementById('app');
        
        if (!appElement) {
            console.error('❌ アプリケーションコンテナが見つかりません');
            return;
        }
        
        try {
            appElement.innerHTML = html;
            
            // ボトムナビゲーションを表示する画面でbodyクラスを追加
            const viewsWithBottomNav = [
                'dashboard', 'counter', 'pickup', 'logs', 'logs-filtered',
                'reports', 'settings', 'menu-management', 'store-management',
                'user-home', 'cancel-search'
            ];
            
            if (viewsWithBottomNav.includes(this.currentView)) {
                document.body.classList.add('has-bottom-nav');
            } else {
                document.body.classList.remove('has-bottom-nav');
            }
            
            // ローディング状態を解除
            document.body.classList.remove('loading');
        } catch (error) {
            console.error('❌ 画面描画エラー:', error);
            appElement.innerHTML = `
                <div class="error-container" style="padding: 40px; text-align: center;">
                    <h2 style="color: #ef4444;">❌ 画面の表示に失敗しました</h2>
                    <p style="color: #6b7280; margin: 20px 0;">エラー: ${error.message}</p>
                    <button onclick="location.reload()" class="button">
                        ページを再読み込み
                    </button>
                </div>
            `;
        }
    }

    async renderCurrentView() {
        // ローディング表示
        document.body.classList.add('loading');
        const appElement = document.getElementById('app');
        if (appElement) {
            appElement.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; min-height: 100vh;">
                    <div style="text-align: center;">
                        <div class="loading" style="font-size: 48px; margin-bottom: 20px;">🔄</div>
                        <p style="color: #6b7280;">読み込み中...</p>
                    </div>
                </div>
            `;
        }
        
        let html = '';
        
        try {
            switch(this.currentView) {
            case 'mode-select':
                html = this.renderModeSelect();
                break;
            case 'login':
                html = this.authUI.renderLogin();
                break;
            case 'register':
                html = this.authUI.renderRegistration();
                break;
            case 'verify':
                html = this.authUI.renderVerification(this.pendingEmail, this.pendingCode);
                break;
            case 'dashboard':
                html = await this.adminUI.renderDashboard();
                break;
            case 'counter':
                html = this.adminUI.renderCounter();
                break;
            case 'pickup':
                html = this.adminUI.renderPickup();
                break;
            case 'user-home':
                html = await this.userUI.renderHome();
                break;
            case 'user-order':
                html = this.userUI.renderOrder(this.orderCode, this.orderData);
                break;
            case 'cancel-search':
                html = this.userUI.renderCancelSearch();
                break;
            case 'logs':
                html = await this.adminUI.renderLogs();
                break;
            case 'logs-filtered':
                html = await this.adminUI.renderLogsFiltered(this.currentLogType);
                break;
            case 'advanced-settings':
                html = await this.adminUI.renderAdvancedSettings();
                break;
            case 'orders-by-store':
                html = await this.adminUI.renderOrdersByStore();
                break;
            case 'all-orders':
                html = await this.adminUI.renderAllOrders();
                break;
            case 'order-search':
                html = await this.adminUI.renderOrderSearch();
                break;
            case 'special-cases':
                html = await this.adminUI.renderSpecialCases();
                break;
            case 'data-management':
                html = await this.adminUI.renderDataManagement();
                break;
            case 'daily-summary':
                html = await this.adminUI.renderDailySummary();
                break;
            case 'daily-close':
                html = await this.adminUI.renderDailyClose();
                break;
            case 'unpicked-alerts':
                html = await this.adminUI.renderUnpickedAlerts();
                break;
            case 'bulk-operations':
                html = await this.adminUI.renderBulkOperations();
                break;
            case 'analytics':
                html = await this.adminUI.renderAnalytics();
                break;
            case 'qr-generator':
                html = await this.adminUI.renderQRCodeGenerator();
                break;
            }
            
            this.render(html);
        } catch (error) {
            console.error('❌ 画面生成エラー:', error);
            document.body.classList.remove('loading');
            
            this.render(`
                <div class="error-container" style="padding: 40px; text-align: center;">
                    <h2 style="color: #ef4444;">❌ 画面の生成に失敗しました</h2>
                    <p style="color: #6b7280; margin: 20px 0;">
                        画面: ${this.currentView}<br>
                        エラー: ${error.message}
                    </p>
                    <button onclick="app.showModeSelect()" class="button" style="margin-right: 10px;">
                        ホームに戻る
                    </button>
                    <button onclick="location.reload()" class="button secondary">
                        再読み込み
                    </button>
                </div>
            `);
        }
    }

    renderModeSelect() {
        return `
            <div class="login-container">
                <div class="login-box" style="max-width: 500px;">
                    <h1 style="text-align: center; font-size: 32px; margin-bottom: 10px;">
                        🍱 Lunch Management
                    </h1>
                    <p style="text-align: center; color: #6b7280; margin-bottom: 30px;">
                        弁当予約システム
                    </p>
                    
                    <div class="mode-selector">
                        <div class="mode-card" onclick="app.showUserHome()">
                            <h3>👨‍🎓 学生として注文</h3>
                            <p>弁当を注文して注文番号を取得</p>
                        </div>
                        
                        <div class="mode-card" onclick="app.showLogin()">
                            <h3>🔐 管理者としてログイン</h3>
                            <p>窓口業務・受取業務・システム管理</p>
                        </div>
                    </div>
                    
                    <div class="info-box">
                        <strong>💡 システムの流れ:</strong><br>
                        1. 学生が弁当を注文して注文番号を取得<br>
                        2. 窓口で決済<br>
                        3. 注文番号で弁当を受け取る
                    </div>
                </div>
            </div>
        `;
    }

    // ビュー切り替えメソッド
    showModeSelect() {
        this.currentView = 'mode-select';
        this.renderCurrentView();
    }

    showLogin() {
        this.currentView = 'login';
        this.renderCurrentView();
    }

    showRegistration() {
        this.currentView = 'register';
        this.renderCurrentView();
    }

    showVerification(email, code) {
        this.pendingEmail = email;
        this.pendingCode = code;
        this.currentView = 'verify';
        this.renderCurrentView();
    }

    showDashboard() {
        if (!this.currentUser) {
            console.warn('⚠️ 認証が必要です');
            this.showLogin();
            return;
        }
        this.currentView = 'dashboard';
        this.renderCurrentView();
        // キーボードショートカットは管理者向けに無効化しました
    }

    showCounter() {
        if (!this.currentUser) {
            console.warn('⚠️ 認証が必要です');
            this.showLogin();
            return;
        }
        this.currentView = 'counter';
        this.renderCurrentView();
    }

    showPickup() {
        if (!this.currentUser) {
            console.warn('⚠️ 認証が必要です');
            this.showLogin();
            return;
        }
        this.currentView = 'pickup';
        this.renderCurrentView();
    }

    // キーボードショートカット機能は削除しました

    showOrdersByStore() {
        this.currentView = 'orders-by-store';
        this.renderCurrentView();
    }
    
    showAllOrders() {
        this.currentView = 'all-orders';
        this.renderCurrentView();
    }
    
    showOrderSearch() {
        this.currentView = 'order-search';
        this.renderCurrentView();
    }
    
    showSpecialCases() {
        this.currentView = 'special-cases';
        this.renderCurrentView();
    }
    
    showDataManagement() {
        this.currentView = 'data-management';
        this.renderCurrentView();
    }

    showUserHome() {
        this.currentView = 'user-home';
        this.renderCurrentView();
    }

    showOrder(orderCode, orderData) {
        this.orderCode = orderCode;
        this.orderData = orderData;
        this.currentView = 'user-order';
        this.renderCurrentView();
    }

    showCancelSearch() {
        this.currentView = 'cancel-search';
        this.renderCurrentView();
    }

    // イベントハンドラー
    async handleLogin() {
        await this.authUI.handleLogin();
    }

    async handleLogout() {
        await this.api.logout();
        // キーボードリスナーが残っていれば解除しておく
        try {
            if (this._keyboardHandler) {
                document.removeEventListener('keydown', this._keyboardHandler);
                this._keyboardHandler = null;
            }
        } catch (e) {
            console.warn('キーボードリスナー解除中にエラー:', e);
        }
        this.currentUser = null;
        this.showModeSelect();
    }

    async handleRegister() {
        await this.authUI.handleRegister();
    }

    async handleVerify() {
        await this.authUI.handleVerify();
    }

    async handleApprove(adminId) {
        await this.adminUI.handleApprove(adminId);
    }

    async handleReject(adminId) {
        await this.adminUI.handleReject(adminId);
    }

    async handleSearchOrder() {
        await this.adminUI.handleSearchOrder();
    }

    async handlePayment(orderCode) {
        await this.adminUI.handlePayment(orderCode);
    }

    async processPaymentWithMethod(orderCode, paymentMethod) {
        await this.adminUI.processPaymentWithMethod(orderCode, paymentMethod);
    }

    async handleSearchOrdersByRange() {
        await this.adminUI.handleSearchOrdersByRange();
    }

    async handlePickupComplete(orderCode) {
        await this.adminUI.handlePickupComplete(orderCode);
    }

    addToCartById(menuId) {
        this.userUI.addToCartById(menuId);
    }

    addToCart(item) {
        this.userUI.addToCart(item);
    }

    removeFromCart(index) {
        this.userUI.removeFromCart(index);
    }
    
    increaseCartItem(index) {
        this.userUI.increaseCartItem(index);
    }
    
    decreaseCartItem(index) {
        this.userUI.decreaseCartItem(index);
    }

    async submitOrder() {
        await this.userUI.submitOrder();
    }

    newOrder() {
        this.userUI.newOrder();
    }

    async copyOrderCode(orderCode) {
        await this.userUI.copyOrderCode(orderCode);
    }

    async searchOrderForCancel(code) {
        await this.userUI.searchOrderForCancel(code);
    }

    async confirmCancelOrder(orderCode) {
        await this.userUI.confirmCancelOrder(orderCode);
    }
    
    async applyCoupon() {
        await this.userUI.applyCoupon();
    }

    // 管理機能ハンドラー
    async handleSaveSystemMessage() {
        await this.adminUI.handleSaveSystemMessage();
    }

    async handleSaveBusinessHours() {
        await this.adminUI.handleSaveBusinessHours();
    }

    async handleAddMenu() {
        await this.adminUI.handleAddMenu();
    }

    async handleEditMenu(menuId) {
        await this.adminUI.handleEditMenu(menuId);
    }

    async handleDeleteMenu(menuId) {
        await this.adminUI.handleDeleteMenu(menuId);
    }

    async handleToggleMenuActive(menuId) {
        await this.adminUI.handleToggleMenuActive(menuId);
    }

    async handleAddStore() {
        await this.adminUI.handleAddStore();
    }

    async handleEditStore(storeId) {
        await this.adminUI.handleEditStore(storeId);
    }

    async handleDeleteStore(storeId) {
        await this.adminUI.handleDeleteStore(storeId);
    }

    async handleToggleStoreActive(storeId) {
        await this.adminUI.handleToggleStoreActive(storeId);
    }

    async showSettings() {
        this.currentView = 'settings';
        const html = await this.adminUI.renderSettings();
        this.render(html);
    }

    async showReports() {
        this.currentView = 'reports';
        const html = await this.adminUI.renderReports();
        this.render(html);
    }

    async showMenuManagement() {
        this.currentView = 'menu-management';
        const html = await this.adminUI.renderMenuManagement();
        this.render(html);
    }

    async showStoreManagement() {
        this.currentView = 'store-management';
        const html = await this.adminUI.renderStoreManagement();
        this.render(html);
    }

    async showStoreNotifications() {
        this.currentView = 'store-notifications';
        const html = await this.adminUI.renderStoreNotifications();
        this.render(html);
    }

    async showLogs(type = null) {
        if (type) {
            this.currentView = 'logs-filtered';
            this.currentLogType = type;
            const html = await this.adminUI.renderLogsFiltered(type);
            this.render(html);
        } else {
            this.currentView = 'logs';
            const html = await this.adminUI.renderLogs();
            this.render(html);
        }
    }
    
    showCancelSearch() {
        this.currentView = 'cancel-search';
        this.renderCurrentView();
    }
    
    async searchOrderForCancel(code) {
        await this.userUI.searchOrderForCancel(code);
    }
    
    async confirmCancelOrder(orderCode) {
        await this.userUI.confirmCancelOrder(orderCode);
    }
    
    printReport() {
        this.adminUI.printReport();
    }
    
    showAdvancedSettings() {
        this.currentView = 'advanced-settings';
        this.renderCurrentView();
    }
    
    async saveCancelPolicy() {
        await this.adminUI.saveCancelPolicy();
    }
    
    async addSpecialDay() {
        await this.adminUI.addSpecialDay();
    }
    
    async deleteSpecialDay(date) {
        await this.adminUI.deleteSpecialDay(date);
    }
    
    async cleanupData() {
        await this.adminUI.cleanupData();
    }
    
    async applySpecialDiscount() {
        const orderCode = document.getElementById('discountOrderCode').value;
        const discountAmount = parseInt(document.getElementById('discountAmount').value);
        const reason = document.getElementById('discountReason').value;
        
        if (!orderCode || !discountAmount || !reason) {
            alert('全ての項目を入力してください');
            return;
        }
        
        const result = await this.api.applyDiscount(orderCode, discountAmount, reason);
        
        if (result.success) {
            alert('割引を適用しました');
            this.renderCurrentView();
        } else {
            alert(`エラー: ${result.error}`);
        }
    }
    
    async addCustomerNote() {
        const orderCode = document.getElementById('noteOrderCode').value;
        const note = document.getElementById('noteContent').value;
        
        if (!orderCode || !note) {
            alert('全ての項目を入力してください');
            return;
        }
        
        const result = await this.api.addCustomerNote(orderCode, note);
        
        if (result.success) {
            alert('メモを追加しました');
            this.renderCurrentView();
        } else {
            alert(`エラー: ${result.error}`);
        }
    }

    // 汎用プレースホルダ画面を表示（未実装機能の一時遷移先）
    showPlaceholder(name, title) {
        this.currentView = name || 'placeholder';
        var t = title || name || '未実装の画面';
        var html = `
            <div class="header">
                <div class="header-content">
                    <div class="header-title">${t}</div>
                    <button onclick="app.showDashboard()">ダッシュボードに戻る</button>
                </div>
            </div>
            <div class="container">
                <div class="card">
                    <div class="card-header">${t}</div>
                    <div style="padding:18px; color:#374151;">
                        この画面はまだ実装されていません。開発中の代替表示です。
                    </div>
                </div>
            </div>
        `;
        this.render(html);
    }

    // 以下はダッシュボードから呼ばれる画面遷移メソッド
    async showOrderCodeLookup() { this.currentView = 'order-code-lookup'; const html = await this.adminUI.renderOrderCodeLookup(); this.render(html); }
    async showRegisterCashOrder() { this.currentView = 'register-cash-order'; const html = await this.adminUI.renderRegisterCashOrder(); this.render(html); }
    async showTodayOrders() { this.currentView = 'today-orders'; const html = await this.adminUI.renderTodayOrders(); this.render(html); }
    async showPastOrderHistory() { this.currentView = 'past-orders'; const html = await this.adminUI.renderPastOrderHistory(); this.render(html); }
    async showMenuAdd() { this.currentView = 'menu-add'; const html = await this.adminUI.renderMenuAdd(); this.render(html); }
    async showMenuPricing() { this.currentView = 'menu-pricing'; const html = await this.adminUI.renderMenuPricing(); this.render(html); }
    async showStoreSettings() { this.currentView = 'store-settings'; const html = await this.adminUI.renderStoreSettings(); this.render(html); }
    async showStoreContact(storeId) { this.currentView = 'store-contact'; const html = await this.adminUI.renderStoreContact(storeId); this.render(html); }
    
    showDailySummary() {
        this.currentView = 'daily-summary';
        this.renderCurrentView();
    }
    
    showDailyClose() {
        this.currentView = 'daily-close';
        this.renderCurrentView();
    }
    
    showUnpickedAlerts() {
        this.currentView = 'unpicked-alerts';
        this.renderCurrentView();
    }
    
    showBulkOperations() {
        this.currentView = 'bulk-operations';
        this.renderCurrentView();
    }
    
    showAnalytics() {
        this.currentView = 'analytics';
        this.renderCurrentView();
    }
    
    showQRCodeGenerator() {
        this.currentView = 'qr-generator';
        this.renderCurrentView();
    }
    
    async bulkPickupComplete() {
        const checks = document.querySelectorAll('.bulk-pickup-check:checked');
        const orderCodes = Array.from(checks).map(c => c.value);
        
        if (orderCodes.length === 0) {
            alert('注文を選択してください');
            return;
        }
        
        if (!confirm(`${orderCodes.length}件の注文を一括受取完了しますか？`)) return;
        
        let success = 0;
        for (const code of orderCodes) {
            const result = await this.api.completePickup(code);
            if (result.success) success++;
        }
        
        alert(`${success}/${orderCodes.length}件の受取処理が完了しました`);
        this.renderCurrentView();
    }
    
    async bulkUpdatePrice() {
        const menuId = document.getElementById('bulkPriceMenuId').value;
        const newPrice = parseInt(document.getElementById('bulkNewPrice').value);
        const reason = document.getElementById('bulkPriceReason').value;
        
        if (!menuId || !newPrice || !reason) {
            alert('全ての項目を入力してください');
            return;
        }
        
        if (!confirm(`価格を¥${newPrice}に変更しますか？`)) return;
        
        // 価格更新（ログ記録）
        alert('価格変更機能は実装中です');
    }
    
    async bulkSetClosed() {
        const menuId = document.getElementById('bulkClosedMenuId').value;
        const start = document.getElementById('bulkClosedStart').value;
        const end = document.getElementById('bulkClosedEnd').value;
        const reason = document.getElementById('bulkClosedReason').value;
        
        if (!menuId || !start || !end) {
            alert('必須項目を入力してください');
            return;
        }
        
        if (!confirm(`${start}〜${end}を休業日に設定しますか？`)) return;
        
        alert('休業日設定機能は実装中です');
    }
    
    async bulkSetWeekdays() {
        const menuId = document.getElementById('bulkWeekdayMenuId').value;
        const checks = document.querySelectorAll('.weekday-check:checked');
        const weekdays = Array.from(checks).map(c => c.value);
        
        if (!menuId || weekdays.length === 0) {
            alert('メニューと曜日を選択してください');
            return;
        }
        
        if (!confirm(`営業曜日を設定しますか？`)) return;
        
        alert('曜日設定機能は実装中です');
    }
    
    async handleRefund(orderCode) {
        const reason = prompt('返金理由を入力してください:');
        if (!reason) return;
        
        if (!confirm(`注文${orderCode}を返金処理しますか？`)) return;
        
        alert('返金処理機能は実装中です');
    }
    
    async processRefund() {
        const orderCode = document.getElementById('refundOrderCode').value;
        const reason = document.getElementById('refundReason').value;
        
        if (!orderCode || !reason) {
            alert('全ての項目を入力してください');
            return;
        }
        
        if (!confirm(`注文${orderCode}を返金処理しますか？`)) return;
        
        alert('返金処理機能は実装中です');
    }
    
    async completeDailyClose() {
        const checks = ['check1', 'check2', 'check3', 'check4'];
        const allChecked = checks.every(id => document.getElementById(id)?.checked);
        
        if (!allChecked) {
            alert('全てのチェック項目を確認してください');
            return;
        }
        
        if (!confirm('本日の締め処理を完了しますか？')) return;
        
        alert('✅ 締め処理が完了しました\n\nお疲れ様でした！');
        this.showDashboard();
    }
    
    generateQRCode() {
        const type = document.getElementById('qrType').value;
        const content = document.getElementById('qrContent').value;
        const size = document.getElementById('qrSize').value;
        
        if (!content) {
            alert('コードまたはURLを入力してください');
            return;
        }
        
        const qrData = type === 'url' ? content : `${type.toUpperCase()}: ${content}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(qrData)}`;
        
        document.getElementById('qrCodeImage').innerHTML = `<img src="${qrUrl}" alt="QR Code">`;
        document.getElementById('qrCodeText').textContent = content;
        document.getElementById('qrResult').style.display = 'block';
    }
    
    downloadQRCode() {
        const img = document.querySelector('#qrCodeImage img');
        if (!img) return;
        
        const link = document.createElement('a');
        link.href = img.src;
        link.download = `qrcode_${Date.now()}.png`;
        link.click();
    }
    
    printQRCode() {
        window.print();
    }
    
    // ==================== フィルター機能 ====================
    
    applyOrderFilters() {
        const filterDate = document.getElementById('filter-date')?.value || '';
        const filterOrderCode = document.getElementById('filter-order-code')?.value.toLowerCase() || '';
        const filterStore = document.getElementById('filter-store')?.value || '';
        const filterStatus = document.getElementById('filter-status')?.value || '';
        const filterMinAmount = parseInt(document.getElementById('filter-min-amount')?.value) || 0;
        const filterMaxAmount = parseInt(document.getElementById('filter-max-amount')?.value) || Infinity;
        
        const tbody = document.getElementById('orders-tbody');
        if (!tbody) return;
        
        const rows = tbody.querySelectorAll('tr');
        let visibleCount = 0;
        
        rows.forEach(row => {
            const date = row.dataset.date || '';
            const orderCode = (row.dataset.orderCode || '').toLowerCase();
            const storeIds = (row.dataset.storeIds || '').split(',');
            const status = row.dataset.status || '';
            const amount = parseInt(row.dataset.amount) || 0;
            
            let visible = true;
            
            // 日付フィルター
            if (filterDate && date !== filterDate) {
                visible = false;
            }
            
            // 注文番号フィルター（部分一致）
            if (filterOrderCode && !orderCode.includes(filterOrderCode)) {
                visible = false;
            }
            
            // 店舗フィルター
            if (filterStore && !storeIds.includes(filterStore)) {
                visible = false;
            }
            
            // 状態フィルター
            if (filterStatus && status !== filterStatus) {
                visible = false;
            }
            
            // 金額範囲フィルター
            if (amount < filterMinAmount || amount > filterMaxAmount) {
                visible = false;
            }
            
            row.style.display = visible ? '' : 'none';
            if (visible) visibleCount++;
        });
        
        // カウント更新
        const countElem = document.getElementById('order-count');
        if (countElem) {
            const totalCount = rows.length;
            countElem.textContent = visibleCount === totalCount ? 
                `全${totalCount}件` : 
                `${visibleCount}件（全${totalCount}件中）`;
        }
    }
    
    clearOrderFilters() {
        const filterInputs = [
            'filter-date',
            'filter-order-code',
            'filter-store',
            'filter-status',
            'filter-min-amount',
            'filter-max-amount'
        ];
        
        filterInputs.forEach(id => {
            const elem = document.getElementById(id);
            if (elem) {
                if (elem.tagName === 'SELECT') {
                    elem.selectedIndex = 0;
                } else {
                    elem.value = '';
                }
            }
        });
        
        this.applyOrderFilters();
    }
    
    // メニューフィルター
    applyMenuFilters() {
        const filterStore = document.getElementById('filter-menu-store')?.value || '';
        const filterStatus = document.getElementById('filter-menu-status')?.value || '';
        const filterMin = parseInt(document.getElementById('filter-menu-min')?.value) || 0;
        const filterMax = parseInt(document.getElementById('filter-menu-max')?.value) || Infinity;
        const filterName = document.getElementById('filter-menu-name')?.value.toLowerCase() || '';
        
        const container = document.getElementById('menu-items-container');
        if (!container) return;
        
        const items = container.querySelectorAll('.menu-item-card');
        let visibleCount = 0;
        
        items.forEach(item => {
            const storeId = item.dataset.storeId || '';
            const status = item.dataset.active || '';
            const price = parseInt(item.dataset.price) || 0;
            const name = item.dataset.menuName || '';
            
            let visible = true;
            
            if (filterStore && storeId !== filterStore) visible = false;
            if (filterStatus && status !== filterStatus) visible = false;
            if (price < filterMin || price > filterMax) visible = false;
            if (filterName && !name.includes(filterName)) visible = false;
            
            item.style.display = visible ? '' : 'none';
            if (visible) visibleCount++;
        });
    }
    
    clearMenuFilters() {
        ['filter-menu-store', 'filter-menu-status', 'filter-menu-min', 'filter-menu-max', 'filter-menu-name'].forEach(id => {
            const elem = document.getElementById(id);
            if (elem) {
                if (elem.tagName === 'SELECT') {
                    elem.selectedIndex = 0;
                } else {
                    elem.value = '';
                }
            }
        });
        this.applyMenuFilters();
    }
    
    // ログフィルター
    applyLogFilters() {
        const filterType = document.getElementById('filter-log-type')?.value || '';
        const filterAction = document.getElementById('filter-log-action')?.value || '';
        const filterDate = document.getElementById('filter-log-date')?.value || '';
        const filterKeyword = document.getElementById('filter-log-keyword')?.value.toLowerCase() || '';
        
        const container = document.getElementById('logs-container');
        if (!container) return;
        
        const items = container.querySelectorAll('.log-item');
        let visibleCount = 0;
        
        items.forEach(item => {
            const type = item.dataset.logType || '';
            const action = item.dataset.logAction || '';
            const date = item.dataset.logDate || '';
            const text = item.dataset.logText || '';
            
            let visible = true;
            
            if (filterType && type !== filterType) visible = false;
            if (filterAction && action !== filterAction) visible = false;
            if (filterDate && date !== filterDate) visible = false;
            if (filterKeyword && !text.includes(filterKeyword)) visible = false;
            
            item.style.display = visible ? '' : 'none';
            if (visible) visibleCount++;
        });
        
        const countElem = document.getElementById('log-count');
        if (countElem) {
            const totalCount = items.length;
            countElem.textContent = visibleCount === totalCount ? 
                `全${totalCount}件` : 
                `${visibleCount}件（全${totalCount}件中）`;
        }
    }
    
    clearLogFilters() {
        ['filter-log-type', 'filter-log-action', 'filter-log-date', 'filter-log-keyword'].forEach(id => {
            const elem = document.getElementById(id);
            if (elem) {
                if (elem.tagName === 'SELECT') {
                    elem.selectedIndex = 0;
                } else {
                    elem.value = '';
                }
            }
        });
        this.applyLogFilters();
    }
    
    quickFilterLogs(type) {
        document.getElementById('filter-log-type').value = type || '';
        this.applyLogFilters();
    }
}

// グローバルアプリインスタンス
try {
    console.log('🚀 LunchAppを起動中...');
    
    // 既存のwindow.appメソッドを保存（admin.jsで定義された関数など）
    const existingAppMethods = window.app || {};
    
    // LunchAppインスタンスを作成
    const lunchApp = new LunchApp();
    
    // 既存のメソッドを新しいインスタンスにマージ
    Object.keys(existingAppMethods).forEach(key => {
        if (typeof existingAppMethods[key] === 'function' && !lunchApp[key]) {
            lunchApp[key] = existingAppMethods[key];
        }
    });
    
    window.app = lunchApp;
    console.log('✅ アプリケーションが起動しました');

    // 未実装の show* ハンドラをインスタンスに注入してクリック時の例外を防ぐ
    (function(){
        try{
            var names = [
                'showOrderCodeLookup','showRegisterCashOrder','showTodayOrders','showPastOrderHistory',
                'showAllOrders','showOrdersByStore','showOrderSearch','showUnpickedAlerts',
                'showDailyClose','showDailySummary','showMenuManagement','showMenuAdd',
                'showMenuPricing','showQRCodeGenerator','showBulkOperations','showStoreManagement',
                'showStoreSettings','showStoreContact','showSettings','showLogs',
                'showAnalytics','showDataManagement','showSpecialCases','showAdvancedSettings',
                'showReports','showCounter','showPickup','showStoreNotifications'
            ];
            names.forEach(function(n){
                if(window.app && typeof window.app[n] !== 'function'){
                    window.app[n] = function(){
                        try{
                            console.warn('呼び出された未実装ハンドラ: ' + n);
                            if(typeof window.app.showPlaceholder === 'function'){
                                window.app.showPlaceholder(n);
                                return;
                            }
                            // 既存の #content 等へ通知表示
                            var el = document.getElementById('content') || document.getElementById('main') || document.body;
                            var msg = document.createElement('div');
                            msg.style.padding = '16px'; msg.style.background = '#fff3cd'; msg.style.border = '1px solid #ffeeba';
                            msg.style.borderRadius = '6px'; msg.style.margin = '12px';
                            msg.textContent = '[' + n + '] は未実装の機能です。';
                            el.insertBefore(msg, el.firstChild);
                            setTimeout(function(){ try{ msg.parentNode && msg.parentNode.removeChild(msg); }catch(e){} }, 3000);
                        }catch(e){ console.error('stub handler error', e); }
                    };
                }
            });
        }catch(e){ console.error('inject stubs error', e); }
    })();
} catch (error) {
    console.error('❌ アプリケーション起動エラー:', error);
    
    // エラー画面を表示
    const appElement = document.getElementById('app');
    if (appElement) {
        appElement.innerHTML = `
            <div style="padding: 40px; text-align: center; font-family: sans-serif; background: #f3f4f6; min-height: 100vh; display: flex; align-items: center; justify-content: center;">
                <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 600px;">
                    <h1 style="color: #ef4444; margin-bottom: 20px; font-size: 28px;">❌ エラーが発生しました</h1>
                    <p style="color: #6b7280; margin: 20px 0; font-size: 16px;">アプリケーションの起動に失敗しました。</p>
                    <details style="text-align: left; margin: 20px 0; padding: 16px; background: #f9fafb; border-radius: 8px;">
                        <summary style="cursor: pointer; color: #374151; font-weight: 600;">エラー詳細</summary>
                        <pre style="margin-top: 12px; padding: 12px; background: #1f2937; color: #f3f4f6; border-radius: 6px; overflow: auto; font-size: 12px;">${error.message}\n\n${error.stack || ''}</pre>
                    </details>
                    <div style="display: flex; gap: 12px; justify-content: center;">
                        <button onclick="location.reload()" style="padding: 12px 24px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: 600;">
                            🔄 ページを再読み込み
                        </button>
                        <button onclick="localStorage.clear(); location.reload()" style="padding: 12px 24px; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: 600;">
                            🗑️ キャッシュをクリア
                        </button>
                    </div>
                    <p style="color: #9ca3af; margin-top: 20px; font-size: 14px;">問題が解決しない場合は、ブラウザのコンソール（F12）を開いてエラーを確認してください。</p>
                </div>
            </div>
        `;
    } else {
        // app要素も見つからない場合
        document.body.innerHTML = `
            <div style="padding: 40px; text-align: center; font-family: sans-serif;">
                <h1 style="color: #ef4444;">❌ 重大なエラー</h1>
                <p style="color: #6b7280; margin: 20px 0;">アプリケーションコンテナが見つかりません。</p>
                <button onclick="location.reload()" style="padding: 12px 24px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer;">
                    再読み込み
                </button>
            </div>
        `;
    }
}
