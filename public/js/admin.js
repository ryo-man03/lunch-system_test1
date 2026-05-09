// グループ折りたたみトグル（クリックで内部メニューを表示/非表示）+ LocalStorage保存
(function(){
    var app = window.app || {};
    
    // トーストメッセージシステム
    app.showToast = function(message, type = 'info', duration = 3000){
        try{
            const toast = document.createElement('div');
            toast.className = 'toast toast-' + type;
            const icons = {success: '✓', error: '✕', warning: '⚠', info: 'ℹ'};
            toast.innerHTML = '<span class="toast-icon">' + (icons[type] || icons.info) + '</span><span>' + message + '</span>';
            document.body.appendChild(toast);
            setTimeout(() => toast.classList.add('toast-show'), 10);
            setTimeout(() => {
                toast.classList.remove('toast-show');
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }catch(e){
            console.error('showToast error', e);
        }
    };
    
    // ローディングオーバーレイ
    app.showLoading = function(message = '処理中...'){
        try{
            let overlay = document.getElementById('loading-overlay');
            if(!overlay){
                overlay = document.createElement('div');
                overlay.id = 'loading-overlay';
                overlay.innerHTML = '<div class="loading-spinner"></div><div class="loading-message">' + message + '</div>';
                document.body.appendChild(overlay);
            }
            overlay.style.display = 'flex';
            overlay.querySelector('.loading-message').textContent = message;
        }catch(e){
            console.error('showLoading error', e);
        }
    };
    
    app.hideLoading = function(){
        try{
            const overlay = document.getElementById('loading-overlay');
            if(overlay) overlay.style.display = 'none';
        }catch(e){
            console.error('hideLoading error', e);
        }
    };
    
    // 最近使った機能の履歴
    app.addToRecentFunctions = function(funcName, label){
        try{
            var recent = JSON.parse(localStorage.getItem('recentFunctions') || '[]');
            recent = recent.filter(f => f.name !== funcName);
            recent.unshift({name: funcName, label: label, timestamp: Date.now()});
            recent = recent.slice(0, 5); // 最新5件のみ保持
            localStorage.setItem('recentFunctions', JSON.stringify(recent));
        }catch(e){
            console.error('addToRecentFunctions error', e);
        }
    };
    
    app.getRecentFunctions = function(){
        try{
            return JSON.parse(localStorage.getItem('recentFunctions') || '[]');
        }catch(e){
            console.error('getRecentFunctions error', e);
            return [];
        }
    };
    
    // LocalStorageから折りたたみ状態を読み込み
    app.loadGroupStates = function(){
        try{
            var saved = localStorage.getItem('dashboardGroupStates');
            return saved ? JSON.parse(saved) : {};
        }catch(e){
            console.error('loadGroupStates error', e);
            return {};
        }
    };
    
    // LocalStorageに折りたたみ状態を保存
    app.saveGroupState = function(name, isOpen){
        try{
            var states = app.loadGroupStates();
            states[name] = isOpen;
            localStorage.setItem('dashboardGroupStates', JSON.stringify(states));
        }catch(e){
            console.error('saveGroupState error', e);
        }
    };
    
    app.toggleGroup = function(name){
        try{
            var wrapper = document.getElementById('group-' + name);
            if(!wrapper) return;
            var content = wrapper.querySelector('.menu-grid');
            if(!content) return;
            var icon = wrapper.querySelector('.toggle-icon');
            
            var isOpen = content.style.display !== 'none' && content.style.display !== '';
            
            if(isOpen){
                content.style.display = 'none';
                if(icon) icon.textContent = '▶';
                app.saveGroupState(name, false);
            } else {
                content.style.display = 'grid';
                if(icon) icon.textContent = '▼';
                app.saveGroupState(name, true);
            }
        }catch(e){
            console.error('toggleGroup error', e);
        }
    };
    
    // ページロード時にグループ状態を復元
    app.restoreGroupStates = function(){
        try{
            var states = app.loadGroupStates();
            Object.keys(states).forEach(function(name){
                var wrapper = document.getElementById('group-' + name);
                if(!wrapper) return;
                var content = wrapper.querySelector('.menu-grid');
                var icon = wrapper.querySelector('.toggle-icon');
                if(!content) return;
                
                if(states[name]){
                    content.style.display = 'grid';
                    if(icon) icon.textContent = '▼';
                } else {
                    content.style.display = 'none';
                    if(icon) icon.textContent = '▶';
                }
            });
        }catch(e){
            console.error('restoreGroupStates error', e);
        }
    };
    
    // メニュー検索フィルター
    app.filterMenuCards = function(){
        try{
            var searchBox = document.getElementById('menu-search-box');
            if(!searchBox) return;
            var query = searchBox.value.toLowerCase();
            var cards = document.querySelectorAll('.menu-card');
            
            cards.forEach(function(card){
                var text = card.textContent.toLowerCase();
                if(text.indexOf(query) !== -1){
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
        }catch(e){
            console.error('filterMenuCards error', e);
        }
    };
    
    // キーボードショートカット
    app.initKeyboardShortcuts = function(){
        document.addEventListener('keydown', function(e){
            // Ctrl+K または Cmd+K で検索フォーカス
            if((e.ctrlKey || e.metaKey) && e.key === 'k'){
                e.preventDefault();
                const searchBox = document.getElementById('menu-search-box');
                if(searchBox) searchBox.focus();
            }
            // Esc でダッシュボードに戻る
            if(e.key === 'Escape' && !e.ctrlKey && !e.altKey && !e.shiftKey){
                const activeElement = document.activeElement;
                if(activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')){
                    activeElement.blur();
                } else if(window.app && typeof window.app.showDashboard === 'function'){
                    window.app.showDashboard();
                }
            }
        });
    };
    
    if(!window.app) window.app = {};
    window.app = Object.assign(window.app, app);
    try{ 
        window.toggleGroup = app.toggleGroup;
        window.filterMenuCards = app.filterMenuCards;
        window.showToast = app.showToast;
        window.showLoading = app.showLoading;
        window.hideLoading = app.hideLoading;
        window.addToRecentFunctions = app.addToRecentFunctions;
        window.getRecentFunctions = app.getRecentFunctions;
        // キーボードショートカットを初期化
        if(document.readyState === 'loading'){
            document.addEventListener('DOMContentLoaded', app.initKeyboardShortcuts);
        } else {
            app.initKeyboardShortcuts();
        }
    }catch(e){}
})();

// クリックデリゲーション：ダッシュボードのカードを確実にハンドルする
(function(){
    try{
        document.addEventListener('click', function(e){
            try{
            var btn = e.target.closest && e.target.closest('.menu-card, .category-card, [onclick]');
                if(!btn) return;
                // 優先: data-fn 属性
                var fn = btn.getAttribute('data-fn');
                if(fn){
                    // data-fn は 'app.showX' か 'toggleGroup:orders' などを想定
                    if(fn.indexOf('app.') === 0){
                        var m = fn.split('.').pop();
                        if(window.app && typeof window.app[m] === 'function'){
                            window.app[m]();
                        }
                        return;
                    }
                    if(fn.indexOf('toggleGroup:') === 0){
                        var arg = fn.split(':')[1];
                        if(window.toggleGroup) window.toggleGroup(arg);
                        return;
                    }
                }

                // 次に inline onclick を解析
                var onclick = btn.getAttribute && btn.getAttribute('onclick');
                if(onclick){
                    // 例: "app.showOrderCodeLookup()" または "toggleGroup('orders')"
                    var m = onclick.match(/([A-Za-z0-9_$.]+)\s*\(([^)]*)\)/);
                    if(m){
                        var funcExpr = m[1];
                        var rawArgs = m[2].trim();
                        var args = [];
                        if(rawArgs.length){
                            // シンプルな引数パーサ（文字列リテラルと数値のみ）
                            rawArgs.split(',').forEach(function(a){
                                var s = a.trim();
                                if(/^'.*'$/.test(s) || /^\".*\"$/.test(s)){
                                    args.push(s.slice(1,-1));
                                } else if(!isNaN(Number(s))){
                                    args.push(Number(s));
                                } else {
                                    args.push(s);
                                }
                            });
                        }

                        var handled = false;
                        if(funcExpr.indexOf('app.') === 0){
                            var method = funcExpr.split('.').pop();
                            if(window.app && typeof window.app[method] === 'function'){
                                window.app[method].apply(window.app, args);
                                e.preventDefault();
                                handled = true;
                                return;
                            }
                        }
                        if(funcExpr === 'toggleGroup' || funcExpr === 'window.toggleGroup'){
                            if(window.toggleGroup) window.toggleGroup.apply(window, args);
                            e.preventDefault();
                            handled = true;
                            return;
                        }
                        // その他のグローバル関数を試す
                        if(window[funcExpr] && typeof window[funcExpr] === 'function'){
                            window[funcExpr].apply(window, args);
                            e.preventDefault();
                            handled = true;
                            return;
                        }
                        // フォールバック: onclick 属性をそのまま評価してみる
                        if(!handled && onclick){
                            try{
                                // 安全ではないが管理画面内の既存コードを実行する互換措置
                                var fn = new Function(onclick);
                                fn();
                                e.preventDefault();
                                return;
                            }catch(evalErr){
                                // 失敗しても黙って続ける
                                console.warn('onclick eval failed', onclick, evalErr);
                            }
                        }
                    }
                }
            }catch(inner){
                console.error('dashboard click handler inner error', inner);
            }
        }, true);
    }catch(e){
        console.error('dashboard click delegation install error', e);
    }
})();

// 未実装ハンドラの安全なスタブを追加（クリックで例外を出さない）
(function(){
    if(!window.app) window.app = {};
    var a = window.app;
    var names = [
        'showOrderCodeLookup','showRegisterCashOrder','showTodayOrders','showPastOrderHistory',
        'showAllOrders','showOrdersByStore','showOrderSearch','showUnpickedAlerts',
        'showDailyClose','showDailySummary','showMenuManagement','showMenuAdd',
        'showMenuPricing','showQRCodeGenerator','showBulkOperations','showStoreManagement',
        'showStoreSettings','showStoreContact','showSettings','showLogs',
        'showAnalytics','showDataManagement','showSpecialCases','showAdvancedSettings',
        'showReports','showCounter','showPickup','showStoreNotifications'
    ];
    for(var i=0;i<names.length;i++){
        (function(n){
            if(typeof a[n] !== 'function'){
                a[n] = function(){
                    try{
                        console.warn('呼び出しされた未実装ハンドラ: ' + n);
                        if(window.app && typeof window.app.showPlaceholder === 'function'){
                            window.app.showPlaceholder(n);
                        } else {
                            // 最低限 UI にメッセージを出す（#content があれば差し替え）
                            var el = document.getElementById('content') || document.getElementById('main') || document.body;
                            var msg = document.createElement('div');
                            msg.style.padding = '20px';
                            msg.style.background = '#fff3cd';
                            msg.style.border = '1px solid #ffeeba';
                            msg.style.borderRadius = '6px';
                            msg.style.margin = '12px';
                            msg.textContent = '[' + n + '] は未実装の機能です。';
                            // 一時表示
                            el.insertBefore(msg, el.firstChild);
                            setTimeout(function(){ try{ msg.parentNode && msg.parentNode.removeChild(msg); }catch(e){} }, 3000);
                        }
                    }catch(e){
                        console.error('stub handler error', e);
                    }
                };
            }
        })(names[i]);
    }
})();

/**
 * 管理者ダッシュボードUIモジュール
 */
export class AdminUI {
    constructor(api, app) {
        this.api = api;
        this.app = app;
        this.isProcessingPayment = false; // 決済処理中フラグ
        this.isProcessingApproval = false; // 承認処理中フラグ
    }

    async renderDashboard() {
        const statsResult = await this.api.getDashboardStats();
        const pendingResult = await this.api.getPendingAdmins();
        
        const stats = statsResult.success ? statsResult.stats : { intake: 0, paid: 0, picked: 0, total: 0 };
        const pendingAdmins = pendingResult.success ? pendingResult.admins : [];
        
        const today = new Date().toLocaleDateString('ja-JP');
        
        return `
            <div class="header">
                <div class="header-content">
                    <div class="header-title">🍱 管理ダッシュボード</div>
                    <button onclick="app.handleLogout()">ログアウト</button>
                </div>
            </div>
            
            <div class="container">
                ${pendingAdmins.length > 0 ? `
                    <div class="card" style="background: #fef3c7; border: 2px solid #fbbf24; margin-bottom: 30px;">
                        <div class="card-header" style="color: #92400e;">
                            ⚠️ 承認待ちの管理者 (${pendingAdmins.length}件)
                        </div>
                        ${pendingAdmins.map(admin => `
                            <div class="pending-admin-card">
                                <div class="pending-admin-info">
                                    <h4>${admin.name}</h4>
                                    <p>${admin.email}</p>
                                    <p style="font-size: 12px; color: #9ca3af;">
                                        登録日時: ${new Date(admin.registeredAt).toLocaleString('ja-JP')}
                                    </p>
                                </div>
                                <div class="pending-admin-actions">
                                    <button class="success" onclick="app.handleApprove(${admin.id})">
                                        ✓ 承認
                                    </button>
                                    <button class="danger" onclick="app.handleReject(${admin.id})">
                                        ✕ 拒否
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                
                <h2 style="margin-bottom: 20px;">本日の状況 (${today})</h2>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value" style="color: #f59e0b;">${stats.intake}</div>
                        <div class="stat-label">受付済み（未決済）</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" style="color: #3b82f6;">${stats.paid}</div>
                        <div class="stat-label">決済完了（未受取）</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" style="color: #10b981;">${stats.picked}</div>
                        <div class="stat-label">受取完了</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" style="color: #8b5cf6;">¥${stats.total.toLocaleString()}</div>
                        <div class="stat-label">本日の売上</div>
                    </div>
                </div>
                
                ${(() => {
                    const recent = this.app.getRecentFunctions ? this.app.getRecentFunctions() : [];
                    if(recent.length > 0){
                        return `
                            <h2 style="margin: 30px 0 16px 0;">🕒 最近使った機能</h2>
                            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:20px;">
                                ${recent.map(f => `
                                    <button onclick="${f.name}()" style="padding:14px;background:#f3f4f6;color:#374151;border:2px solid #e5e7eb;border-radius:10px;cursor:pointer;font-weight:600;transition:all 0.2s;font-size:14px;" onmouseover="this.style.background='#e5e7eb';this.style.borderColor='#3b82f6'" onmouseout="this.style.background='#f3f4f6';this.style.borderColor='#e5e7eb'">
                                        ${f.label}
                                    </button>
                                `).join('')}
                            </div>
                        `;
                    }
                    return '';
                })()}
                
                <h2 style="margin: 30px 0 16px 0;">⚡ クイックアクセス</h2>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:30px;">
                    <button onclick="app.showCounter();app.addToRecentFunctions('app.showCounter','📝 窓口業務')" style="padding:16px;background:#3b82f6;color:white;border:none;border-radius:10px;cursor:pointer;font-weight:bold;transition:all 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        📝 窓口業務
                    </button>
                    <button onclick="app.showPickup();app.addToRecentFunctions('app.showPickup','📦 受取業務')" style="padding:16px;background:#10b981;color:white;border:none;border-radius:10px;cursor:pointer;font-weight:bold;transition:all 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        📦 受取業務
                    </button>
                    <button onclick="app.showTodayOrders();app.addToRecentFunctions('app.showTodayOrders','📊 本日の注文')" style="padding:16px;background:#8b5cf6;color:white;border:none;border-radius:10px;cursor:pointer;font-weight:bold;transition:all 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        📊 本日の注文
                    </button>
                    <button onclick="app.showDailyClose();app.addToRecentFunctions('app.showDailyClose','💰 日次締め')" style="padding:16px;background:#f59e0b;color:white;border:none;border-radius:10px;cursor:pointer;font-weight:bold;transition:all 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        💰 日次締め
                    </button>
                </div>
                
                <h2 style="margin-bottom: 16px;">業務メニュー</h2>
                
                <div style="margin-bottom:20px;">
                    <input type="text" id="menu-search-box" placeholder="🔍 メニューを検索... (Ctrl+Kでフォーカス)" 
                           oninput="window.filterMenuCards()" 
                           style="width:100%;padding:14px;border:2px solid #e5e7eb;border-radius:10px;font-size:16px;transition:border-color 0.2s;"
                           onfocus="this.style.borderColor='#3b82f6'" 
                           onblur="this.style.borderColor='#e5e7eb'"
                           title="Ctrl+Kでこの検索ボックスにすばやくアクセス">
                </div>
                
                <div style="background:#eff6ff;border:2px solid #3b82f6;border-radius:10px;padding:12px;margin-bottom:20px;font-size:13px;color:#1e40af;">
                    <strong>💡 ヒント:</strong> Ctrl+K で検索ボックスにフォーカス / Esc でダッシュボードに戻る
                </div>

                <div class="dashboard-groups">
                    <div class="group" id="group-orders">
                        <div class="category-card" data-fn="toggleGroup:orders" style="cursor:pointer;padding:18px;border-radius:10px;border:2px solid #3b82f6;background:#eff6ff;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;transition:all 0.2s;" onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'">
                            <h3 style="margin:0;color:#1e40af;display:flex;align-items:center;gap:10px;">
                                <span style="font-size:24px;">🛒</span>
                                注文管理
                            </h3>
                            <span class="toggle-icon" style="font-size:20px;color:#3b82f6;">▶</span>
                        </div>
                        <div class="menu-grid" style="display:none;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;">
                            <div class="menu-card" data-fn="app.showOrderCodeLookup">
                                <h3 style="color: #111827; margin-bottom: 10px;">注文コード照会</h3>
                                <p style="color: #6b7280;">受付コードで注文を検索</p>
                            </div>
                            <div class="menu-card" data-fn="app.showRegisterCashOrder">
                                <h3 style="color: #111827; margin-bottom: 10px;">未精算の現金注文登録</h3>
                                <p style="color: #6b7280;">店頭で受けた現金注文を登録</p>
                            </div>
                            <div class="menu-card" data-fn="app.showTodayOrders">
                                <h3 style="color: #111827; margin-bottom: 10px;">本日分の注文確認</h3>
                                <p style="color: #6b7280;">当日の注文を一覧表示</p>
                            </div>
                            <div class="menu-card" data-fn="app.showPastOrderHistory">
                                <h3 style="color: #111827; margin-bottom: 10px;">過去の注文履歴</h3>
                                <p style="color: #6b7280;">過去注文の参照・検索</p>
                            </div>
                            <div class="menu-card" data-fn="app.showAllOrders">
                                <h3 style="color: #7c3aed; margin-bottom: 10px;">📋 全注文一覧</h3>
                                <p style="color: #6b7280;">注文単位の詳細閲覧</p>
                            </div>
                            <div class="menu-card" data-fn="app.showOrdersByStore">
                                <h3 style="color: #059669; margin-bottom: 10px;">🏪 店舗別注文</h3>
                                <p style="color: #6b7280;">店舗ごとの注文統計</p>
                            </div>
                            <div class="menu-card" data-fn="app.showOrderSearch">
                                <h3 style="color: #0284c7; margin-bottom: 10px;">🔍 詳細検索</h3>
                                <p style="color: #6b7280;">データベース的な検索機能</p>
                            </div>
                            <div class="menu-card" data-fn="app.showUnpickedAlerts">
                                <h3 style="color: #dc2626; margin-bottom: 10px;">🔔 未受取アラート</h3>
                                <p style="color: #6b7280;">受取忘れ防止・時間超過確認</p>
                            </div>
                            <div class="menu-card" data-fn="app.showDailyClose">
                                <h3 style="color: #ca8a04; margin-bottom: 10px;">💰 日次締め処理</h3>
                                <p style="color: #6b7280;">売上確認・未受取確認・返金処理</p>
                            </div>
                        </div>
                    </div>

                    <div class="group" id="group-menu">
                        <div class="category-card" data-fn="toggleGroup:menu" style="cursor:pointer;padding:18px;border-radius:10px;border:2px solid #8b5cf6;background:#f3e8ff;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;transition:all 0.2s;" onmouseover="this.style.background='#e9d5ff'" onmouseout="this.style.background='#f3e8ff'">
                            <h3 style="margin:0;color:#6b21a8;display:flex;align-items:center;gap:10px;">
                                <span style="font-size:24px;">🍱</span>
                                メニュー管理
                            </h3>
                            <span class="toggle-icon" style="font-size:20px;color:#8b5cf6;">▶</span>
                        </div>
                        <div class="menu-grid" style="display:none;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;">
                            <div class="menu-card" data-fn="app.showMenuManagement">
                                <h3 style="color: #8b5cf6; margin-bottom: 10px;">メニューの編集・設定</h3>
                                <p style="color: #6b7280;">締め切り時間・上限数・価格設定</p>
                            </div>
                            <div class="menu-card" data-fn="app.showMenuAdd">
                                <h3 style="color: #6b21a8; margin-bottom: 10px;">メニューの追加・削除</h3>
                                <p style="color: #6b7280;">メニュー項目の追加・削除</p>
                            </div>
                            <div class="menu-card" data-fn="app.showMenuPricing">
                                <h3 style="color: #0ea5b7; margin-bottom: 10px;">価格設定</h3>
                                <p style="color: #6b7280;">メニューごとの価格・割引設定</p>
                            </div>
                            <div class="menu-card" data-fn="app.showQRCodeGenerator">
                                <h3 style="color: #0891b2; margin-bottom: 10px;">📱 QRコード</h3>
                                <p style="color: #6b7280;">受付・注文番号のQR生成</p>
                            </div>
                        </div>
                    </div>

                    <div class="group" id="group-store">
                        <div class="category-card" data-fn="toggleGroup:store" style="cursor:pointer;padding:18px;border-radius:10px;border:2px solid #ec4899;background:#fce7f3;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;transition:all 0.2s;" onmouseover="this.style.background='#fbcfe8'" onmouseout="this.style.background='#fce7f3'">
                            <h3 style="margin:0;color:#9f1239;display:flex;align-items:center;gap:10px;">
                                <span style="font-size:24px;">🏪</span>
                                店舗管理
                            </h3>
                            <span class="toggle-icon" style="font-size:20px;color:#ec4899;">▶</span>
                        </div>
                        <div class="menu-grid" style="display:none;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;">
                            <div class="menu-card" data-fn="app.showStoreManagement">
                                <h3 style="color: #ec4899; margin-bottom: 10px;">店舗の追加・削除</h3>
                                <p style="color: #6b7280;">店舗情報の作成・編集・削除</p>
                            </div>
                            <div class="menu-card" data-fn="app.showStoreSettings">
                                <h3 style="color: #111827; margin-bottom: 10px;">店舗ごとの設定登録、更新</h3>
                                <p style="color: #6b7280;">営業時間・締め切り・表示設定</p>
                            </div>
                            <div class="menu-card" data-fn="app.showStoreContact">
                                <h3 style="color: #111827; margin-bottom: 10px;">店舗問い合わせ</h3>
                                <p style="color: #6b7280;">店舗からの問い合わせ一覧</p>
                            </div>
                        </div>
                    </div>

                    <div class="group" id="group-other">
                        <div class="category-card" data-fn="toggleGroup:other" style="cursor:pointer;padding:18px;border-radius:10px;border:2px solid #64748b;background:#f1f5f9;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;transition:all 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">
                            <h3 style="margin:0;color:#334155;display:flex;align-items:center;gap:10px;">
                                <span style="font-size:24px;">⚙️</span>
                                その他
                            </h3>
                            <span class="toggle-icon" style="font-size:20px;color:#64748b;">▶</span>
                        </div>
                        <div class="menu-grid" style="display:none;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;">
                            <div class="menu-card" onclick="window.location.href='/inventory.html'" style="cursor:pointer;">
                                <h3 style="color: #4CAF50; margin-bottom: 10px;">📦 在庫管理</h3>
                                <p style="color: #6b7280;">メニューの在庫設定・管理</p>
                            </div>
                            <div class="menu-card" onclick="window.location.href='/coupons.html'" style="cursor:pointer;">
                                <h3 style="color: #FF9800; margin-bottom: 10px;">🎟️ クーポン管理</h3>
                                <p style="color: #6b7280;">割引クーポンの作成・管理</p>
                            </div>
                            <div class="menu-card" data-fn="app.showSettings">
                                <h3 style="color: #f59e0b; margin-bottom: 10px;">システム設定</h3>
                                <p style="color: #6b7280;">営業時間・メッセージ管理</p>
                            </div>
                            <div class="menu-card" data-fn="app.showLogs">
                                <h3 style="color: #6366f1; margin-bottom: 10px;">ログ閲覧</h3>
                                <p style="color: #6b7280;">注文・管理操作の履歴</p>
                            </div>
                            <div class="menu-card" data-fn="app.showAnalytics">
                                <h3 style="color: #2563eb; margin-bottom: 10px;">売上レポート</h3>
                                <p style="color: #6b7280;">売上分析・帳票出力</p>
                            </div>
                            <div class="menu-card" data-fn="app.showDataManagement">
                                <h3 style="color: #16a34a; margin-bottom: 10px;">データ管理</h3>
                                <p style="color: #6b7280;">バックアップ・復元・集計</p>
                            </div>
                            <div class="menu-card" data-fn="app.showSpecialCases">
                                <h3 style="color: #dc2626; margin-bottom: 10px;">特例処理</h3>
                                <p style="color: #6b7280;">割引・クーポン・VIP対応</p>
                            </div>
                            <div class="menu-card" data-fn="app.showAdvancedSettings">
                                <h3 style="color: #a855f7; margin-bottom: 10px;">詳細設定</h3>
                                <p style="color: #6b7280;">キャンセル・特定日・データ設定</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            ${this.renderAdminBottomNav('dashboard')}
            <script>
                // ページロード後にグループ状態を復元
                setTimeout(function(){
                    if(window.app && window.app.restoreGroupStates){
                        window.app.restoreGroupStates();
                    }
                }, 100);
            </script>
        `;
    }

    renderCounter() {
        return `
            <div class="header">
                <div class="header-content">
                    <div class="header-title">📝 窓口業務</div>
                    <button onclick="app.showDashboard()">ダッシュボードに戻る</button>
                </div>
            </div>
            
            <div class="container">
                <div class="card">
                    <div class="card-header">注文番号検索</div>
                    
                    <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                        <input type="text" id="order-code" placeholder="注文番号を入力 (例: R-0001)" 
                               onkeydown="if(event.key==='Enter') app.handleSearchOrder()"
                               style="flex: 1; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px;">
                        <button onclick="app.handleSearchOrder()">検索 <small style="opacity: 0.7;">(Enter)</small></button>
                    </div>
                    
                    <div id="order-result"></div>
                </div>
            </div>
            ${this.renderAdminBottomNav('counter')}
        `;
    }

    renderPickup() {
        return `
            <div class="header">
                <div class="header-content">
                    <div class="header-title">📦 受取業務</div>
                    <button onclick="app.showDashboard()">ダッシュボードに戻る</button>
                </div>
            </div>
            
            <div class="container">
                <div class="card">
                    <div class="card-header">注文番号検索</div>
                    
                    <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                        <input type="text" id="order-code" placeholder="注文番号を入力 (例: A1B2)" 
                               onkeydown="if(event.key==='Enter') app.handleSearchOrder()"
                               style="flex: 1; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px;">
                        <button onclick="app.handleSearchOrder()">検索 <small style="opacity: 0.7;">(Enter)</small></button>
                    </div>
                    
                    <div id="order-result"></div>
                </div>
            </div>
            ${this.renderAdminBottomNav('pickup')}
        `;
    }

    // 注文コード照会画面
    renderOrderCodeLookup() {
        return `
            <div class="header">
                <div class="header-content">
                    <div class="header-title">注文コード照会</div>
                    <button onclick="app.showDashboard()">ダッシュボードに戻る</button>
                </div>
            </div>
            <div class="container">
                <div class="card">
                    <div class="card-header">注文番号検索</div>
                    <div style="display:flex; gap:12px; margin-bottom:20px;">
                        <input id="order-code" type="text" placeholder="注文番号を入力 (例: A1B2)" onkeydown="if(event.key==='Enter') app.handleSearchOrder()" style="flex:1; padding:12px; border:2px solid #e5e7eb; border-radius:8px;">
                        <button onclick="app.handleSearchOrder()">検索</button>
                    </div>
                    <div id="order-result"></div>
                </div>
            </div>
            ${this.renderAdminBottomNav('orders')}
        `;
    }

    // 未精算の現金注文登録（簡易フォーム）
    renderRegisterCashOrder() {
        return `
            <div class="header">
                <div class="header-content">
                    <div class="header-title">未精算の現金注文登録</div>
                    <button onclick="app.showDashboard()">ダッシュボードに戻る</button>
                </div>
            </div>
            <div class="container">
                <div class="card">
                    <div class="card-header">現金注文を登録</div>
                    <div class="form-group">
                        <label>受取日</label>
                        <input type="date" id="cash-pickup-date" style="width:100%; padding:8px;">
                    </div>
                    <div class="form-group">
                        <label>注文項目（1行ごとに: 名前,数量,価格）</label>
                        <textarea id="cash-items" placeholder="からあげ弁当,2,600\nのり弁,1,500" style="width:100%; height:120px; padding:8px;"></textarea>
                    </div>
                    <button onclick="app.handleRegisterCashOrder()" class="success">登録して決済（現金）</button>
                    <div id="cash-result" style="margin-top:12px;"></div>
                </div>
            </div>
            ${this.renderAdminBottomNav('orders')}
        `;
    }

    // 本日分の注文確認
    async renderTodayOrders() {
        const res = await this.api.getOrders();
        const orders = res.success ? (res.orders || res.data || []) : [];
        const today = new Date().toISOString().slice(0,10);
        const todays = orders.filter(o => (o.pickupDate||'').slice(0,10) === today);

        return `
            <div class="header">
                <div class="header-content">
                    <div class="header-title">本日分の注文確認</div>
                    <button onclick="app.showDashboard()">ダッシュボードに戻る</button>
                </div>
            </div>
            <div class="container">
                <div class="card">
                    <div class="card-header">本日の注文一覧 (${todays.length}件)</div>
                    <div id="today-orders-list">
                        ${todays.map(o=>`
                            <div class="order-row" style="padding:12px; border-bottom:1px solid #f3f4f6; display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <div><strong>${o.orderCode || o.intakeCode || ''}</strong> — ${o.customerName || ''}</div>
                                    <div style="font-size:12px; color:#6b7280;">${o.items? o.items.map(it=>it.name+'×'+it.quantity).join(', '):''}</div>
                                </div>
                                <div style="display:flex; gap:8px;">
                                    ${o.status === 'PAID' ? `<button onclick="app.handlePickupComplete('${o.orderCode||o.intakeCode}')">✓ 受取完了</button>` : '<span style="color: #10b981;">受取済み</span>'}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            ${this.renderAdminBottomNav('orders')}
        `;
    }

    // 過去の注文履歴（期間検索）
    renderPastOrderHistory() {
        return `
            <div class="header">
                <div class="header-content">
                    <div class="header-title">過去の注文履歴</div>
                    <button onclick="app.showDashboard()">ダッシュボードに戻る</button>
                </div>
            </div>
            <div class="container">
                <div class="card">
                    <div class="card-header">期間を指定して検索</div>
                    <div style="display:flex; gap:12px; margin-bottom:12px;">
                        <input type="date" id="history-start" style="padding:8px;">
                        <input type="date" id="history-end" style="padding:8px;">
                        <button onclick="app.handleSearchOrdersByRange()">検索</button>
                    </div>
                    <div id="history-results"></div>
                </div>
            </div>
            ${this.renderAdminBottomNav('orders')}
        `;
    }

    async handleSearchOrdersByRange() {
        const startInput = document.getElementById('history-start');
        const endInput = document.getElementById('history-end');
        const resultsDiv = document.getElementById('history-results');
        
        if (!resultsDiv) {
            console.error('history-results要素が見つかりません');
            return;
        }
        
        const startDate = startInput?.value;
        const endDate = endInput?.value;
        
        if (!startDate || !endDate) {
            resultsDiv.innerHTML = '<div class="error-message">❗ 開始日と終了日を指定してください</div>';
            return;
        }
        
        if (startDate > endDate) {
            resultsDiv.innerHTML = '<div class="error-message">❗ 開始日は終了日より前にしてください</div>';
            return;
        }
        
        resultsDiv.innerHTML = '<div style="text-align:center;padding:20px;color:#6b7280;">🔍 検索中...</div>';
        
        const result = await this.api.getOrders();
        
        if (result.success) {
            const filteredOrders = result.orders.filter(order => {
                const orderDate = order.pickupDate;
                return orderDate >= startDate && orderDate <= endDate;
            });
            
            if (filteredOrders.length === 0) {
                resultsDiv.innerHTML = '<div class="info-box">📭 指定期間の注文はありません</div>';
                return;
            }
            
            // 日付でグループ化
            const ordersByDate = {};
            filteredOrders.forEach(order => {
                if (!ordersByDate[order.pickupDate]) {
                    ordersByDate[order.pickupDate] = [];
                }
                ordersByDate[order.pickupDate].push(order);
            });
            
            let html = '';
            Object.keys(ordersByDate).sort().reverse().forEach(date => {
                const orders = ordersByDate[date];
                const total = orders.reduce((sum, o) => sum + o.totalAmount, 0);
                
                html += `
                    <div class="card" style="margin-bottom:20px;">
                        <div class="card-header">
                            📅 ${new Date(date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
                            <span style="float:right;">合計: ¥${total.toLocaleString()}</span>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>注文番号</th>
                                    <th>ステータス</th>
                                    <th>決済方法</th>
                                    <th>金額</th>
                                    <th>受取時刻</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${orders.map(order => `
                                    <tr onclick="app.handleSearchOrder('${order.orderCode}')" style="cursor:pointer;">
                                        <td><strong>${order.orderCode}</strong></td>
                                        <td>
                                            <span class="status-badge status-${order.status.toLowerCase()}">
                                                ${order.status === 'PAID' ? '決済済' : order.status === 'PICKED' ? '受取済' : order.status}
                                            </span>
                                        </td>
                                        <td>${order.paymentMethod === 'cash' ? '現金' : 
                                             order.paymentMethod === 'paypay' ? 'PayPay' : 
                                             order.paymentMethod === 'linepay' ? 'LINE Pay' : 
                                             order.paymentMethod === 'credit' ? 'クレジット' : 
                                             order.paymentMethod || '-'}</td>
                                        <td>¥${order.totalAmount.toLocaleString()}</td>
                                        <td>${order.pickedAt ? new Date(order.pickedAt).toLocaleTimeString('ja-JP') : '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        <div style="margin-top:12px;font-size:14px;color:#6b7280;">
                            注文数: ${orders.length}件
                        </div>
                    </div>
                `;
            });
            
            resultsDiv.innerHTML = html;
        } else {
            resultsDiv.innerHTML = '<div class="error-message">❌ 検索に失敗しました: ' + result.error + '</div>';
        }
    }

    async handleSearchOrder() {
        const input = document.getElementById('order-code');
        const code = input?.value?.trim() || '';
        const resultDiv = document.getElementById('order-result');
        
        if (!resultDiv) {
            console.error('order-result要素が見つかりません');
            return;
        }
        
        if (!code) {
            resultDiv.innerHTML = '<div class="error-message">❗ 注文番号を入力してください</div>';
            input?.focus();
            return;
        }
        
        const result = await this.api.searchOrder(code);
        
        if (result.success) {
            const order = result.order;
            resultDiv.innerHTML = `
                <div class="card" style="background: #eff6ff;">
                    <h3 style="margin-bottom: 16px;">受付情報</h3>
                    <p><strong>注文番号:</strong> ${order.orderCode}</p>
                    <p><strong>受取日:</strong> ${new Date(order.pickupDate).toLocaleDateString('ja-JP')}</p>
                    <p><strong>合計金額:</strong> ¥${order.totalAmount.toLocaleString()}</p>
                    <p><strong>ステータス:</strong> ${order.status === 'PENDING' ? '未決済' : '決済済み'}</p>
                    
                    <h4 style="margin-top: 16px; margin-bottom: 8px;">注文内容:</h4>
                    ${order.items.map(item => `
                        <div style="background: white; padding: 12px; border-radius: 8px; margin-bottom: 8px;">
                            ${item.name} × ${item.quantity} = ¥${(item.price * item.quantity).toLocaleString()}
                        </div>
                    `).join('')}
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button onclick="app.handleEditOrder('${order.orderCode}')" style="flex:1; background: #3b82f6; color: white; padding: 10px; border-radius: 6px;">編集</button>
                        <button onclick="app.handleDeleteOrder('${order.orderCode}')" style="flex:1; background: #ef4444; color: white; padding: 10px; border-radius: 6px;">削除</button>
                    </div>
                    ${order.status === 'PENDING' ? `
                        <button onclick="app.handlePayment('${order.orderCode}')" class="success" 
                                style="width: 100%; margin-top: 20px; padding: 16px; font-size: 18px;">
                            💳 決済処理して注文番号を発行
                        </button>
                    ` : `
                        <div class="success-message" style="margin-top: 20px;">
                            ✅ すでに決済済みです<br>
                            注文番号: <strong>${order.orderCode}</strong>
                        </div>
                    `}
                </div>
            `;
        } else {
            const errorMsg = result.error || '注文番号が見つかりません';
            resultDiv.innerHTML = `
                <div class="error-message">
                    ❌ ${errorMsg}
                </div>
            `;
            if (errorMsg.includes('見つかりません')) {
                alert('❌ 注文番号が見つかりません\n\n入力した注文番号を確認してください。\n例: R-0001');
            }
        }
    }

    // 注文編集ダイアログ
    async handleEditOrder(orderCode) {
        const result = await this.api.searchOrder(orderCode);
        if (!result.success) {
            alert('注文情報の取得に失敗しました');
            return;
        }
        const order = result.order;
        // 編集用プロンプト（簡易）
        const newDate = prompt('受取日をYYYY-MM-DD形式で入力', order.pickupDate?.slice(0,10) || '');
        if (!newDate) return;
        // 商品数編集（カンマ区切り: name,数量,価格）
        const itemsStr = prompt('注文内容を編集（例: からあげ弁当,2,600/のり弁,1,500）',
            order.items.map(i=>`${i.name},${i.quantity},${i.price}`).join('/'));
        if (!itemsStr) return;
        const items = itemsStr.split('/').map(s => {
            const [name, quantity, price] = s.split(',');
            return { name: name?.trim(), quantity: Number(quantity), price: Number(price) };
        });
        // API呼び出し
        const updateResult = await this.api.updateOrder(orderCode, { pickupDate: newDate, items });
        if (updateResult.success) {
            alert('✅ 注文を更新しました');
            this.handleSearchOrder();
        } else {
            alert('エラー: ' + updateResult.error);
        }
    }

    // 注文削除処理
    async handleDeleteOrder(orderCode) {
        if (!confirm('この注文を削除しますか？')) return;
        const result = await this.api.deleteOrder(orderCode);
        if (result.success) {
            alert('✅ 注文を削除しました');
            document.getElementById('order-result').innerHTML = '<div class="success-message">注文が削除されました</div>';
        } else {
            alert('エラー: ' + result.error);
        }
    }

    // handleSearchOrder の else 部分の正しい閉じカッコ
    // ...（handleSearchOrderのelseブロックの内容は既に上で正しく閉じているため、ここで修正完了）

    async handlePayment(orderCode) {
        // 決済方法選択ダイアログを表示
        const resultDiv = document.getElementById('order-result');
        const order = await this.api.searchOrder(orderCode);
        
        if (!resultDiv) {
            console.error('order-result要素が見つかりません');
            return;
        }
        
        if (!order.success) {
            alert('受付情報の取得に失敗しました');
            return;
        }
        
        resultDiv.innerHTML = `
            <div class="card" style="background: #eff6ff;">
                <h3 style="margin-bottom: 20px; text-align: center;">💳 決済方法を選択</h3>
                
                <div style="margin-bottom: 20px;">
                    <p><strong>注文番号:</strong> ${orderCode}</p>
                    <p><strong>合計金額:</strong> <span style="font-size: 24px; color: #3b82f6; font-weight: bold;">¥${order.order.totalAmount.toLocaleString()}</span></p>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
                    <div class="payment-method-card" onclick="app.processPaymentWithMethod('${orderCode}', 'cash')" style="cursor: pointer; padding: 20px; background: white; border: 3px solid #3b82f6; border-radius: 12px; text-align: center; transition: all 0.3s;">
                        <div style="font-size: 48px; margin-bottom: 10px;">💵</div>
                        <div style="font-size: 18px; font-weight: bold; color: #1f2937;">現金</div>
                        <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">Cash Payment</div>
                    </div>
                    
                    <div class="payment-method-card" onclick="app.processPaymentWithMethod('${orderCode}', 'paypay')" style="cursor: pointer; padding: 20px; background: white; border: 3px solid #ff6b6b; border-radius: 12px; text-align: center; transition: all 0.3s;">
                        <div style="font-size: 48px; margin-bottom: 10px;">📱</div>
                        <div style="font-size: 18px; font-weight: bold; color: #1f2937;">PayPay</div>
                        <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">QR決済</div>
                    </div>
                    
                    <div class="payment-method-card" onclick="app.processPaymentWithMethod('${orderCode}', 'linepay')" style="cursor: pointer; padding: 20px; background: white; border: 3px solid #00b900; border-radius: 12px; text-align: center; transition: all 0.3s;">
                        <div style="font-size: 48px; margin-bottom: 10px;">💚</div>
                        <div style="font-size: 18px; font-weight: bold; color: #1f2937;">LINE Pay</div>
                        <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">QR決済</div>
                    </div>
                    
                    <div class="payment-method-card" onclick="app.processPaymentWithMethod('${orderCode}', 'merpay')" style="cursor: pointer; padding: 20px; background: white; border: 3px solid #ff0000; border-radius: 12px; text-align: center; transition: all 0.3s;">
                        <div style="font-size: 48px; margin-bottom: 10px;">🔴</div>
                        <div style="font-size: 18px; font-weight: bold; color: #1f2937;">メルペイ</div>
                        <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">QR決済</div>
                    </div>
                    
                    <div class="payment-method-card" onclick="app.processPaymentWithMethod('${orderCode}', 'credit')" style="cursor: pointer; padding: 20px; background: white; border: 3px solid #8b5cf6; border-radius: 12px; text-align: center; transition: all 0.3s;">
                        <div style="font-size: 48px; margin-bottom: 10px;">💳</div>
                        <div style="font-size: 18px; font-weight: bold; color: #1f2937;">クレジット</div>
                        <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">Card Payment</div>
                    </div>
                    
                    <div class="payment-method-card" onclick="app.processPaymentWithMethod('${orderCode}', 'other')" style="cursor: pointer; padding: 20px; background: white; border: 3px solid #6b7280; border-radius: 12px; text-align: center; transition: all 0.3s;">
                        <div style="font-size: 48px; margin-bottom: 10px;">💰</div>
                        <div style="font-size: 18px; font-weight: bold; color: #1f2937;">その他</div>
                        <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">Other</div>
                    </div>
                </div>
                
                <button onclick="app.handleSearchOrder()" class="secondary" style="width: 100%;">
                    キャンセル
                </button>
            </div>
            
            <style>
                .payment-method-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 8px 16px rgba(0,0,0,0.15);
                }
            </style>
        `;
    }

    async processPaymentWithMethod(orderCode, paymentMethod) {
        const methodNames = {
            'cash': '現金',
            'paypay': 'PayPay',
            'linepay': 'LINE Pay',
            'merpay': 'メルペイ',
            'credit': 'クレジットカード',
            'other': 'その他'
        };
        
        const methodName = methodNames[paymentMethod] || paymentMethod;
        
        // 二重実行防止
        if (this.isProcessingPayment) {
            console.log('⚠️ 決済処理中です');
            return;
        }
        
        if (!confirm(`${methodName}で決済処理を実行しますか？\nこの操作は取り消せません。`)) {
            return;
        }
        
        this.isProcessingPayment = true;
        console.log('💳 決済処理開始:', orderCode, paymentMethod);
        const result = await this.api.processPayment(orderCode, paymentMethod);
        this.isProcessingPayment = false;
        
        if (result.success) {
            console.log('✅ 決済完了:', result.orderCode);
            const resultDiv = document.getElementById('order-result');
            
            if (!resultDiv) {
                console.error('order-result要素が見つかりません');
                alert(`✅ 決済完了\n注文番号: ${result.orderCode}`);
                return;
            }
            
            // QR決済の場合は決済完了画面を表示
            if (['paypay', 'linepay', 'merpay'].includes(paymentMethod)) {
                resultDiv.innerHTML = `
                    <div class="card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center;">
                        <div style="font-size: 64px; margin-bottom: 20px;">✅</div>
                        <h2 style="color: white; margin-bottom: 10px;">決済完了</h2>
                        <p style="font-size: 18px; opacity: 0.9; margin-bottom: 30px;">${methodName}での支払いが完了しました</p>
                        
                        <div style="background: white; color: #1f2937; padding: 30px; border-radius: 12px; margin-bottom: 20px;">
                            <div style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">注文番号</div>
                            <div style="font-size: 48px; font-weight: bold; color: #3b82f6; letter-spacing: 4px; font-family: monospace;">
                                ${result.orderCode}
                            </div>
                            <div style="margin-top: 20px; padding: 15px; background: #f3f4f6; border-radius: 8px;">
                                <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(result.orderCode)}" alt="QR Code" style="max-width: 200px;">
                            </div>
                        </div>
                        
                        <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                            <p style="margin: 5px 0;">💵 支払額: ¥${result.order.totalAmount.toLocaleString()}</p>
                            <p style="margin: 5px 0;">📱 決済方法: ${methodName}</p>
                            <p style="margin: 5px 0;">🕐 決済時刻: ${new Date().toLocaleTimeString('ja-JP')}</p>
                        </div>
                        
                        <p style="font-size: 16px; opacity: 0.9;">この番号を受取時にお伝えください</p>
                    </div>
                    
                    <button onclick="app.handleSearchOrder()" class="success" style="width: 100%; margin-top: 20px; padding: 16px; font-size: 18px;">
                        ✓ 次の受付を検索
                    </button>
                `;
            } else {
                // 現金・クレジットの場合は従来の表示
                resultDiv.innerHTML = `
                    <div class="card" style="background: #d1fae5; text-align: center;">
                        <h2 style="color: #065f46; margin-bottom: 20px;">✅ 決済完了</h2>
                        <div style="background: white; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                            <div style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">注文番号</div>
                            <div style="font-size: 48px; font-weight: bold; color: #3b82f6; letter-spacing: 4px; font-family: monospace;">
                                ${result.orderCode}
                            </div>
                        </div>
                        <p style="color: #065f46; font-size: 16px; margin-bottom: 10px;">
                            💵 支払方法: ${methodName}
                        </p>
                        <p style="color: #065f46; font-size: 18px;">
                            この番号を受取時にお伝えください
                        </p>
                        <button onclick="app.handleSearchOrder()" style="margin-top: 20px;">
                            次の受付を検索
                        </button>
                    </div>
                `;
            }
        } else {
            const errorMsg = result.error || '決済処理に失敗しました';
            
            // エラーの種類に応じたメッセージ
            if (errorMsg.includes('見つかりません')) {
                alert('❌ 注文番号が見つかりません\n\n注文番号を確認してください。');
            } else if (errorMsg.includes('処理済み')) {
                alert('❌ この受付はすでに決済済みです');
            } else if (errorMsg.includes('キャンセル')) {
                alert('❌ この受付はキャンセルされています');
            } else {
                alert(`❌ 決済エラー\n\n${errorMsg}\n\nもう一度お試しください。`);
            }
        }
    }

    async handlePickupComplete(orderCode) {
        const result = await this.api.completePickup(orderCode);
        
        if (result.success) {
            document.getElementById('order-result').innerHTML = `
                <div class="card" style="background: #d1fae5; text-align: center;">
                    <h2 style="color: #065f46; margin-bottom: 20px;">✅ 受取完了</h2>
                    <p style="color: #065f46; font-size: 18px;">
                        注文番号 <strong>${orderCode}</strong> の受取が完了しました
                    </p>
                </div>
            `;
        } else {
            alert('エラー: ' + result.error);
        }
    }

    async handleApprove(adminId) {
        // 二重実行防止
        if (this.isProcessingApproval) {
            console.log('⚠️ 承認処理中です');
            return;
        }
        
        if (!confirm('この管理者を承認しますか？')) return;
        
        this.isProcessingApproval = true;
        const result = await this.api.approveAdmin(adminId);
        this.isProcessingApproval = false;
        
        if (result.success) {
            alert(`✅ ${result.admin.name} さんを管理者として承認しました`);
            this.app.showDashboard();
        } else {
            alert('エラー: ' + result.error);
        }
    }

    async handleReject(adminId) {
        // 二重実行防止
        if (this.isProcessingApproval) {
            console.log('⚠️ 拒否処理中です');
            return;
        }
        
        if (!confirm('この管理者の登録を拒否しますか？\nこの操作は取り消せません。')) return;
        
        this.isProcessingApproval = true;
        const result = await this.api.rejectAdmin(adminId);
        this.isProcessingApproval = false;
        
        if (result.success) {
            alert(`❌ ${result.admin.name} さんの登録申請を拒否しました`);
            this.app.showDashboard();
        } else {
            alert('エラー: ' + result.error);
        }
    }

    // ==================== システム設定 ====================

    async renderSettings() {
        const hoursResult = await this.api.getBusinessHours();
        const messageResult = await this.api.getSystemMessage();
        
        const hours = hoursResult.success ? hoursResult.hours : {};
        const message = messageResult.success ? messageResult.message : { enabled: false, title: '', content: '', type: 'info' };
        
        return `
            <div class="header">
                <div class="header-content">
                    <div class="header-title">⚙️ システム設定</div>
                    <button onclick="app.showDashboard()">ダッシュボードに戻る</button>
                </div>
            </div>
            
            <div class="container">
                <div class="card">
                    <div class="card-header">お知らせメッセージ設定</div>
                    
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="message-enabled" ${message.enabled ? 'checked' : ''}>
                            メッセージを表示する
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label>タイトル</label>
                        <input type="text" id="message-title" value="${message.title || ''}" placeholder="例: 重要なお知らせ">
                    </div>
                    
                    <div class="form-group">
                        <label>メッセージ内容</label>
                        <textarea id="message-content" rows="4" style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px;">${message.content || ''}</textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>表示タイプ</label>
                        <select id="message-type" style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px;">
                            <option value="info" ${message.type === 'info' ? 'selected' : ''}>情報（青）</option>
                            <option value="warning" ${message.type === 'warning' ? 'selected' : ''}>警告（黄）</option>
                            <option value="error" ${message.type === 'error' ? 'selected' : ''}>エラー（赤）</option>
                            <option value="success" ${message.type === 'success' ? 'selected' : ''}>成功（緑）</option>
                        </select>
                    </div>
                    
                    <button onclick="app.handleSaveSystemMessage()" class="success" style="width: 100%;">
                        💾 メッセージを保存
                    </button>
                </div>
                
                <div class="card">
                    <div class="card-header">営業時間設定</div>
                    
                    <div class="form-group">
                        <label>注文締切（前日の何時まで）</label>
                        <select id="order-deadline" style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px;">
                            ${[0,1,2,3,4,5,6,7,8,9,10,11,12].map(h => `
                                <option value="${h}" ${hours.orderDeadline === h ? 'selected' : ''}>${h}時まで</option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <h4 style="margin: 20px 0 10px;">窓口営業時間</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div class="form-group">
                            <label>開始時刻</label>
                            <input type="time" id="counter-start" value="${hours.counter?.start || '14:00'}" style="width: 100%;">
                        </div>
                        <div class="form-group">
                            <label>終了時刻</label>
                            <input type="time" id="counter-end" value="${hours.counter?.end || '18:00'}" style="width: 100%;">
                        </div>
                    </div>
                    
                    <h4 style="margin: 20px 0 10px;">受取可能時間</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div class="form-group">
                            <label>開始時刻</label>
                            <input type="time" id="pickup-start" value="${hours.pickup?.start || '11:30'}" style="width: 100%;">
                        </div>
                        <div class="form-group">
                            <label>終了時刻</label>
                            <input type="time" id="pickup-end" value="${hours.pickup?.end || '13:30'}" style="width: 100%;">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>営業日</label>
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 8px;">
                            ${[
                                {key: 'mon', label: '月'},
                                {key: 'tue', label: '火'},
                                {key: 'wed', label: '水'},
                                {key: 'thu', label: '木'},
                                {key: 'fri', label: '金'},
                                {key: 'sat', label: '土'},
                                {key: 'sun', label: '日'}
                            ].map(day => `
                                <label style="display: flex; align-items: center; gap: 6px;">
                                    <input type="checkbox" id="day-${day.key}" ${hours.businessDays?.includes(day.key) ? 'checked' : ''}>
                                    ${day.label}曜日
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    
                    <button onclick="app.handleSaveBusinessHours()" class="success" style="width: 100%;">
                        💾 営業時間を保存
                    </button>
                </div>
            </div>
            ${this.renderAdminBottomNav('settings')}
        `;
    }

    async handleSaveSystemMessage() {
        const message = {
            enabled: document.getElementById('message-enabled').checked,
            title: document.getElementById('message-title').value,
            content: document.getElementById('message-content').value,
            type: document.getElementById('message-type').value
        };
        
        const result = await this.api.updateSystemMessage(message);
        
        if (result.success) {
            alert('✅ メッセージを保存しました');
            this.app.showDashboard();
        } else {
            alert('エラー: ' + result.error);
        }
    }

    async handleSaveBusinessHours() {
        const businessDays = [];
        ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].forEach(day => {
            if (document.getElementById(`day-${day}`).checked) {
                businessDays.push(day);
            }
        });
        
        if (businessDays.length === 0) {
            alert('営業日を少なくとも1日は選択してください');
            return;
        }
        
        const hours = {
            orderDeadline: parseInt(document.getElementById('order-deadline').value),
            counter: {
                start: document.getElementById('counter-start').value,
                end: document.getElementById('counter-end').value
            },
            pickup: {
                start: document.getElementById('pickup-start').value,
                end: document.getElementById('pickup-end').value
            },
            businessDays
        };
        
        const result = await this.api.updateBusinessHours(hours);
        
        if (result.success) {
            alert('✅ 営業時間を保存しました');
            this.app.showDashboard();
        } else {
            alert('エラー: ' + result.error);
        }
    }

    // ==================== メニュー管理 ====================

    async renderMenuManagement() {
        const menuResult = await this.api.getMenu();
        const storesResult = await this.api.getStores();
        
        const menuItems = menuResult.success ? menuResult.items : [];
        const stores = storesResult.success ? storesResult.stores : [];
        
        return `
            <div class="header">
                <div class="header-content">
                    <div class="header-title">🍱 メニュー管理</div>
                    <button onclick="app.showDashboard()">ダッシュボードに戻る</button>
                </div>
            </div>
            
            <div class="container">
                <div class="card">
                    <div class="card-header">新規メニュー追加</div>
                    
                    <div class="form-group">
                        <label>店舗</label>
                        <select id="new-menu-store" style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px;">
                            ${stores.map(store => `
                                <option value="${store.id}">${store.name}</option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>メニュー名</label>
                        <input type="text" id="new-menu-name" placeholder="例: 唐揚げ弁当">
                    </div>
                    
                    <div class="form-group">
                        <label>価格（円）</label>
                        <input type="number" id="new-menu-price" placeholder="650">
                    </div>
                    
                    <div class="form-group">
                        <label>説明</label>
                        <textarea id="new-menu-description" rows="3" style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px;" placeholder="メニューの説明"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>画像（JPEG/PNG）</label>
                        <input type="file" id="new-menu-image" accept="image/jpeg,image/jpg,image/png" style="width: 100%; padding: 8px; border: 2px solid #e5e7eb; border-radius: 8px;">
                        <div id="new-menu-image-preview" style="margin-top: 10px;"></div>
                    </div>
                    
                    <button onclick="app.handleAddMenu()" class="success" style="width: 100%;">
                        ➕ メニューを追加
                    </button>
                </div>
                
                <div class="card">
                    <div class="card-header">メニュー一覧</div>
                    
                    <!-- メニューフィルター -->
                    <div style="margin-bottom: 20px; padding: 15px; background: #f9fafb; border-radius: 8px;">
                        <h4 style="margin-bottom: 10px;">🔍 フィルター</h4>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px;">
                            <div class="form-group">
                                <label>店舗</label>
                                <select id="filter-menu-store" onchange="app.applyMenuFilters()">
                                    <option value="">すべて</option>
                                    ${stores.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>状態</label>
                                <select id="filter-menu-status" onchange="app.applyMenuFilters()">
                                    <option value="">すべて</option>
                                    <option value="active">公開中</option>
                                    <option value="inactive">非公開</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>価格範囲</label>
                                <div style="display: flex; gap: 5px;">
                                    <input type="number" id="filter-menu-min" placeholder="最小" style="width: 60px;" oninput="app.applyMenuFilters()">
                                    <span>〜</span>
                                    <input type="number" id="filter-menu-max" placeholder="最大" style="width: 60px;" oninput="app.applyMenuFilters()">
                                </div>
                            </div>
                            <div class="form-group">
                                <label>メニュー名</label>
                                <input type="text" id="filter-menu-name" placeholder="検索" oninput="app.applyMenuFilters()">
                            </div>
                            <div style="display: flex; align-items: flex-end;">
                                <button onclick="app.clearMenuFilters()" style="width: 100%;">クリア</button>
                            </div>
                        </div>
                    </div>
                    
                    ${menuItems.length === 0 ? '<p style="color: #6b7280;">メニューがありません</p>' : `
                        <div id="menu-items-container" style="display: grid; gap: 12px;">
                            ${menuItems.map(menu => {
                                const store = stores.find(s => s.id === menu.storeId);
                                
                                // 制限情報の表示
                                const restrictions = [];
                                if (menu.unavailableDates && menu.unavailableDates.length > 0) {
                                    restrictions.push(`📅 特定日制限: ${menu.unavailableDates.length}件`);
                                }
                                if (menu.unavailableDateRanges && menu.unavailableDateRanges.length > 0) {
                                    restrictions.push(`📆 期間制限: ${menu.unavailableDateRanges.length}件`);
                                }
                                if (menu.unavailableWeekdays && menu.unavailableWeekdays.length > 0) {
                                    const dayNames = {mon: '月', tue: '火', wed: '水', thu: '木', fri: '金', sat: '土', sun: '日'};
                                    const days = menu.unavailableWeekdays.map(d => dayNames[d]).join(',');
                                    restrictions.push(`📋 曜日制限: ${days}`);
                                }
                                if (menu.unavailableTimeRanges && menu.unavailableTimeRanges.length > 0) {
                                    restrictions.push(`⏰ 時間制限: ${menu.unavailableTimeRanges.length}件`);
                                }
                                
                                const priceDisplay = menu.originalPrice ? 
                                    `<div style="color: #ef4444; font-size: 14px; text-decoration: line-through;">¥${menu.originalPrice.toLocaleString()}</div>
                                     <p style="color: #ef4444; font-size: 18px; font-weight: bold;">¥${menu.price.toLocaleString()} <span style="font-size: 12px; background: #fef2f2; padding: 2px 6px; border-radius: 3px;">値引き中</span></p>` :
                                    `<p style="color: #3b82f6; font-size: 18px; font-weight: bold;">¥${menu.price.toLocaleString()}</p>`;
                                
                                return `
                                    <div class="menu-item-card card" 
                                         data-store-id="${menu.storeId}"
                                         data-menu-name="${menu.name.toLowerCase()}"
                                         data-price="${menu.price}"
                                         data-active="${menu.active ? 'active' : 'inactive'}"
                                         style="background: ${menu.active ? '#f9fafb' : '#fee2e2'};">
                                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px; gap: 15px;">
                                            ${menu.image ? `
                                                <div style="flex-shrink: 0;">
                                                    <img src="${menu.image}" alt="${menu.name}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; border: 2px solid #e5e7eb;">
                                                </div>
                                            ` : ''}
                                            <div style="flex: 1;">
                                                <h4 style="margin-bottom: 4px;">${menu.name}</h4>
                                                <p style="color: #6b7280; font-size: 14px; margin-bottom: 4px;">${store?.name || '不明な店舗'}</p>
                                                ${priceDisplay}
                                                <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">${menu.description || ''}</p>
                                                ${restrictions.length > 0 ? `
                                                    <div style="margin-top: 8px; padding: 8px; background: #fef3c7; border-radius: 6px; font-size: 12px;">
                                                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                                            <strong>⚠️ 注文制限あり:</strong>
                                                            <button onclick="app.clearMenuRestrictions('${menu.id}')" style="
                                                                padding: 4px 8px;
                                                                background: #ef4444;
                                                                color: white;
                                                                border: none;
                                                                border-radius: 4px;
                                                                font-size: 11px;
                                                                cursor: pointer;
                                                            ">全解除</button>
                                                        </div>
                                                        ${restrictions.join('<br>')}
                                                    </div>
                                                ` : ''}
                                            </div>
                                            <div style="display: flex; gap: 8px; flex-direction: column;">
                                                <button onclick="app.handleToggleMenuActive('${menu.id}')" 
                                                        style="padding: 8px 16px; ${menu.active ? 'background: #f59e0b;' : 'background: #10b981;'}">
                                                    ${menu.active ? '非公開' : '公開'}
                                                </button>
                                                <button onclick="app.handleEditMenu('${menu.id}')" 
                                                        style="padding: 8px 16px; background: #3b82f6;">
                                                    編集
                                                </button>
                                                <button onclick="app.handleDeleteMenu('${menu.id}')" 
                                                        class="danger" style="padding: 8px 16px;">
                                                    削除
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `}
                </div>
            </div>
            
            ${this.renderAdminBottomNav('menu-management')}
        `;
    }

    async handleAddMenu() {
        const storeSelect = document.getElementById('new-menu-store');
        const nameInput = document.getElementById('new-menu-name');
        const priceInput = document.getElementById('new-menu-price');
        const descInput = document.getElementById('new-menu-description');
        
        const menuData = {
            storeId: storeSelect?.value || '',
            name: nameInput?.value?.trim() || '',
            price: parseInt(priceInput?.value) || 0,
            description: descInput?.value?.trim() || ''
        };
        
        // バリデーション
        if (!menuData.storeId) {
            alert('❗ 店舗を選択してください');
            storeSelect?.focus();
            return;
        }
        
        if (!menuData.name) {
            alert('❗ メニュー名を入力してください');
            nameInput?.focus();
            return;
        }
        
        if (menuData.name.length < 2) {
            alert('❗ メニュー名は2文字以上で入力してください');
            nameInput?.focus();
            return;
        }
        
        if (!menuData.price || menuData.price <= 0) {
            alert('❗ 価格を正しく入力してください（1円以上）');
            priceInput?.focus();
            return;
        }
        
        if (menuData.price > 10000) {
            alert('❗ 価格は10,000円以下で入力してください');
            priceInput?.focus();
            return;
        }
        
        // 画像アップロード処理
        const imageFile = document.getElementById('new-menu-image').files[0];
        if (imageFile) {
            const imageData = await this.uploadImage(imageFile);
            if (imageData) {
                menuData.image = imageData;
            }
        }
        
        const result = await this.api.addMenu(menuData);
        
        if (result.success) {
            alert('✅ メニューを追加しました');
            this.app.showMenuManagement();
        } else {
            alert('エラー: ' + result.error);
        }
    }
    
    // メニュー追加専用画面（より詳しい追加フォーム）
    async renderMenuAdd() {
        const storesResult = await this.api.getStores();
        const stores = storesResult.success ? storesResult.stores : [];

        return `
            <div class="header">
                <div class="header-content">
                    <div class="header-title">➕ メニューの追加</div>
                    <button onclick="app.showMenuManagement()">メニュー管理に戻る</button>
                </div>
            </div>
            <div class="container">
                <div class="card">
                    <div class="card-header">新規メニュー登録フォーム</div>
                    <div class="form-group">
                        <label>店舗</label>
                        <select id="add-menu-store" style="width:100%; padding:8px;">
                            ${stores.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>メニュー名</label>
                        <input type="text" id="add-menu-name" placeholder="例: 唐揚げ定食">
                    </div>
                    <div class="form-group">
                        <label>価格（円）</label>
                        <input type="number" id="add-menu-price" placeholder="650">
                    </div>
                    <div class="form-group">
                        <label>説明</label>
                        <textarea id="add-menu-desc" rows="4" style="width:100%;"></textarea>
                    </div>
                    <div class="form-group">
                        <label>画像</label>
                        <input type="file" id="add-menu-image" accept="image/*">
                        <div id="add-menu-image-preview" style="margin-top:8px;"></div>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button class="success" onclick="app.handleAddMenuFromAddPage()">登録する</button>
                        <button onclick="app.showMenuManagement()">キャンセル</button>
                    </div>
                    <div id="add-menu-result" style="margin-top:12px;"></div>
                </div>
            </div>
            ${this.renderAdminBottomNav('menu-management')}
        `;
    }

    async handleAddMenuFromAddPage() {
        const storeId = (document.getElementById('add-menu-store')||{}).value || '';
        const name = (document.getElementById('add-menu-name')||{}).value || '';
        const price = parseInt((document.getElementById('add-menu-price')||{}).value) || 0;
        const description = (document.getElementById('add-menu-desc')||{}).value || '';

        if (!storeId || !name || !price) {
            alert('店舗・メニュー名・価格は必須です');
            return;
        }

        const imageFile = (document.getElementById('add-menu-image')||{}).files && document.getElementById('add-menu-image').files[0];
        let imageData = null;
        if (imageFile) imageData = await this.uploadImage(imageFile);

        const result = await this.api.addMenu({ storeId, name, price, description, image: imageData });

        if (result.success) {
            document.getElementById('add-menu-result').innerHTML = '<div class="success-message">✅ メニューを追加しました</div>';
            setTimeout(()=> this.app.showMenuManagement(), 800);
        } else {
            document.getElementById('add-menu-result').innerHTML = '<div class="error-message">❌ '+(result.error||'追加に失敗しました')+'</div>';
        }
    }

    // メニュー価格管理画面
    async renderMenuPricing() {
        const menuResult = await this.api.getMenu();
        const menuItems = menuResult.success ? menuResult.items : [];

        return `
            <div class="header">
                <div class="header-content">
                    <div class="header-title">💱 メニュー価格設定</div>
                    <button onclick="app.showMenuManagement()">メニュー管理に戻る</button>
                </div>
            </div>
            <div class="container">
                <div class="card">
                    <div class="card-header">価格一括編集</div>
                    ${menuItems.length === 0 ? '<p style="color:#6b7280;">メニューがありません</p>' : `
                        <div style="display:grid; gap:10px;">
                            ${menuItems.map(m => `
                                <div style="display:flex; gap:8px; align-items:center; padding:8px; background:#f9fafb; border-radius:6px;">
                                    <div style="flex:1;">
                                        <div><strong>${m.name}</strong> <span style="color:#6b7280; font-size:12px;">(¥${m.price})</span></div>
                                        <div style="font-size:12px; color:#6b7280;">${m.storeName || ''}</div>
                                    </div>
                                    <input type="number" id="price-${m.id}" value="${m.price}" style="width:100px; padding:6px;">
                                    <button onclick="app.updateMenuPrice('${m.id}')">更新</button>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>
            ${this.renderAdminBottomNav('menu-management')}
        `;
    }

    async updateMenuPrice(menuId) {
        const val = parseInt((document.getElementById('price-'+menuId)||{}).value) || 0;
        if (!val || val <= 0) { alert('価格を正しく入力してください'); return; }
        const res = await this.api.updateMenu(menuId, { price: val });
        if (res.success) { alert('✅ 更新しました'); this.app.showMenuManagement(); } else { alert('エラー: '+res.error); }
    }
    
    async uploadImage(file) {
        // ファイルサイズチェック（5MB制限）
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            alert(`❌ 画像サイズが大きすぎます（最大5MB）\n現在: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
            return null;
        }
        
        // ファイル形式チェック
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            alert('❌ 対応していない画像形式です（JPEG, PNG のみ）');
            return null;
        }
        
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // 画像サイズ最適化（幅800px以下に縮小）
                    const maxWidth = 800;
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > maxWidth) {
                        height = Math.floor(height * (maxWidth / width));
                        width = maxWidth;
                    }
                    
                    // Canvasで画像をリサイズ
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // 最適化されたデータURLを返す
                    const optimizedData = canvas.toDataURL('image/jpeg', 0.85); // 85%品質
                    console.log('✅ 画像を最適化:', {
                        元のサイズ: `${(file.size / 1024).toFixed(1)}KB`,
                        最適化後: `${(optimizedData.length * 0.75 / 1024).toFixed(1)}KB`,
                        サイズ: `${width}x${height}`
                    });
                    resolve(optimizedData);
                };
                img.onerror = () => {
                    alert('画像の読み込みに失敗しました');
                    resolve(null);
                };
                img.src = e.target.result;
            };
            reader.onerror = () => {
                alert('画像の読み込みに失敗しました');
                resolve(null);
            };
            reader.readAsDataURL(file);
        });
    }

    async handleEditMenu(menuId) {
        const menuResult = await this.api.getMenu();
        const menu = menuResult.items.find(m => m.id === menuId);
        
        if (!menu) {
            alert('メニューが見つかりません');
            return;
        }
        
        // 基本情報の編集（シンプルなプロンプト方式）
        const action = prompt('編集項目を選択:\n1: 基本情報（名前・価格・説明）\n2: 画像の変更\n3: 注文制限設定\n4: 値引き設定', '1');
        
        if (!action) return;
        
        switch(action) {
            case '1':
                await this.editMenuBasicInfo(menuId, menu);
                break;
            case '2':
                await this.editMenuImage(menuId, menu);
                break;
            case '3':
                await this.editMenuRestrictions(menuId, menu);
                break;
            case '4':
                await this.editMenuDiscount(menuId, menu);
                break;
            default:
                alert('無効な選択です');
        }
    }
    
    async editMenuImage(menuId, menu) {
        // 画像アップロード用の一時的なinput要素を作成
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/jpeg,image/jpg,image/png';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const imageData = await this.uploadImage(file);
            if (imageData) {
                const result = await this.api.updateMenu(menuId, {
                    image: imageData
                });
                
                if (result.success) {
                    alert('✅ 画像を更新しました');
                    this.app.showMenuManagement();
                } else {
                    alert('エラー: ' + result.error);
                }
            }
        };
        
        input.click();
    }
    
    async editMenuBasicInfo(menuId, menu) {
        const name = prompt('メニュー名', menu.name);
        if (!name) return;
        
        const price = prompt('価格（円）', menu.price);
        if (!price) return;
        
        const description = prompt('説明', menu.description || '');
        
        const result = await this.api.updateMenu(menuId, {
            name,
            price: parseInt(price),
            description
        });
        
        if (result.success) {
            alert('✅ メニューを更新しました');
            this.app.showMenuManagement();
        } else {
            alert('エラー: ' + result.error);
        }
    }
    
    async editMenuDiscount(menuId, menu) {
        const originalPrice = prompt('元の価格（円）\n※値引き表示したくない場合は空欄', menu.originalPrice || '');
        const price = prompt('現在の価格（円）', menu.price);
        
        if (!price) return;
        
        const result = await this.api.updateMenu(menuId, {
            price: parseInt(price),
            originalPrice: originalPrice ? parseInt(originalPrice) : null
        });
        
        if (result.success) {
            alert('✅ 価格を更新しました');
            this.app.showMenuManagement();
        } else {
            alert('エラー: ' + result.error);
        }
    }
    
    async editMenuRestrictions(menuId, menu) {
        // 制限タイプを選択
        const type = prompt('制限タイプを選択:\n1: 特定日付\n2: 期間\n3: 曜日\n4: 時間帯\n5: メッセージ', '1');
        
        if (!type) return;
        
        let updateData = {};
        
        switch(type) {
            case '1':
                const dates = prompt('注文不可の日付（カンマ区切り）\n例: 2024-12-25, 2025-01-01', (menu.unavailableDates || []).join(', '));
                if (dates !== null) {
                    updateData.unavailableDates = dates.split(',').map(d => d.trim()).filter(d => d);
                }
                break;
            case '2':
                const rangeStart = prompt('期間開始日（YYYY-MM-DD）');
                const rangeEnd = prompt('期間終了日（YYYY-MM-DD）');
                const rangeReason = prompt('理由（任意）');
                if (rangeStart && rangeEnd) {
                    updateData.unavailableDateRanges = [...(menu.unavailableDateRanges || []), {
                        start: rangeStart,
                        end: rangeEnd,
                        reason: rangeReason || ''
                    }];
                }
                break;
            case '3':
                const weekdays = prompt('注文不可の曜日（カンマ区切り）\n例: mon,wed,fri', (menu.unavailableWeekdays || []).join(','));
                if (weekdays !== null) {
                    updateData.unavailableWeekdays = weekdays.split(',').map(d => d.trim()).filter(d => d);
                }
                break;
            case '4':
                const timeStart = prompt('開始時刻（HH:MM）', '09:00');
                const timeEnd = prompt('終了時刻（HH:MM）', '11:00');
                if (timeStart && timeEnd) {
                    updateData.unavailableTimeRanges = [...(menu.unavailableTimeRanges || []), {
                        start: timeStart,
                        end: timeEnd
                    }];
                }
                break;
            case '5':
                const message = prompt('注文不可メッセージ', menu.closedMessage || '');
                if (message !== null) {
                    updateData.closedMessage = message || null;
                }
                break;
            default:
                alert('無効な選択です');
                return;
        }
        
        if (Object.keys(updateData).length > 0) {
            const result = await this.api.updateMenu(menuId, updateData);
            
            if (result.success) {
                alert('✅ 制限を更新しました');
                this.app.showMenuManagement();
            } else {
                alert('エラー: ' + result.error);
            }
        }
    }
    
    async clearMenuRestrictions(menuId) {
        if (!confirm('このメニューの全ての注文制限を解除しますか？')) return;
        
        const result = await this.api.updateMenu(menuId, {
            unavailableDates: [],
            unavailableDateRanges: [],
            unavailableWeekdays: [],
            unavailableTimeRanges: [],
            closedMessage: null
        });
        
        if (result.success) {
            alert('✅ 全ての制限を解除しました');
            this.app.showMenuManagement();
        } else {
            alert('エラー: ' + result.error);
        }
    }


    async handleDeleteMenu(menuId) {
        if (!confirm('このメニューを削除しますか？')) return;
        
        const result = await this.api.deleteMenu(menuId);
        
        if (result.success) {
            alert('✅ メニューを削除しました');
            this.app.showMenuManagement();
        } else {
            alert('エラー: ' + result.error);
        }
    }

    async handleToggleMenuActive(menuId) {
        const result = await this.api.toggleMenuActive(menuId);
        
        if (result.success) {
            this.app.showMenuManagement();
        } else {
            alert('エラー: ' + result.error);
        }
    }

    // ==================== 店舗管理 ====================

    async renderStoreManagement() {
        const storesResult = await this.api.getStores();
        const stores = storesResult.success ? storesResult.stores : [];
        
        return `
            <div class="header">
                <div class="header-content">
                    <div class="header-title">🏪 店舗管理</div>
                    <button onclick="app.showDashboard()">ダッシュボードに戻る</button>
                </div>
            </div>
            
            <div class="container">
                <div class="card">
                    <div class="card-header">新規店舗追加</div>
                    
                    <div class="form-group">
                        <label>店舗名</label>
                        <input type="text" id="new-store-name" placeholder="例: ○○弁当">
                    </div>
                    
                    <div class="form-group">
                        <label>連絡先電話番号</label>
                        <input type="tel" id="new-store-phone" placeholder="080-1234-5678">
                    </div>
                    
                    <button onclick="app.handleAddStore()" class="success" style="width: 100%;">
                        ➕ 店舗を追加
                    </button>
                </div>
                
                <div class="card">
                    <div class="card-header">店舗一覧</div>
                    
                    ${stores.length === 0 ? '<p style="color: #6b7280;">店舗がありません</p>' : `
                        <div style="display: grid; gap: 12px;">
                            ${stores.map(store => `
                                <div class="card" style="background: ${store.active ? '#f9fafb' : '#fee2e2'};">
                                    <div style="display: flex; justify-content: space-between; align-items: start;">
                                        <div style="flex: 1;">
                                            <h4 style="margin-bottom: 4px;">${store.name}</h4>
                                            <p style="color: #6b7280; font-size: 14px;">📞 ${store.contactPhone || '未登録'}</p>
                                        </div>
                                        <div style="display: flex; gap: 8px;">
                                            <button onclick="app.handleToggleStoreActive('${store.id}')" 
                                                    style="padding: 8px 16px; ${store.active ? 'background: #f59e0b;' : 'background: #10b981;'}">
                                                ${store.active ? '非公開' : '公開'}
                                            </button>
                                            <button onclick="app.handleEditStore('${store.id}')" 
                                                    style="padding: 8px 16px; background: #3b82f6;">
                                                編集
                                            </button>
                                            <button onclick="app.handleDeleteStore('${store.id}')" 
                                                    class="danger" style="padding: 8px 16px;">
                                                削除
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>
            
            ${this.renderAdminBottomNav('store-management')}
        `;
    }

    // 店舗ごとの設定登録・更新画面
    async renderStoreSettings() {
        const storesResult = await this.api.getStores();
        const stores = storesResult.success ? storesResult.stores : [];

        return `
            <div class="header">
                <div class="header-content">
                    <div class="header-title">🏬 店舗設定</div>
                    <button onclick="app.showStoreManagement()">店舗管理に戻る</button>
                </div>
            </div>
            <div class="container">
                <div class="card">
                    <div class="card-header">店舗ごとの設定一覧</div>
                    ${stores.length === 0 ? '<p style="color:#6b7280;">店舗がありません</p>' : `
                        <div style="display:grid; gap:12px;">
                            ${stores.map(s => `
                                <div class="card" style="display:flex; justify-content:space-between; align-items:center;">
                                    <div>
                                        <strong>${s.name}</strong>
                                        <div style="font-size:12px; color:#6b7280;">📞 ${s.contactPhone||'未登録'}</div>
                                    </div>
                                    <div style="display:flex; gap:8px;">
                                        <button onclick="app.editStoreSettings('${s.id}')">編集</button>
                                        <button onclick="app.showStoreContact('${s.id}')">問い合わせ一覧</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>
            ${this.renderAdminBottomNav('store-management')}
        `;
    }

    async editStoreSettings(storeId) {
        const storesResult = await this.api.getStores();
        const store = storesResult.success ? storesResult.stores.find(s=>s.id===storeId) : null;
        if (!store) { alert('店舗が見つかりません'); return; }

        const name = prompt('店舗名', store.name);
        if (!name) return;
        const phone = prompt('連絡先電話番号', store.contactPhone || '');

        const res = await this.api.updateStore(storeId, { name, contactPhone: phone });
        if (res.success) { alert('✅ 保存しました'); this.app.showStoreManagement(); } else { alert('エラー: '+res.error); }
    }

    // 店舗からの問い合わせ一覧（簡易表示）
    async renderStoreContact(storeId) {
        // 可能なら API を呼ぶ（getStoreInquiries 等）、なければダミー表示
        let inquiries = [];
        if (this.api.getStoreInquiries) {
            const r = await this.api.getStoreInquiries(storeId);
            if (r.success) inquiries = r.inquiries || [];
        }

        return `
            <div class="header">
                <div class="header-content">
                    <div class="header-title">📩 店舗問い合わせ</div>
                    <button onclick="app.showStoreManagement()">店舗管理に戻る</button>
                </div>
            </div>
            <div class="container">
                <div class="card">
                    <div class="card-header">店舗からの問い合わせ一覧</div>
                    ${inquiries.length === 0 ? '<p style="color:#6b7280;">問い合わせはありません</p>' : `
                        <div style="display:grid; gap:10px;">
                            ${inquiries.map(q => `
                                <div style="padding:10px; background:#f9fafb; border-radius:6px;">
                                    <div style="font-size:13px; color:#6b7280;">${new Date(q.createdAt).toLocaleString()}</div>
                                    <div><strong>${q.subject||'無題'}</strong></div>
                                    <div style="margin-top:6px;">${q.message}</div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>
            ${this.renderAdminBottomNav('store-management')}
        `;
    }

    async handleAddStore() {
        const nameInput = document.getElementById('new-store-name');
        const phoneInput = document.getElementById('new-store-phone');
        
        const storeData = {
            name: nameInput?.value?.trim() || '',
            contactPhone: phoneInput?.value?.trim() || ''
        };
        
        if (!storeData.name) {
            alert('❗ 店舗名を入力してください');
            nameInput?.focus();
            return;
        }
        
        if (storeData.name.length < 2) {
            alert('❗ 店舗名は2文字以上で入力してください');
            nameInput?.focus();
            return;
        }
        
        const result = await this.api.addStore(storeData);
        
        if (result.success) {
            alert('✅ 店舗を追加しました');
            this.app.showStoreManagement();
        } else {
            alert('❌ エラー: ' + (result.error || '店舗の追加に失敗しました'));
        }
    }

    async handleEditStore(storeId) {
        const storesResult = await this.api.getStores();
        const store = storesResult.stores.find(s => s.id === storeId);
        
        if (!store) {
            alert('店舗が見つかりません');
            return;
        }
        
        const name = prompt('店舗名', store.name);
        if (!name) return;
        
        const contactPhone = prompt('連絡先電話番号', store.contactPhone);
        
        const result = await this.api.updateStore(storeId, {
            name,
            contactPhone
        });
        
        if (result.success) {
            alert('✅ 店舗を更新しました');
            this.app.showStoreManagement();
        } else {
            alert('エラー: ' + result.error);
        }
    }

    async handleDeleteStore(storeId) {
        if (!confirm('この店舗を削除しますか？\n※この店舗のメニューも表示されなくなります')) return;
        
        const result = await this.api.deleteStore(storeId);
        
        if (result.success) {
            alert('✅ 店舗を削除しました');
            this.app.showStoreManagement();
        } else {
            alert('エラー: ' + result.error);
        }
    }

    async handleToggleStoreActive(storeId) {
        const result = await this.api.toggleStoreActive(storeId);
        
        if (result.success) {
            this.app.showStoreManagement();
        } else {
            alert('エラー: ' + result.error);
        }
    }
    
    // ログ閲覧画面
    async renderLogs() {
        const result = await this.api.getLogs(null, 100);
        const logs = result.success ? result.logs : [];
        
        return `
            <div class="header">
                <div class="header-content">
                    <div class="header-title">📋 ログ閲覧</div>
                    <button onclick="app.showDashboard()">ダッシュボードに戻る</button>
                </div>
            </div>
            
            <div class="container">
                <div class="card">
                    <div class="card-header">操作ログ</div>
                    
                    <!-- ログフィルター -->
                    <div style="margin-bottom: 20px; padding: 15px; background: #f9fafb; border-radius: 8px;">
                        <h4 style="margin-bottom: 10px;">🔍 フィルター</h4>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 10px;">
                            <div class="form-group">
                                <label>種類</label>
                                <select id="filter-log-type" onchange="app.applyLogFilters()">
                                    <option value="">すべて</option>
                                    <option value="order">注文</option>
                                    <option value="admin">管理者</option>
                                    <option value="menu">メニュー</option>
                                    <option value="store">店舗</option>
                                    <option value="settings">設定</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>操作</label>
                                <select id="filter-log-action" onchange="app.applyLogFilters()">
                                    <option value="">すべて</option>
                                    <option value="create">作成</option>
                                    <option value="update">更新</option>
                                    <option value="delete">削除</option>
                                    <option value="payment">決済</option>
                                    <option value="pickup">受取</option>
                                    <option value="cancel">キャンセル</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>日付</label>
                                <input type="date" id="filter-log-date" onchange="app.applyLogFilters()">
                            </div>
                            <div class="form-group">
                                <label>キーワード</label>
                                <input type="text" id="filter-log-keyword" placeholder="検索" oninput="app.applyLogFilters()">
                            </div>
                            <div style="display: flex; align-items: flex-end;">
                                <button onclick="app.clearLogFilters()" style="width: 100%;">クリア</button>
                            </div>
                        </div>
                        <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                            <button onclick="app.quickFilterLogs(null)" style="padding: 5px 10px; font-size: 12px;">全て</button>
                            <button onclick="app.quickFilterLogs('order')" style="padding: 5px 10px; font-size: 12px;">注文</button>
                            <button onclick="app.quickFilterLogs('admin')" style="padding: 5px 10px; font-size: 12px;">管理者</button>
                            <button onclick="app.quickFilterLogs('menu')" style="padding: 5px 10px; font-size: 12px;">メニュー</button>
                            <button onclick="app.quickFilterLogs('store')" style="padding: 5px 10px; font-size: 12px;">店舗</button>
                            <button onclick="app.quickFilterLogs('settings')" style="padding: 5px 10px; font-size: 12px;">設定</button>
                        </div>
                        <div style="margin-top: 10px; color: #6b7280; font-size: 13px;">
                            <span id="log-count">全${logs.length}件</span>のログ
                        </div>
                    </div>
                    
                    ${logs.length === 0 ? `
                        <div class="info-box">ログがありません</div>
                    ` : `
                        <div id="logs-container" style="max-height: 600px; overflow-y: auto;">
                            ${logs.map(log => this.renderLogItem(log)).join('')}
                        </div>
                    `}
                </div>
            </div>
            ${this.renderAdminBottomNav('logs')}
        `;
    }
    
    async renderLogsFiltered(type) {
        const result = await this.api.getLogs(type, 100);
        const logs = result.success ? result.logs : [];
        
        return `
            <div class="header">
                <div class="header-content">
                    <div class="header-title">📋 ログ閲覧 - ${this.getLogTypeLabel(type)}</div>
                    <button onclick="app.showDashboard()">ダッシュボードに戻る</button>
                </div>
            </div>
            
            <div class="container">
                <div class="card">
                    <div class="card-header">${this.getLogTypeLabel(type)}ログ</div>
                    
                    <div style="margin-bottom: 15px; display: flex; gap: 10px;">
                        <button onclick="app.showLogs(null)" style="flex: 1;">全て</button>
                        <button onclick="app.showLogs('order')" style="flex: 1;">注文</button>
                        <button onclick="app.showLogs('admin')" style="flex: 1;">管理者</button>
                        <button onclick="app.showLogs('menu')" style="flex: 1;">メニュー</button>
                        <button onclick="app.showLogs('store')" style="flex: 1;">店舗</button>
                        <button onclick="app.showLogs('settings')" style="flex: 1;">設定</button>
                    </div>
                    
                    ${logs.length === 0 ? `
                        <div class="info-box">ログがありません</div>
                    ` : `
                        <div style="max-height: 600px; overflow-y: auto;">
                            ${logs.map(log => this.renderLogItem(log)).join('')}
                        </div>
                    `}
                </div>
            </div>
            ${this.renderAdminBottomNav('logs')}
        `;
    }
    
    renderLogItem(log) {
        const typeColor = {
            'order': '#3b82f6',
            'admin': '#8b5cf6',
            'menu': '#f59e0b',
            'store': '#ec4899',
            'settings': '#10b981'
        }[log.type] || '#6b7280';
        
        const actionLabel = {
            'create': '作成',
            'update': '更新',
            'delete': '削除',
            'payment': '決済',
            'pickup': '受取',
            'approve': '承認',
            'reject': '拒否',
            'toggle': '切替'
        }[log.action] || log.action;
        
        return `
            <div class="log-item"
                 data-log-type="${log.type}"
                 data-log-action="${log.action}"
                 data-log-date="${new Date(log.timestamp).toISOString().split('T')[0]}"
                 data-log-text="${JSON.stringify(log.details).toLowerCase()}"
                 style="
                padding: 12px;
                margin-bottom: 10px;
                background: #f9fafb;
                border-left: 4px solid ${typeColor};
                border-radius: 4px;
            ">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                    <div>
                        <span style="
                            background: ${typeColor};
                            color: white;
                            padding: 2px 8px;
                            border-radius: 4px;
                            font-size: 12px;
                            font-weight: bold;
                        ">${this.getLogTypeLabel(log.type)}</span>
                        <span style="
                            background: #e5e7eb;
                            padding: 2px 8px;
                            border-radius: 4px;
                            font-size: 12px;
                            margin-left: 8px;
                        ">${actionLabel}</span>
                    </div>
                    <div style="font-size: 12px; color: #6b7280;">
                        ${new Date(log.timestamp).toLocaleString('ja-JP')}
                    </div>
                </div>
                <div style="font-size: 14px; color: #374151;">
                    ${this.formatLogDetails(log)}
                </div>
                ${log.adminEmail ? `
                    <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
                        操作者: ${log.adminEmail}
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    getLogTypeLabel(type) {
        return {
            'order': '注文',
            'admin': '管理者',
            'menu': 'メニュー',
            'store': '店舗',
            'settings': '設定'
        }[type] || type;
    }
    
    formatLogDetails(log) {
        const d = log.details;
        
        switch (log.type) {
            case 'order':
                if (log.action === 'create') {
                    return `注文番号: ${d.orderCode || d.intakeCode} / 商品数: ${d.items}点 / 合計: ¥${d.totalAmount?.toLocaleString()}`;
                } else if (log.action === 'payment') {
                    return `注文番号: ${d.orderCode} / 金額: ¥${d.totalAmount?.toLocaleString()}`;
                } else if (log.action === 'pickup') {
                    return `注文番号: ${d.orderCode}`;
                }
                break;
                
            case 'admin':
                if (log.action === 'approve') {
                    return `管理者を承認しました: ${d.adminEmail}`;
                } else if (log.action === 'reject') {
                    return `管理者登録を拒否しました (ID: ${d.adminId})`;
                }
                break;
                
            case 'menu':
                if (log.action === 'create') {
                    return `メニュー追加: ${d.name} (¥${d.price})`;
                } else if (log.action === 'update') {
                    return `メニュー更新: ${d.name}`;
                } else if (log.action === 'delete') {
                    return `メニュー削除: ${d.name}`;
                } else if (log.action === 'toggle') {
                    return `メニュー切替: ${d.name} → ${d.active ? '公開' : '非公開'}`;
                }
                break;
                
            case 'store':
                if (log.action === 'create') {
                    return `店舗追加: ${d.name}`;
                } else if (log.action === 'update') {
                    return `店舗更新: ${d.name}`;
                } else if (log.action === 'delete') {
                    return `店舗削除: ${d.name}`;
                }
                break;
                
            case 'settings':
                if (d.type === 'システムメッセージ') {
                    return `システムメッセージを更新: ${d.message?.title || '(タイトルなし)'}`;
                } else if (d.type === '営業時間') {
                    return `営業時間を更新しました`;
                }
                break;
        }
        
        return JSON.stringify(d);
    }
    
    // 店舗通知画面
    async renderStoreNotifications() {
        const ordersResult = await this.api.getOrders();
        const orders = ordersResult.success ? ordersResult.orders : [];
        
        const today = new Date().toLocaleDateString('ja-JP');
        const todayOrders = orders.filter(o => {
            const orderDate = new Date(o.createdAt).toLocaleDateString('ja-JP');
            return orderDate === today && o.status !== 'CANCELLED';
        });
        
        // 店舗別に集計
        const storeOrders = {};
        todayOrders.forEach(order => {
            order.items.forEach(item => {
                const storeId = item.storeId;
                if (!storeOrders[storeId]) {
                    storeOrders[storeId] = {
                        storeName: item.storeName || storeId,
                        items: {}
                    };
                }
                
                const menuKey = item.menuName;
                if (!storeOrders[storeId].items[menuKey]) {
                    storeOrders[storeId].items[menuKey] = {
                        name: item.menuName,
                        count: 0,
                        price: item.price
                    };
                }
                storeOrders[storeId].items[menuKey].count += item.quantity;
            });
        });
        
        return `
            <div class="header">
                <div class="header-content">
                    <div class="header-title">🔔 店舗通知 (${today})</div>
                    <button onclick="app.showDashboard()">ダッシュボードに戻る</button>
                </div>
            </div>
            
            <div class="container">
                <div class="info-box">
                    <strong>📢 この画面を店舗に見せて注文を確認してもらえます</strong><br>
                    印刷して店舗に渡すことも可能です
                </div>
                
                <button onclick="window.print()" style="margin-bottom: 20px;">🖨️ 印刷</button>
                
                ${Object.keys(storeOrders).length === 0 ? `
                    <div class="card">
                        <p style="color: #6b7280;">本日の注文はまだありません</p>
                    </div>
                ` : Object.entries(storeOrders).map(([storeId, data]) => `
                    <div class="card" style="margin-bottom: 20px; page-break-after: always;">
                        <div class="card-header" style="font-size: 1.3em;">
                            ${data.storeName} 様
                        </div>
                        
                        <p style="margin-bottom: 15px; color: #6b7280;">
                            本日（${today}）の注文内容です
                        </p>
                        
                        <table>
                            <thead>
                                <tr>
                                    <th>メニュー</th>
                                    <th style="text-align: right;">個数</th>
                                    <th style="text-align: right;">単価</th>
                                    <th style="text-align: right;">小計</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${Object.values(data.items).map(item => `
                                    <tr>
                                        <td><strong>${item.name}</strong></td>
                                        <td style="text-align: right; font-size: 1.2em; font-weight: bold;">${item.count}個</td>
                                        <td style="text-align: right;">¥${item.price.toLocaleString()}</td>
                                        <td style="text-align: right;">¥${(item.price * item.count).toLocaleString()}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot>
                                <tr style="font-weight: bold; font-size: 1.1em;">
                                    <td colspan="3" style="text-align: right;">合計</td>
                                    <td style="text-align: right;">
                                        ¥${Object.values(data.items).reduce((sum, item) => 
                                            sum + (item.price * item.count), 0).toLocaleString()}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                        
                        <div style="margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 5px;">
                            <strong>受取時間:</strong> 11:30〜13:30<br>
                            <strong>受取場所:</strong> 大学内コンビニ下の空きスペース
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // 売上レポート画面
    async renderReports() {
        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = weekAgo.toISOString().split('T')[0];
        
        return `
            <div class="header">
                <div class="header-content">
                    <div class="header-title">📊 売上レポート</div>
                    <button onclick="app.showDashboard()">ダッシュボードに戻る</button>
                </div>
            </div>
            
            <div class="container">
                <div class="card">
                    <div class="card-header">期間指定</div>
                    
                    <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                        <div style="flex: 1;">
                            <label>開始日</label>
                            <input type="date" id="report-start-date" value="${weekAgoStr}" style="width: 100%;">
                        </div>
                        <div style="flex: 1;">
                            <label>終了日</label>
                            <input type="date" id="report-end-date" value="${today}" style="width: 100%;">
                        </div>
                    </div>
                    
                    <button onclick="app.generateReport()" class="full-width">📊 レポート生成</button>
                </div>
                
                <div id="report-result"></div>
            </div>
            
            ${this.renderAdminBottomNav('reports')}
        `;
    }
    
    async generateReport() {
        const startDate = document.getElementById('report-start-date').value;
        const endDate = document.getElementById('report-end-date').value;
        
        if (!startDate || !endDate) {
            alert('期間を指定してください');
            return;
        }
        
        const result = await this.api.getSalesReport(startDate, endDate);
        
        if (!result.success) {
            document.getElementById('report-result').innerHTML = `
                <div class="card" style="margin-top: 20px;">
                    <div class="error-message">${result.error}</div>
                </div>
            `;
            return;
        }
        
        const report = result.report;
        
        document.getElementById('report-result').innerHTML = `
            <div class="card" style="margin-top: 20px;">
                <div class="card-header">📈 集計結果</div>
                
                <div class="stats-grid" style="margin-bottom: 30px;">
                    <div class="stat-card">
                        <div class="stat-value" style="color: #3b82f6;">${report.summary.totalOrders}</div>
                        <div class="stat-label">総注文数</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" style="color: #10b981;">¥${report.summary.totalSales.toLocaleString()}</div>
                        <div class="stat-label">総売上</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" style="color: #f59e0b;">${report.summary.totalItems}</div>
                        <div class="stat-label">総販売個数</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" style="color: #8b5cf6;">¥${Math.round(report.summary.totalSales / report.summary.totalOrders || 0).toLocaleString()}</div>
                        <div class="stat-label">平均注文額</div>
                    </div>
                </div>
                
                <button onclick="app.printReport()" style="margin-bottom: 20px;">🖨️ 印刷</button>
                
                <h3 style="margin: 30px 0 15px;">日別売上</h3>
                <table>
                    <thead>
                        <tr>
                            <th>日付</th>
                            <th style="text-align: right;">注文数</th>
                            <th style="text-align: right;">販売個数</th>
                            <th style="text-align: right;">売上</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${report.daily.sort((a, b) => b.date.localeCompare(a.date)).map(day => `
                            <tr>
                                <td>${day.date}</td>
                                <td style="text-align: right;">${day.count}件</td>
                                <td style="text-align: right;">${day.items}個</td>
                                <td style="text-align: right; font-weight: bold;">¥${day.total.toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <h3 style="margin: 30px 0 15px;">店舗別売上</h3>
                <table>
                    <thead>
                        <tr>
                            <th>店舗</th>
                            <th style="text-align: right;">販売個数</th>
                            <th style="text-align: right;">売上</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${report.byStore.sort((a, b) => b.total - a.total).map(store => `
                            <tr>
                                <td>${store.storeName}</td>
                                <td style="text-align: right;">${store.count}個</td>
                                <td style="text-align: right; font-weight: bold;">¥${store.total.toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <h3 style="margin: 30px 0 15px;">メニュー別売上 (TOP10)</h3>
                <table>
                    <thead>
                        <tr>
                            <th>メニュー</th>
                            <th style="text-align: right;">販売個数</th>
                            <th style="text-align: right;">売上</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${report.byMenu.sort((a, b) => b.count - a.count).slice(0, 10).map(menu => `
                            <tr>
                                <td>${menu.menuName}</td>
                                <td style="text-align: right;">${menu.count}個</td>
                                <td style="text-align: right; font-weight: bold;">¥${menu.total.toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ${this.renderAdminBottomNav('reports')}
        `;
    }
    
    // 詳細設定画面
    async renderAdvancedSettings() {
        const policyResult = await this.api.getCancelPolicy();
        const specialDaysResult = await this.api.getSpecialDays();
        
        const policy = policyResult.success ? policyResult.policy : { enabled: true, timeLimit: 30, beforePickupHours: 24 };
        const specialDays = specialDaysResult.success ? specialDaysResult.days : [];
        
        return `
            <div class="header">
                <div class="header-content">
                    <div class="header-title">🛠️ 詳細設定</div>
                    <button onclick="app.showDashboard()">ダッシュボードに戻る</button>
                </div>
            </div>
            
            <div class="container">
                <!-- キャンセルポリシー -->
                <div class="card">
                    <div class="card-header">キャンセル・変更ポリシー</div>
                    
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="cancel-enabled" ${policy.enabled ? 'checked' : ''}>
                            キャンセル機能を有効にする
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label>注文後の変更可能時間（分）</label>
                        <input type="number" id="cancel-time-limit" value="${policy.timeLimit}" min="0" max="1440">
                        <small style="color: #6b7280;">※ 注文後この時間内であれば変更・キャンセル可能</small>
                    </div>
                    
                    <div class="form-group">
                        <label>受取前のキャンセル期限（時間）</label>
                        <input type="number" id="cancel-before-pickup" value="${policy.beforePickupHours}" min="0" max="168">
                        <small style="color: #6b7280;">※ 受取時刻の何時間前までキャンセル可能か</small>
                    </div>
                    
                    <button onclick="app.saveCancelPolicy()" class="full-width">保存</button>
                </div>
                
                <!-- 特定日営業設定 -->
                <div class="card" style="margin-top: 20px;">
                    <div class="card-header">特定日の営業設定</div>
                    
                    <div class="info-box">
                        <strong>💡 使い方:</strong><br>
                        • 通常休業日に臨時営業する場合は「営業する」を選択<br>
                        • 通常営業日に臨時休業する場合は「休業する」を選択
                    </div>
                    
                    <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                        <input type="date" id="special-day-date" style="flex: 1;">
                        <select id="special-day-open" style="flex: 1;">
                            <option value="true">営業する</option>
                            <option value="false">休業する</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>理由（任意）</label>
                        <input type="text" id="special-day-reason" placeholder="例: 学園祭のため営業">
                    </div>
                    
                    <button onclick="app.addSpecialDay()" class="full-width">追加</button>
                    
                    ${specialDays.length > 0 ? `
                        <h4 style="margin: 20px 0 10px;">設定済みの特定日</h4>
                        <table>
                            <thead>
                                <tr>
                                    <th>日付</th>
                                    <th>状態</th>
                                    <th>理由</th>
                                    <th style="width: 80px;">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${specialDays.sort((a, b) => a.date.localeCompare(b.date)).map(day => `
                                    <tr>
                                        <td>${day.date}</td>
                                        <td>
                                            <span class="status-badge ${day.open ? 'status-picked' : 'status-expired'}">
                                                ${day.open ? '営業' : '休業'}
                                            </span>
                                        </td>
                                        <td>${day.reason || '-'}</td>
                                        <td>
                                            <button onclick="app.deleteSpecialDay('${day.date}')" class="danger" style="padding: 5px 10px;">削除</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : '<p style="color: #6b7280; margin-top: 15px;">特定日の設定はありません</p>'}
                </div>
                
                <!-- データ管理 -->
                <div class="card" style="margin-top: 20px;">
                    <div class="card-header">データ管理</div>
                    
                    <div class="warning-message">
                        <strong>⚠️ 注意:</strong><br>
                        古いデータを削除すると復元できません。必要なデータは事前にレポート出力して保存してください。
                    </div>
                    
                    <div class="form-group">
                        <label>削除する期間（日数）</label>
                        <input type="number" id="cleanup-days" value="30" min="1" max="365">
                        <small style="color: #6b7280;">※ この日数より古いデータを削除します</small>
                    </div>
                    
                    <button onclick="app.cleanupData()" class="danger full-width">古いデータを削除</button>
                </div>
            </div>
            
            ${this.renderAdminBottomNav('settings')}
        `;
    }
    
    async saveCancelPolicy() {
        const policy = {
            enabled: document.getElementById('cancel-enabled').checked,
            timeLimit: parseInt(document.getElementById('cancel-time-limit').value),
            beforePickupHours: parseInt(document.getElementById('cancel-before-pickup').value)
        };
        
        const result = await this.api.updateCancelPolicy(policy);
        
        if (result.success) {
            alert('✅ キャンセルポリシーを保存しました');
            this.app.showDashboard();
        } else {
            alert('❌ ' + result.error);
        }
    }
    
    async addSpecialDay() {
        const date = document.getElementById('special-day-date').value;
        const open = document.getElementById('special-day-open').value === 'true';
        const reason = document.getElementById('special-day-reason').value;
        
        if (!date) {
            alert('日付を選択してください');
            return;
        }
        
        const result = await this.api.addSpecialDay(date, open, reason);
        
        if (result.success) {
            alert('✅ 追加しました');
            this.app.showAdvancedSettings();
        } else {
            alert('❌ ' + result.error);
        }
    }
    
    async deleteSpecialDay(date) {
        if (!confirm('この設定を削除しますか?')) return;
        
        const result = await this.api.deleteSpecialDay(date);
        
        if (result.success) {
            alert('✅ 削除しました');
            this.app.showAdvancedSettings();
        } else {
            alert('❌ ' + result.error);
        }
    }
    
    async cleanupData() {
        const days = parseInt(document.getElementById('cleanup-days').value);
        
        if (!confirm(`${days}日より古いデータを削除します。\nこの操作は取り消せません。よろしいですか？`)) {
            return;
        }
        
        const result = await this.api.cleanupOldData(days);
        
        
        if (result.success) {
            alert(`✅ ${result.deleted.intakes}件の受付と${result.deleted.orders}件の注文を削除しました`);
        } else {
            alert('❌ ' + result.error);
        }
    }

    renderAdminBottomNav(currentView) {
        const navItems = [
            { id: 'dashboard', icon: '🏠', label: 'ホーム', action: 'app.showDashboard()' },
            { id: 'counter', icon: '📝', label: '窓口', action: 'app.showCounter()' },
            { id: 'pickup', icon: '📦', label: '受取', action: 'app.showPickup()' },
            { id: 'reports', icon: '📊', label: 'レポート', action: 'app.showReports()' },
            { id: 'logs', icon: '📋', label: 'ログ', action: 'app.showLogs()' },
            { id: 'settings', icon: '⚙️', label: '設定', action: 'app.showSettings()' }
        ];

        return `
            <nav class="bottom-nav">
                <div class="bottom-nav-content">
                    ${navItems.map(item => `
                        <div class="bottom-nav-item ${currentView === item.id ? 'active' : ''}" 
                             onclick="${item.action}">
                            <span class="bottom-nav-icon">${item.icon}</span>
                            <span class="bottom-nav-label">${item.label}</span>
                        </div>
                    `).join('')}
                </div>
            </nav>
        `;
    }
    
    // ==================== 店舗別注文閲覧 ====================
    
    async renderOrdersByStore() {
        const ordersResult = await this.api.getAllOrders();
        const orders = ordersResult.success ? ordersResult.orders : [];
        const storesResult = await this.api.getStores();
        const stores = storesResult.success ? storesResult.stores : [];
        const menuResult = await this.api.getMenu();
        const menuItems = menuResult.success ? menuResult.items : [];
        
        // 店舗ごとにグループ化
        const ordersByStore = {};
        orders.forEach(order => {
            order.items.forEach(item => {
                const menu = menuItems.find(m => m.id === item.menuId);
                const storeId = menu?.storeId || 'unknown';
                
                if (!ordersByStore[storeId]) {
                    ordersByStore[storeId] = {
                        orders: [],
                        totalAmount: 0,
                        totalItems: 0
                    };
                }
                
                ordersByStore[storeId].orders.push({
                    ...order,
                    itemDetails: item
                });
                ordersByStore[storeId].totalAmount += item.price * item.quantity;
                ordersByStore[storeId].totalItems += item.quantity;
            });
        });
        
        return `
            <div class="header">
                <div class="header-content">
                    <div class="header-title">🏪 店舗別注文閲覧</div>
                    <button onclick="app.showDashboard()">ダッシュボードに戻る</button>
                </div>
            </div>
            
            <div class="container">
                ${stores.map(store => {
                    const storeData = ordersByStore[store.id];
                    if (!storeData) return '';
                    
                    return `
                        <div class="card" style="margin-bottom: 20px;">
                            <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <strong>🏪 ${store.name}</strong>
                                    <span style="margin-left: 10px; color: #6b7280;">${storeData.totalItems}個</span>
                                </div>
                                <div style="font-size: 18px; color: #10b981;">¥${storeData.totalAmount.toLocaleString()}</div>
                            </div>
                            
                            <div style="max-height: 400px; overflow-y: scroll; border: 1px solid #e5e7eb;">
                                <table style="width: 100%; table-layout: fixed;">
                                    <thead style="position: sticky; top: 0; background: white; z-index: 10; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                        <tr>
                                            <th>日付</th>
                                            <th>注文番号</th>
                                            <th>メニュー</th>
                                            <th>数量</th>
                                            <th>金額</th>
                                            <th>状態</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                    ${storeData.orders.map(order => {
                                        const menu = menuItems.find(m => m.id === order.itemDetails.menuId);
                                        const statusClass = order.status === 'PICKED' ? 'status-picked' : 
                                                          order.status === 'PAID' ? 'status-paid' : 'status-expired';
                                        const statusText = order.status === 'PICKED' ? '受取済' : 
                                                         order.status === 'PAID' ? '決済済' : '期限切れ';
                                        
                                        return `
                                            <tr>
                                                <td>${order.pickupDate}</td>
                                                <td><strong>${order.orderCode}</strong></td>
                                                <td>${menu?.name || order.itemDetails.name}</td>
                                                <td>${order.itemDetails.quantity}個</td>
                                                <td>¥${(order.itemDetails.price * order.itemDetails.quantity).toLocaleString()}</td>
                                                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                                            </tr>
                                        `;
                                    }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            
            ${this.renderAdminBottomNav('dashboard')}
        `;
    }
    
    // ==================== 全注文一覧 ====================
    
    async renderAllOrders() {
        const ordersResult = await this.api.getAllOrders();
        const orders = ordersResult.success ? ordersResult.orders : [];
        const menuResult = await this.api.getMenu();
        const menuItems = menuResult.success ? menuResult.items : [];
        const storesResult = await this.api.getStores();
        const stores = storesResult.success ? storesResult.stores : [];
        
        // 最新順にソート
        const sortedOrders = orders.sort((a, b) => {
            const dateA = a.pickupDate || '';
            const dateB = b.pickupDate || '';
            const dateCompare = dateB.localeCompare(dateA);
            if (dateCompare !== 0) return dateCompare;
            const codeA = a.orderCode || a.orderId || '';
            const codeB = b.orderCode || b.orderId || '';
            return codeB.localeCompare(codeA);
        });
        
        return `
            <div class="header">
                <div class="header-content">
                    <div class="header-title">📋 全注文一覧</div>
                    <button onclick="app.showDashboard()">ダッシュボードに戻る</button>
                </div>
            </div>
            
            <div class="container">
                <!-- フィルター機能 -->
                <div class="card" style="margin-bottom: 20px; background: #f9fafb;">
                    <h3 style="margin-bottom: 15px;">🔍 フィルター</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                        <div class="form-group">
                            <label>受取日</label>
                            <input type="date" id="filter-date" onchange="app.applyOrderFilters()">
                        </div>
                        <div class="form-group">
                            <label>注文番号</label>
                            <input type="text" id="filter-order-code" placeholder="例: 0001" oninput="app.applyOrderFilters()">
                        </div>
                        <div class="form-group">
                            <label>店舗</label>
                            <select id="filter-store" onchange="app.applyOrderFilters()">
                                <option value="">すべて</option>
                                ${stores.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>状態</label>
                            <select id="filter-status" onchange="app.applyOrderFilters()">
                                <option value="">すべて</option>
                                <option value="PAID">決済済</option>
                                <option value="PICKED">受取済</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>金額範囲</label>
                            <div style="display: flex; gap: 5px; align-items: center;">
                                <input type="number" id="filter-min-amount" placeholder="最小" style="width: 80px;" oninput="app.applyOrderFilters()">
                                <span>〜</span>
                                <input type="number" id="filter-max-amount" placeholder="最大" style="width: 80px;" oninput="app.applyOrderFilters()">
                            </div>
                        </div>
                        <div style="display: flex; align-items: flex-end;">
                            <button onclick="app.clearOrderFilters()" style="width: 100%;">フィルタークリア</button>
                        </div>
                    </div>
                </div>
                
                <div class="info-box" style="margin-bottom: 20px;">
                    <strong>📊 統計:</strong> <span id="order-count">全${orders.length}件</span>の注文
                </div>
                
                <div class="card">
                    <div id="orders-table-container" style="max-height: 600px; overflow-y: scroll; border: 1px solid #e5e7eb;">
                        ${sortedOrders.length === 0 ? '<p style="color: #6b7280;">注文がありません</p>' : `
                            <table style="width: 100%; table-layout: fixed;">
                                <thead style="position: sticky; top: 0; background: white; z-index: 10; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                    <tr>
                                        <th>日付</th>
                                        <th>注文番号</th>
                                        <th>店舗</th>
                                        <th>メニュー詳細</th>
                                        <th>合計金額</th>
                                        <th>状態</th>
                                        <th>決済時刻</th>
                                    </tr>
                                </thead>
                                <tbody id="orders-tbody">
                                    ${sortedOrders.map(order => {
                                        const itemsDetails = order.items.map(item => {
                                            // 古いデータと新しいデータの両方に対応
                                            const menuId = item.menuId || item.id;
                                            const menu = menuItems.find(m => m.id === menuId);
                                            const storeId = item.storeId || menu?.storeId;
                                            const store = stores.find(s => s.id === storeId);
                                            return {
                                                name: item.name || menu?.name || '不明',
                                                storeName: store?.name || '不明',
                                                storeId: store?.id || '',
                                                quantity: item.quantity || 0,
                                                price: item.price || 0
                                            };
                                        });
                                        
                                        const statusClass = order.status === 'PICKED' ? 'status-picked' : 
                                                          order.status === 'PAID' ? 'status-paid' : 'status-expired';
                                        const statusText = order.status === 'PICKED' ? '受取済' : 
                                                         order.status === 'PAID' ? '決済済' : '期限切れ';
                                        
                                        const storesInOrder = [...new Set(itemsDetails.map(i => i.storeName))].join(', ');
                                        const storeIds = [...new Set(itemsDetails.map(i => i.storeId))].join(',');
                                        const itemsSummary = itemsDetails.map(i => `${i.name} × ${i.quantity}`).join('<br>');
                                        
                                        // 古いデータと新しいデータの両方に対応
                                        const orderCode = order.orderCode || order.orderId || '不明';
                                        const pickupDate = order.pickupDate || '不明';
                                        const paidAt = order.paidAt || order.orderedAt || order.createdAt;
                                        
                                        return `
                                            <tr data-date="${pickupDate}" 
                                                data-order-code="${orderCode}" 
                                                data-store-ids="${storeIds}"
                                                data-status="${order.status}"
                                                data-amount="${order.totalAmount}">
                                                <td>${pickupDate}</td>
                                                <td><strong>${orderCode}</strong></td>
                                                <td>${storesInOrder}</td>
                                                <td style="font-size: 12px; padding: 4px;"><div style="max-height: 120px; overflow-y: auto; padding-right: 5px;">${itemsSummary}</div></td>
                                                <td><strong>¥${order.totalAmount.toLocaleString()}</strong></td>
                                                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                                                <td style="font-size: 11px;">${paidAt ? new Date(paidAt).toLocaleString('ja-JP') : '-'}</td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        `}
                    </div>
                </div>
            </div>
            
            ${this.renderAdminBottomNav('dashboard')}
        `;
    }

    async renderSpecialCases() {
        const result = await this.api.getSpecialCases();
        const specialCases = result.success ? result.specialCases : [];
        
        return `
            <div class="header">
                <div class="header-content">
                    <div class="header-title">⚡ 特例処理管理</div>
                    <button onclick="app.showDashboard()">ダッシュボードに戻る</button>
                </div>
            </div>
            
            <div class="container">
                <div class="card">
                    <h3 style="margin-bottom: 20px;">注文への割引適用</h3>
                    <div class="form-group">
                        <label>注文コード</label>
                        <input type="text" id="discountOrderCode" placeholder="注文コードを入力">
                    </div>
                    <div class="form-group">
                        <label>割引額</label>
                        <input type="number" id="discountAmount" placeholder="割引額を入力" min="0">
                    </div>
                    <div class="form-group">
                        <label>理由</label>
                        <input type="text" id="discountReason" placeholder="割引の理由を入力">
                    </div>
                    <button class="success" onclick="app.applySpecialDiscount()">割引を適用</button>
                </div>
                
                <div class="card">
                    <h3 style="margin-bottom: 20px;">顧客メモの追加</h3>
                    <div class="form-group">
                        <label>注文コード</label>
                        <input type="text" id="noteOrderCode" placeholder="注文コードを入力">
                    </div>
                    <div class="form-group">
                        <label>メモ内容</label>
                        <textarea id="noteContent" rows="3" placeholder="メモを入力"></textarea>
                    </div>
                    <button class="success" onclick="app.addCustomerNote()">メモを追加</button>
                </div>
                
                <div class="card">
                    <div class="card-header">特例処理履歴</div>
                    ${specialCases.length === 0 ? `
                        <p style="text-align: center; color: #9ca3af; padding: 20px;">特例処理はまだありません</p>
                    ` : `
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>種類</th>
                                    <th>注文コード</th>
                                    <th>詳細</th>
                                    <th>処理者</th>
                                    <th>処理日時</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${specialCases.map(sc => `
                                    <tr>
                                        <td>${sc.id}</td>
                                        <td>${sc.type}</td>
                                        <td>${sc.orderCode}</td>
                                        <td style="font-size: 12px;">${JSON.stringify(sc.details)}</td>
                                        <td>${sc.addedBy}</td>
                                        <td style="font-size: 11px;">${new Date(sc.addedAt).toLocaleString('ja-JP')}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `}
                </div>
            </div>
            
            ${this.renderAdminBottomNav('dashboard')}
        `;
    }

    async renderDailySummary() {
        const result = await this.api.getAllOrders();
        const orders = result.success ? result.orders : [];
        const menuResult = await this.api.getMenu();
        const menuItems = menuResult.success ? menuResult.items : [];
        
        const today = new Date().toISOString().split('T')[0];
        const todayOrders = orders.filter(o => o.pickupDate === today && o.status !== 'CANCELLED');
        
        // 店舗別集計
        const storeStats = {};
        // メニュー別集計
        const menuStats = {};
        // 時間帯別集計
        const timeStats = { morning: 0, lunch: 0, afternoon: 0 };
        
        todayOrders.forEach(order => {
            order.items.forEach(item => {
                const menu = menuItems.find(m => m.id === item.menuId);
                const storeName = menu?.storeId || '不明';
                const menuName = item.name || menu?.name || '不明';
                
                // 店舗別
                if (!storeStats[storeName]) storeStats[storeName] = { count: 0, amount: 0, items: [] };
                storeStats[storeName].count += item.quantity;
                storeStats[storeName].amount += (item.price * item.quantity);
                storeStats[storeName].items.push({ name: menuName, quantity: item.quantity });
                
                // メニュー別
                if (!menuStats[menuName]) menuStats[menuName] = { count: 0, amount: 0 };
                menuStats[menuName].count += item.quantity;
                menuStats[menuName].amount += (item.price * item.quantity);
            });
            
            // 時間帯別
            if (order.paidAt) {
                const hour = new Date(order.paidAt).getHours();
                if (hour < 11) timeStats.morning++;
                else if (hour >= 11 && hour < 14) timeStats.lunch++;
                else timeStats.afternoon++;
            }
        });
        
        const totalAmount = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
        
        return `
            <div class="header">
                <div class="header-content">
                    <div class="header-title">📊 本日サマリー（印刷用）</div>
                    <div>
                        <button onclick="window.print()" class="success">🖨️ 印刷</button>
                        <button onclick="app.showDashboard()">戻る</button>
                    </div>
                </div>
            </div>
            
            <div class="container">
                <div class="card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                    <h2 style="margin: 0; color: white;">本日の注文サマリー</h2>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">${new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</p>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 20px;">
                        <div>
                            <div style="font-size: 32px; font-weight: bold;">${todayOrders.length}</div>
                            <div style="opacity: 0.9;">総注文数</div>
                        </div>
                        <div>
                            <div style="font-size: 32px; font-weight: bold;">${Object.values(menuStats).reduce((sum, m) => sum + m.count, 0)}</div>
                            <div style="opacity: 0.9;">総個数</div>
                        </div>
                        <div>
                            <div style="font-size: 32px; font-weight: bold;">¥${totalAmount.toLocaleString()}</div>
                            <div style="opacity: 0.9;">総売上</div>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">店舗別集計</div>
                    <table>
                        <thead>
                            <tr>
                                <th>店舗ID</th>
                                <th>個数</th>
                                <th>売上</th>
                                <th>メニュー内訳</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(storeStats).map(([store, stat]) => `
                                <tr>
                                    <td><strong>${store}</strong></td>
                                    <td>${stat.count}個</td>
                                    <td>¥${stat.amount.toLocaleString()}</td>
                                    <td style="font-size: 12px;">
                                        ${stat.items.reduce((acc, item) => {
                                            const existing = acc.find(a => a.name === item.name);
                                            if (existing) existing.quantity += item.quantity;
                                            else acc.push({ ...item });
                                            return acc;
                                        }, []).map(i => `${i.name}×${i.quantity}`).join(', ')}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div class="card">
                    <div class="card-header">メニュー別集計</div>
                    <table>
                        <thead>
                            <tr>
                                <th>メニュー名</th>
                                <th>個数</th>
                                <th>売上</th>
                                <th>割合</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(menuStats).sort((a, b) => b[1].count - a[1].count).map(([menu, stat]) => `
                                <tr>
                                    <td><strong>${menu}</strong></td>
                                    <td>${stat.count}個</td>
                                    <td>¥${stat.amount.toLocaleString()}</td>
                                    <td>
                                        <div style="display: flex; align-items: center; gap: 10px;">
                                            <div style="flex: 1; background: #e5e7eb; height: 20px; border-radius: 10px; overflow: hidden;">
                                                <div style="background: #3b82f6; height: 100%; width: ${(stat.count / Object.values(menuStats).reduce((sum, m) => sum + m.count, 0) * 100)}%;"></div>
                                            </div>
                                            <span>${((stat.count / Object.values(menuStats).reduce((sum, m) => sum + m.count, 0)) * 100).toFixed(1)}%</span>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div class="card">
                    <div class="card-header">時間帯別注文数</div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; padding: 20px;">
                        <div style="text-align: center;">
                            <div style="font-size: 28px; font-weight: bold; color: #f59e0b;">${timeStats.morning}</div>
                            <div style="color: #6b7280;">午前 (〜11時)</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 28px; font-weight: bold; color: #3b82f6;">${timeStats.lunch}</div>
                            <div style="color: #6b7280;">昼 (11〜14時)</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 28px; font-weight: bold; color: #8b5cf6;">${timeStats.afternoon}</div>
                            <div style="color: #6b7280;">午後 (14時〜)</div>
                        </div>
                    </div>
                </div>
            </div>
            
            ${this.renderAdminBottomNav('dashboard')}
        `;
    }

    async renderDailyClose() {
        const result = await this.api.getAllOrders();
        const orders = result.success ? result.orders : [];
        
        const today = new Date().toISOString().split('T')[0];
        const todayOrders = orders.filter(o => o.pickupDate === today);
        
        const stats = {
            paid: todayOrders.filter(o => o.status === 'PAID').length,
            picked: todayOrders.filter(o => o.status === 'PICKED').length,
            cancelled: todayOrders.filter(o => o.status === 'CANCELLED').length,
            total: todayOrders.reduce((sum, o) => sum + (o.status !== 'CANCELLED' ? o.totalAmount : 0), 0),
            refund: todayOrders.reduce((sum, o) => sum + (o.status === 'CANCELLED' ? o.totalAmount : 0), 0)
        };
        
        const unpickedOrders = todayOrders.filter(o => o.status === 'PAID');
        
        return `
            <div class="header">
                <div class="header-content">
                    <div class="header-title">💰 日次締め処理</div>
                    <button onclick="app.showDashboard()">ダッシュボードに戻る</button>
                </div>
            </div>
            
            <div class="container">
                <div class="card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white;">
                    <h2 style="margin: 0; color: white;">本日の売上</h2>
                    <div style="font-size: 48px; font-weight: bold; margin: 20px 0;">¥${stats.total.toLocaleString()}</div>
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-top: 20px; opacity: 0.9;">
                        <div>
                            <div style="font-size: 20px; font-weight: bold;">${todayOrders.length - stats.cancelled}</div>
                            <div>有効注文</div>
                        </div>
                        <div>
                            <div style="font-size: 20px; font-weight: bold;">${stats.picked}</div>
                            <div>受取完了</div>
                        </div>
                        <div>
                            <div style="font-size: 20px; font-weight: bold;">${stats.paid}</div>
                            <div>未受取</div>
                        </div>
                        <div>
                            <div style="font-size: 20px; font-weight: bold;">¥${stats.refund.toLocaleString()}</div>
                            <div>返金額</div>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">未受取注文 (${unpickedOrders.length}件)</div>
                    ${unpickedOrders.length === 0 ? `
                        <p style="text-align: center; color: #10b981; padding: 20px;">✅ 全ての注文が受け渡し済みです</p>
                    ` : `
                        <table>
                            <thead>
                                <tr>
                                    <th>注文コード</th>
                                    <th>決済時刻</th>
                                    <th>経過時間</th>
                                    <th>金額</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${unpickedOrders.map(order => {
                                    const paidTime = new Date(order.paidAt);
                                    const elapsed = Math.floor((Date.now() - paidTime.getTime()) / 60000);
                                    const isOverdue = elapsed > 120; // 2時間以上
                                    return `
                                        <tr style="${isOverdue ? 'background: #fee2e2;' : ''}">
                                            <td><strong>${order.orderCode}</strong></td>
                                            <td style="font-size: 12px;">${paidTime.toLocaleTimeString('ja-JP')}</td>
                                            <td style="color: ${isOverdue ? '#dc2626' : '#6b7280'};">${elapsed}分</td>
                                            <td>¥${order.totalAmount.toLocaleString()}</td>
                                            <td>
                                                <button class="success" onclick="app.handlePickupComplete('${order.orderCode}')" style="padding: 6px 12px;">受取完了</button>
                                                <button class="danger" onclick="app.handleRefund('${order.orderCode}')" style="padding: 6px 12px;">返金</button>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    `}
                </div>
                
                <div class="card">
                    <div class="card-header">返金処理記録</div>
                    <div class="form-group">
                        <label>注文コード</label>
                        <input type="text" id="refundOrderCode" placeholder="返金する注文コードを入力">
                    </div>
                    <div class="form-group">
                        <label>返金理由</label>
                        <input type="text" id="refundReason" placeholder="返金理由を入力">
                    </div>
                    <button class="danger" onclick="app.processRefund()">返金処理を実行</button>
                </div>
                
                <div class="card">
                    <h3>締め処理チェックリスト</h3>
                    <div style="padding: 15px; background: #f9fafb; border-radius: 8px;">
                        <label style="display: block; margin: 10px 0; cursor: pointer;">
                            <input type="checkbox" id="check1"> 未受取注文の確認完了
                        </label>
                        <label style="display: block; margin: 10px 0; cursor: pointer;">
                            <input type="checkbox" id="check2"> 返金処理の記録完了
                        </label>
                        <label style="display: block; margin: 10px 0; cursor: pointer;">
                            <input type="checkbox" id="check3"> 売上金額の確認完了
                        </label>
                        <label style="display: block; margin: 10px 0; cursor: pointer;">
                            <input type="checkbox" id="check4"> 店舗への精算完了
                        </label>
                    </div>
                    <button class="success" style="width: 100%; margin-top: 15px; padding: 15px; font-size: 16px;" onclick="app.completeDailyClose()">
                        締め処理を完了
                    </button>
                </div>
            </div>
            
            ${this.renderAdminBottomNav('dashboard')}
        `;
    }

    async renderUnpickedAlerts() {
        const result = await this.api.getAllOrders();
        const orders = result.success ? result.orders : [];
        
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const todayOrders = orders.filter(o => o.pickupDate === today && o.status === 'PAID');
        
        // 時間経過別に分類
        const alerts = {
            critical: [], // 2時間以上
            warning: [],  // 1-2時間
            normal: []    // 1時間未満
        };
        
        todayOrders.forEach(order => {
            const paidTime = new Date(order.paidAt);
            const elapsed = Math.floor((now.getTime() - paidTime.getTime()) / 60000);
            
            if (elapsed >= 120) alerts.critical.push({ ...order, elapsed });
            else if (elapsed >= 60) alerts.warning.push({ ...order, elapsed });
            else alerts.normal.push({ ...order, elapsed });
        });
        
        return `
            <div class="header">
                <div class="header-content">
                    <div class="header-title">🔔 未受取アラート</div>
                    <button onclick="app.showDashboard()">ダッシュボードに戻る</button>
                </div>
            </div>
            
            <div class="container">
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px;">
                    <div class="card" style="background: #fee2e2; border: 2px solid #dc2626;">
                        <div style="font-size: 36px; font-weight: bold; color: #dc2626;">${alerts.critical.length}</div>
                        <div style="color: #991b1b;">🚨 緊急 (2時間以上)</div>
                    </div>
                    <div class="card" style="background: #fef3c7; border: 2px solid #f59e0b;">
                        <div style="font-size: 36px; font-weight: bold; color: #f59e0b;">${alerts.warning.length}</div>
                        <div style="color: #92400e;">⚠️ 警告 (1-2時間)</div>
                    </div>
                    <div class="card" style="background: #dbeafe; border: 2px solid #3b82f6;">
                        <div style="font-size: 36px; font-weight: bold; color: #3b82f6;">${alerts.normal.length}</div>
                        <div style="color: #1e40af;">ℹ️ 正常 (1時間未満)</div>
                    </div>
                </div>
                
                ${alerts.critical.length > 0 ? `
                    <div class="card" style="background: #fee2e2; border: 2px solid #dc2626;">
                        <div class="card-header" style="color: #991b1b;">🚨 緊急対応が必要 (${alerts.critical.length}件)</div>
                        <table>
                            <thead>
                                <tr>
                                    <th>注文コード</th>
                                    <th>決済時刻</th>
                                    <th>経過時間</th>
                                    <th>金額</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${alerts.critical.map(order => `
                                    <tr>
                                        <td><strong style="color: #dc2626;">${order.orderCode}</strong></td>
                                        <td style="font-size: 12px;">${new Date(order.paidAt).toLocaleTimeString('ja-JP')}</td>
                                        <td style="color: #dc2626; font-weight: bold;">${order.elapsed}分</td>
                                        <td>¥${order.totalAmount.toLocaleString()}</td>
                                        <td>
                                            <button class="success" onclick="app.handlePickupComplete('${order.orderCode}')">受取完了</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : ''}
                
                ${alerts.warning.length > 0 ? `
                    <div class="card" style="background: #fef3c7; border: 2px solid #f59e0b;">
                        <div class="card-header" style="color: #92400e;">⚠️ 要注意 (${alerts.warning.length}件)</div>
                        <table>
                            <thead>
                                <tr>
                                    <th>注文コード</th>
                                    <th>決済時刻</th>
                                    <th>経過時間</th>
                                    <th>金額</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${alerts.warning.map(order => `
                                    <tr>
                                        <td><strong style="color: #f59e0b;">${order.orderCode}</strong></td>
                                        <td style="font-size: 12px;">${new Date(order.paidAt).toLocaleTimeString('ja-JP')}</td>
                                        <td style="color: #f59e0b; font-weight: bold;">${order.elapsed}分</td>
                                        <td>¥${order.totalAmount.toLocaleString()}</td>
                                        <td>
                                            <button class="success" onclick="app.handlePickupComplete('${order.orderCode}')">受取完了</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : ''}
                
                ${todayOrders.length === 0 ? `
                    <div class="card">
                        <p style="text-align: center; color: #10b981; padding: 40px; font-size: 18px;">
                            ✅ 未受取の注文はありません
                        </p>
                    </div>
                ` : ''}
            </div>
            
            ${this.renderAdminBottomNav('dashboard')}
        `;
    }

    async renderBulkOperations() {
        const menuResult = await this.api.getMenu();
        const menuItems = menuResult.success ? menuResult.items : [];
        const result = await this.api.getAllOrders();
        const orders = result.success ? result.orders : [];
        
        const today = new Date().toISOString().split('T')[0];
        const unpickedOrders = orders.filter(o => o.pickupDate === today && o.status === 'PAID');
        
        return `
            <div class="header">
                <div class="header-content">
                    <div class="header-title">🔄 一括処理</div>
                    <button onclick="app.showDashboard()">ダッシュボードに戻る</button>
                </div>
            </div>
            
            <div class="container">
                <div class="card">
                    <div class="card-header">一括受取処理 (${unpickedOrders.length}件)</div>
                    ${unpickedOrders.length === 0 ? `
                        <p style="text-align: center; color: #9ca3af; padding: 20px;">未受取の注文はありません</p>
                    ` : `
                        <div class="info-box" style="margin-bottom: 15px;">
                            ⚠️ 選択した注文をまとめて受取完了にします。慎重に操作してください。
                        </div>
                        <div style="max-height: 300px; overflow-y: auto; margin-bottom: 15px;">
                            ${unpickedOrders.map(order => `
                                <label style="display: block; padding: 10px; background: #f9fafb; margin: 5px 0; border-radius: 4px; cursor: pointer;">
                                    <input type="checkbox" class="bulk-pickup-check" value="${order.orderCode}">
                                    <strong>${order.orderCode}</strong> - ¥${order.totalAmount.toLocaleString()} 
                                    <span style="color: #6b7280; font-size: 12px;">(${new Date(order.paidAt).toLocaleTimeString('ja-JP')})</span>
                                </label>
                            `).join('')}
                        </div>
                        <button class="success" style="width: 100%;" onclick="app.bulkPickupComplete()">
                            選択した注文を一括受取完了 (${unpickedOrders.length}件)
                        </button>
                    `}
                </div>
                
                <div class="card">
                    <div class="card-header">メニュー一括価格変更</div>
                    <div class="form-group">
                        <label>対象メニュー</label>
                        <select id="bulkPriceMenuId" style="width: 100%;">
                            <option value="">メニューを選択</option>
                            ${menuItems.map(m => `<option value="${m.id}">${m.name} (現在: ¥${m.price})</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>新価格</label>
                        <input type="number" id="bulkNewPrice" placeholder="新しい価格を入力" min="0">
                    </div>
                    <div class="form-group">
                        <label>変更理由</label>
                        <input type="text" id="bulkPriceReason" placeholder="価格変更の理由を入力">
                    </div>
                    <button class="success" onclick="app.bulkUpdatePrice()">価格を変更</button>
                </div>
                
                <div class="card">
                    <div class="card-header">休業日の一括設定</div>
                    <div class="form-group">
                        <label>対象メニュー</label>
                        <select id="bulkClosedMenuId" style="width: 100%;">
                            <option value="">メニューを選択</option>
                            <option value="all">全メニュー</option>
                            ${menuItems.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>休業期間</label>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <input type="date" id="bulkClosedStart" placeholder="開始日">
                            <input type="date" id="bulkClosedEnd" placeholder="終了日">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>理由メッセージ</label>
                        <input type="text" id="bulkClosedReason" placeholder="例: 棚卸しのため休業">
                    </div>
                    <button class="danger" onclick="app.bulkSetClosed()">休業日を設定</button>
                </div>
                
                <div class="card">
                    <div class="card-header">曜日別営業設定</div>
                    <div class="form-group">
                        <label>対象メニュー</label>
                        <select id="bulkWeekdayMenuId" style="width: 100%;">
                            <option value="">メニューを選択</option>
                            <option value="all">全メニュー</option>
                            ${menuItems.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>営業曜日</label>
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
                            <label><input type="checkbox" value="mon" class="weekday-check"> 月</label>
                            <label><input type="checkbox" value="tue" class="weekday-check"> 火</label>
                            <label><input type="checkbox" value="wed" class="weekday-check"> 水</label>
                            <label><input type="checkbox" value="thu" class="weekday-check"> 木</label>
                            <label><input type="checkbox" value="fri" class="weekday-check"> 金</label>
                            <label><input type="checkbox" value="sat" class="weekday-check"> 土</label>
                            <label><input type="checkbox" value="sun" class="weekday-check"> 日</label>
                        </div>
                    </div>
                    <button class="success" onclick="app.bulkSetWeekdays()">営業曜日を設定</button>
                </div>
            </div>
            
            ${this.renderAdminBottomNav('settings')}
        `;
    }

    async renderAnalytics() {
        const result = await this.api.getAllOrders();
        const orders = result.success ? result.orders : [];
        const menuResult = await this.api.getMenu();
        const menuItems = menuResult.success ? menuResult.items : [];
        
        // 人気メニューランキング
        const menuRanking = {};
        orders.forEach(order => {
            order.items.forEach(item => {
                const menuName = item.name;
                if (!menuRanking[menuName]) menuRanking[menuName] = { count: 0, amount: 0 };
                menuRanking[menuName].count += item.quantity;
                menuRanking[menuName].amount += (item.price * item.quantity);
            });
        });
        
        const ranking = Object.entries(menuRanking)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 10);
        
        // 曜日別傾向
        const weekdayStats = { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 };
        orders.forEach(order => {
            const date = new Date(order.pickupDate);
            const weekday = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][date.getDay()];
            weekdayStats[weekday]++;
        });
        
        // 時間帯別傾向
        const hourStats = {};
        orders.forEach(order => {
            if (order.paidAt) {
                const hour = new Date(order.paidAt).getHours();
                if (!hourStats[hour]) hourStats[hour] = 0;
                hourStats[hour]++;
            }
        });
        
        return `
            <div class="header">
                <div class="header-content">
                    <div class="header-title">📈 統計分析</div>
                    <button onclick="app.showDashboard()">ダッシュボードに戻る</button>
                </div>
            </div>
            
            <div class="container">
                <div class="card">
                    <div class="card-header">🏆 人気メニューランキング</div>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 60px;">順位</th>
                                <th>メニュー名</th>
                                <th>販売数</th>
                                <th>売上</th>
                                <th>シェア</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${ranking.map(([menu, stat], index) => {
                                const totalCount = Object.values(menuRanking).reduce((sum, m) => sum + m.count, 0);
                                const share = (stat.count / totalCount * 100).toFixed(1);
                                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`;
                                return `
                                    <tr>
                                        <td style="text-align: center; font-size: 20px;">${medal}</td>
                                        <td><strong>${menu}</strong></td>
                                        <td>${stat.count}個</td>
                                        <td>¥${stat.amount.toLocaleString()}</td>
                                        <td>
                                            <div style="display: flex; align-items: center; gap: 10px;">
                                                <div style="flex: 1; background: #e5e7eb; height: 20px; border-radius: 10px; overflow: hidden;">
                                                    <div style="background: ${index === 0 ? '#fbbf24' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#3b82f6'}; height: 100%; width: ${share}%;"></div>
                                                </div>
                                                <span>${share}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div class="card">
                    <div class="card-header">📅 曜日別注文傾向</div>
                    <div style="padding: 20px;">
                        ${Object.entries(weekdayStats).map(([day, count]) => {
                            const dayName = { mon: '月', tue: '火', wed: '水', thu: '木', fri: '金', sat: '土', sun: '日' }[day];
                            const maxCount = Math.max(...Object.values(weekdayStats));
                            const percentage = maxCount > 0 ? (count / maxCount * 100) : 0;
                            return `
                                <div style="margin: 15px 0;">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                        <span><strong>${dayName}曜日</strong></span>
                                        <span>${count}件</span>
                                    </div>
                                    <div style="background: #e5e7eb; height: 30px; border-radius: 15px; overflow: hidden;">
                                        <div style="background: linear-gradient(90deg, #3b82f6, #8b5cf6); height: 100%; width: ${percentage}%; transition: width 0.3s;"></div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">🕐 時間帯別注文傾向</div>
                    <div style="padding: 20px;">
                        ${Object.entries(hourStats).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).map(([hour, count]) => {
                            const maxCount = Math.max(...Object.values(hourStats));
                            const percentage = maxCount > 0 ? (count / maxCount * 100) : 0;
                            return `
                                <div style="margin: 10px 0;">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                        <span><strong>${hour}時台</strong></span>
                                        <span>${count}件</span>
                                    </div>
                                    <div style="background: #e5e7eb; height: 25px; border-radius: 12px; overflow: hidden;">
                                        <div style="background: linear-gradient(90deg, #f59e0b, #ef4444); height: 100%; width: ${percentage}%;"></div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">📊 総合統計</div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; padding: 20px;">
                        <div style="text-align: center;">
                            <div style="font-size: 32px; font-weight: bold; color: #3b82f6;">${orders.length}</div>
                            <div style="color: #6b7280;">総注文数</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 32px; font-weight: bold; color: #10b981;">
                                ${orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0)}
                            </div>
                            <div style="color: #6b7280;">総販売数</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 32px; font-weight: bold; color: #f59e0b;">
                                ¥${orders.reduce((sum, o) => sum + (o.status !== 'CANCELLED' ? o.totalAmount : 0), 0).toLocaleString()}
                            </div>
                            <div style="color: #6b7280;">総売上</div>
                        </div>
                    </div>
                </div>
            </div>
            
            ${this.renderAdminBottomNav('reports')}
        `;
    }

    async renderQRCodeGenerator() {
        return `
            <div class="header">
                <div class="header-content">
                    <div class="header-title">📱 QRコード生成</div>
                    <button onclick="app.showDashboard()">ダッシュボードに戻る</button>
                </div>
            </div>
            
            <div class="container">
                <div class="card">
                    <div class="card-header">注文番号のQRコード生成</div>
                    <div class="info-box" style="margin-bottom: 20px;">
                        💡 学生への配布用やポスター掲示用のQRコードを生成できます
                    </div>
                    
                    <div class="form-group">
                        <label>コード種別</label>
                        <select id="qrType" style="width: 100%;">
                            <option value="order">注文番号</option>
                            <option value="url">URL</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>コード / URL</label>
                        <input type="text" id="qrContent" placeholder="コードまたはURLを入力">
                    </div>
                    
                    <div class="form-group">
                        <label>サイズ</label>
                        <select id="qrSize" style="width: 100%;">
                            <option value="200">小 (200x200)</option>
                            <option value="300" selected>中 (300x300)</option>
                            <option value="400">大 (400x400)</option>
                            <option value="600">特大 (600x600)</option>
                        </select>
                    </div>
                    
                    <button class="success" style="width: 100%;" onclick="app.generateQRCode()">QRコードを生成</button>
                    
                    <div id="qrResult" style="margin-top: 30px; text-align: center; display: none;">
                        <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: inline-block;">
                            <div id="qrCodeImage"></div>
                            <div style="margin-top: 15px; font-size: 18px; font-weight: bold;" id="qrCodeText"></div>
                        </div>
                        <div style="margin-top: 20px;">
                            <button class="success" onclick="app.downloadQRCode()">📥 ダウンロード</button>
                            <button onclick="app.printQRCode()">🖨️ 印刷</button>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">システムURL QRコード</div>
                    <div style="text-align: center; padding: 20px;">
                        <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: inline-block;">
                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(window.location.origin)}" alt="System QR Code">
                            <div style="margin-top: 10px; font-weight: bold;">システムURL</div>
                            <div style="font-size: 12px; color: #6b7280;">${window.location.origin}</div>
                        </div>
                        <div style="margin-top: 15px;">
                            <button onclick="window.print()">🖨️ 印刷</button>
                        </div>
                    </div>
                </div>
            </div>
            
            ${this.renderAdminBottomNav('settings')}
        `;
    }
}
