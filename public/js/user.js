/**
 * ユーザー（学生）UIモジュール
 */
export class UserUI {
    constructor(api, app) {
        this.api = api;
        this.app = app;
        this.cart = [];
        this.selectedDate = null;
        this.selectedStoreId = null; // 店舗選択状態を追加
        this.menuItems = []; // メニュー一覧をキャッシュ
        this.filterSort = 'none'; // フィルター: none, price-high, price-low, new, store
        this.isSubmitting = false; // 注文送信中フラグ
        this.isCancelling = false; // キャンセル処理中フラグ
        this.isCopying = false; // コピー処理中フラグ
    }

    async renderHome() {
        const storesResult = await this.api.getStores();
        const menuResult = await this.api.getMenu();
        const hoursResult = await this.api.getBusinessHours();
        const messageResult = await this.api.getSystemMessage();
        
        const stores = storesResult.success ? storesResult.stores : [];
        const menuItems = menuResult.success ? menuResult.items : [];
        this.menuItems = menuItems; // メニューをキャッシュ
        const hours = hoursResult.success ? hoursResult.hours : {};
        const message = messageResult.success ? messageResult.message : { enabled: false };
        
        // 選択された受取日を取得
        const pickupDate = this.selectedDate || null;

        // ステップ1: 受取日選択（最優先）
        let dateSelectHtml = `
            <div class="card">
                <div class="card-header">📅 ステップ1: 受取日を選択</div>
                <div class="form-group">
                    <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #374151;">
                        受取日 <span style="color: #ef4444;">*</span>
                    </label>
                    <input type="date" id="pickup-date" value="${pickupDate || ''}"
                        min="${new Date().toISOString().split('T')[0]}"
                        max="${new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]}"
                        onchange="window.app.userUI.updateSelectedDate(this.value)"
                        style="width: 100%; padding: 24px 18px; border: 3px solid #3b82f6; border-radius: 16px; font-size: 2rem; height: 64px; box-sizing: border-box; background: #f0f9ff;"
                        required>
                    ${!pickupDate ? `
                        <div style="margin-top: 8px; padding: 10px; background: #fef3c7; border-radius: 6px; font-size: 14px; color: #92400e;">
                            ⚠️ 受取日を選択してください（今日から7日先まで選択可能）
                        </div>
                    ` : ''}
                </div>
                <div class="info-box">
                    <strong>📍 営業日:</strong> ${this.getBusinessDaysText(hours.businessDays)}<br>
                    <strong>🕐 受取時間:</strong> ${hours.pickup?.start || '11:30'}〜${hours.pickup?.end || '13:30'}<br>
                    <small style="color: #6b7280;">※ 営業日以外は注文できません</small>
                </div>
            </div>
        `;

        // ステップ2: 受取日選択後にメニュー表示
        let menuHtml = '';
        if (pickupDate) {
            // フィルター・ソート機能
            let filteredMenu = menuItems.filter(item => item.active);
            
            // ソート適用
            filteredMenu = this.applySortFilter(filteredMenu);
            
            // フィルターUI
            const filterHtml = `
                <div class="card" style="margin-top: 20px;">
                    <div class="card-header">🔍 ステップ2: お弁当を選択</div>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 15px;">
                        <select id="sort-filter" onchange="window.app.userUI.updateFilter(this.value)" 
                                style="flex: 1; min-width: 200px; padding: 12px; border: 2px solid #d1d5db; border-radius: 8px; font-size: 14px;">
                            <option value="none" ${this.filterSort === 'none' ? 'selected' : ''}>並び替えなし</option>
                            <option value="price-low" ${this.filterSort === 'price-low' ? 'selected' : ''}>💰 値段の低い順</option>
                            <option value="price-high" ${this.filterSort === 'price-high' ? 'selected' : ''}>💎 値段の高い順</option>
                            <option value="new" ${this.filterSort === 'new' ? 'selected' : ''}>🆕 新着順</option>
                            <option value="store" ${this.filterSort === 'store' ? 'selected' : ''}>🏪 お店ごと</option>
                        </select>
                    </div>
                    <div style="color: #6b7280; font-size: 14px; margin-top: 10px;">
                        ${filteredMenu.length}件のメニューを表示中
                    </div>
                </div>
            `;
            
            menuHtml = `
                ${filterHtml}
                ${(() => {
                    if (filteredMenu.length === 0) return '<div style="margin: 20px; color: #888;">メニューがありません</div>';
                    return `<div class="card"><div class="menu-grid">${filteredMenu.map(item => this.renderMenuItem(item, pickupDate)).join('')}</div></div>`;
                })()}
            `;
        }

        // カート表示（メニュー選択後に常に表示）
        const cartHtml = this.cart.length > 0 ? `
            <div class="card" style="background: #eff6ff; position: sticky; bottom: 20px; margin-top: 20px;">
                <div class="card-header">🛒 カート (${this.cart.length}品)</div>
                ${this.cart.map((item, index) => `
                    <div class="cart-item">
                        <div style="flex: 1;">
                            <strong>${item.name}</strong><br>
                            <span style="color: #6b7280;">¥${item.price.toLocaleString()} × ${item.quantity} = ¥${(item.price * item.quantity).toLocaleString()}</span>
                        </div>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <button onclick="app.decreaseCartItem(${index})" style="padding: 8px 12px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer;">-</button>
                            <span style="font-weight: bold; min-width: 24px; text-align: center;">${item.quantity}</span>
                            <button onclick="app.increaseCartItem(${index})" style="padding: 8px 12px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">+</button>
                            <button class="danger" onclick="app.removeFromCart(${index})" style="padding: 8px 12px;">🗑️</button>
                        </div>
                    </div>
                `).join('')}
                <div style="margin: 16px 0; padding: 12px; background: #fef3c7; border-radius: 8px;">
                    <div style="margin-bottom: 8px; font-weight: bold; color: #92400e;">🎟️ クーポンをお持ちの方</div>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" id="coupon-code" placeholder="クーポンコードを入力" 
                            style="flex: 1; padding: 8px; border: 2px solid #fbbf24; border-radius: 6px; text-transform: uppercase;">
                        <button onclick="app.applyCoupon()" style="padding: 8px 16px; background: #FF9800; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">適用</button>
                    </div>
                    <div id="coupon-result" style="margin-top: 8px; font-size: 14px;"></div>
                </div>
                <div class="cart-total" style="margin-top: 16px;">
                    <div id="original-amount" style="display: none; text-decoration: line-through; color: #6b7280; font-size: 14px;">
                        元の金額: ¥<span id="original-amount-value">0</span>
                    </div>
                    <div id="discount-amount" style="display: none; color: #FF9800; font-size: 14px; font-weight: bold; margin: 4px 0;">
                        割引: -¥<span id="discount-amount-value">0</span>
                    </div>
                    <div style="font-size: 20px; font-weight: bold;">
                        合計: ¥<span id="total-amount">${this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()}</span>
                    </div>
                </div>
                <button id="submit-order-btn" onclick="app.submitOrder()" class="success" style="width: 100%; margin-top: 16px; padding: 16px; font-size: 18px;">
                    💳 注文を確定
                </button>
            </div>
        ` : '';

        return `
            <div class="header">
                <div class="header-content">
                    <div class="header-title">🍱 弁当注文</div>
                    <button onclick="app.showModeSelect()">戻る</button>
                </div>
            </div>
            <div class="container">
                ${message.enabled ? `
                    <div class="${message.type === 'info' ? 'info-box' : message.type === 'warning' ? 'warning-message' : message.type === 'error' ? 'error-message' : 'success-message'}" style="margin-bottom: 20px;">
                        ${message.title ? `<strong>${message.title}</strong><br>` : ''}
                        ${message.content}
                    </div>
                ` : ''}
                ${dateSelectHtml}
                ${menuHtml}
                ${cartHtml}
            </div>
            ${this.renderUserBottomNav('home')}
        `;
    }

    updateFilter(filterValue) {
        this.filterSort = filterValue;
        console.log('🔍 フィルター変更:', filterValue);
        this.app.showUserHome();
    }

    applySortFilter(menuItems) {
        let sorted = [...menuItems];
        
        switch(this.filterSort) {
            case 'price-low':
                // 値段の低い順
                sorted.sort((a, b) => a.price - b.price);
                break;
            case 'price-high':
                // 値段の高い順
                sorted.sort((a, b) => b.price - a.price);
                break;
            case 'new':
                // 新着順（IDの逆順、または作成日がある場合はそれを使用）
                sorted.sort((a, b) => {
                    const idA = parseInt(a.id.replace(/[^0-9]/g, '')) || 0;
                    const idB = parseInt(b.id.replace(/[^0-9]/g, '')) || 0;
                    return idB - idA;
                });
                break;
            case 'store':
                // お店ごと（店舗名でグループ化）
                sorted.sort((a, b) => {
                    const storeCompare = (a.storeName || a.storeId || '').localeCompare(b.storeName || b.storeId || '');
                    if (storeCompare !== 0) return storeCompare;
                    return a.name.localeCompare(b.name);
                });
                break;
            case 'none':
            default:
                // そのまま
                break;
        }
        
        return sorted;
    }

    renderOrder(orderCode, order) {
        return `
            <div class="login-container">
                <div class="login-box" style="max-width: 600px;">
                    <h1 style="text-align: center; color: #10b981; margin-bottom: 30px;">
                        ✅ 注文を受け付けました
                    </h1>
                    <div id="order-code-display" class="code-display" style="border-color: #10b981; background: #d1fae5; color: #065f46; cursor: pointer;" onclick="app.copyOrderCode('${orderCode}')" title="クリックでコピー">
                        ${orderCode}
                        <div style="font-size: 12px; margin-top: 8px; opacity: 0.8;">📋 タップでコピー</div>
                    </div>
                    <div style="margin: 24px 0 16px; text-align: center;">
                        <span style="display: inline-block; background: #fffbe6; color: #d97706; font-size: 2rem; font-weight: bold; padding: 18px 24px; border-radius: 12px; border: 2px solid #fbbf24; box-shadow: 0 2px 8px #fbbf2433;">
                            📸 この画面をスクリーンショットしてください！
                        </span>
                    </div>
                    <div class="card">
                        <div class="card-header">受付内容</div>
                        <p><strong>受取日:</strong> ${new Date(order.pickupDate).toLocaleDateString('ja-JP')}</p>
                        <p><strong>合計金額:</strong> ¥${order.totalAmount.toLocaleString()}</p>
                        <h4 style="margin-top: 16px; margin-bottom: 8px;">注文内容:</h4>
                        ${order.items.map(item => `
                            <div style="background: #f9fafb; padding: 12px; border-radius: 8px; margin-bottom: 8px;">
                                ${item.name} × ${item.quantity} = ¥${(item.price * item.quantity).toLocaleString()}
                            </div>
                        `).join('')}
                    </div>
                    <div class="warning-message">
                        <strong>⚠️ 重要:</strong><br>
                        この注文番号を窓口で提示して決済してください。
                    </div>
                    <button onclick="app.newOrder()" style="width: 100%; margin-top: 20px;">
                        新しい注文をする
                    </button>
                </div>
            </div>
        `;
    }
    
    renderMenuItem(item, pickupDate) {
        // 可用性チェック
        let isAvailable = item.active !== false; // activeフィールドがfalseの場合のみ無効
        let unavailableReason = '';
        
        if (pickupDate && item.unavailableDates && item.unavailableDates.includes(pickupDate)) {
            isAvailable = false;
            unavailableReason = item.closedMessage || 'この日は注文できません';
        }
        
        // 期間チェック
        if (pickupDate && isAvailable && item.unavailableDateRanges) {
            for (const range of item.unavailableDateRanges) {
                if (pickupDate >= range.start && pickupDate <= range.end) {
                    isAvailable = false;
                    unavailableReason = range.reason || item.closedMessage || '期間中は注文できません';
                    break;
                }
            }
        }
        
        // 曜日チェック
        if (pickupDate && isAvailable && item.unavailableWeekdays && item.unavailableWeekdays.length > 0) {
            const date = new Date(pickupDate + 'T00:00:00');
            const weekday = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][date.getDay()];
            if (item.unavailableWeekdays.includes(weekday)) {
                isAvailable = false;
                unavailableReason = item.closedMessage || 'この曜日は注文できません';
            }
        }
        
        // 値引き表示
        const priceHTML = item.originalPrice ? 
            `<div style="color: #ef4444; font-size: 14px; text-decoration: line-through;">¥${item.originalPrice.toLocaleString()}</div>
             <p style="color: #ef4444; font-size: 20px; font-weight: bold;">¥${item.price.toLocaleString()}</p>
             <div style="background: #fef2f2; color: #b91c1c; font-size: 12px; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 4px;">値引き中</div>` :
            `<p style="color: #3b82f6; font-size: 20px; font-weight: bold;">¥${item.price.toLocaleString()}</p>`;
        
        const cardStyle = isAvailable ? '' : 'opacity: 0.5; pointer-events: none; position: relative;';
        const unavailableTag = !isAvailable ? 
            `<div style="position: absolute; top: 8px; right: 8px; background: #dc2626; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">注文不可</div>
             <div style="position: absolute; bottom: 8px; left: 8px; right: 8px; background: rgba(0,0,0,0.8); color: white; padding: 6px; border-radius: 4px; font-size: 11px;">${unavailableReason}</div>` : '';
        
        // メニューIDをデータ属性として保存
        const menuId = item.id || '';
        
        return `
            <div class="menu-card" style="${cardStyle}; cursor: pointer;" 
                 data-menu-id="${menuId}"
                 data-menu-name="${item.name}"
                 data-menu-price="${item.price}"
                 data-menu-available="${isAvailable}"
                 onclick="${isAvailable ? `app.addToCartById('${menuId}')` : ''}">
                ${unavailableTag}
                ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; margin-bottom: 12px;">` : ''}
                <h4 style="margin-bottom: 8px;">${item.name}</h4>
                <p style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">${item.description || ''}</p>
                ${priceHTML}
            </div>
        `;
    }

    getBusinessDaysText(businessDays) {
        if (!businessDays) return '月曜日〜金曜日';
        
        const dayNames = {
            'mon': '月', 'tue': '火', 'wed': '水', 'thu': '木',
            'fri': '金', 'sat': '土', 'sun': '日'
        };
        
        if (businessDays.length === 7) return '毎日';
        if (businessDays.length === 5 && !businessDays.includes('sat') && !businessDays.includes('sun')) {
            return '月曜日〜金曜日';
        }
        
        return businessDays.map(day => dayNames[day] + '曜日').join('、');
    }
    
    updateSelectedDate(date) {
        this.selectedDate = date;
        this.app.showUserHome();
    }

    addToCartById(menuId) {
        console.log('🔍 addToCartById called with:', menuId);
        // キャッシュされたメニューから検索
        const item = this.menuItems.find(m => m.id === menuId);
        if (!item) {
            alert('❌ メニューが見つかりません');
            console.error('Menu not found:', menuId);
            return;
        }
        this.addToCart(item);
    }

    addToCart(item) {
        console.log('🔍 addToCart called with:', item.name, 'カート状態(前):', JSON.stringify(this.cart.map(i => ({name: i.name, qty: i.quantity}))));

        // 二重クリック防止：処理中フラグ
        if (this._addingToCart) {
            console.warn('⚠️ 既に処理中です。二重クリックを無視します。');
            return;
        }
        this._addingToCart = true;

        // バリデーション: メニューが有効か確認
        if (!item || !item.id || !item.name || !item.price) {
            alert('❌ 無効なメニューです');
            console.error('Invalid menu item:', item);
            this._addingToCart = false;
            return;
        }
        if (item.active === false) {
            alert('❌ このメニューは現在利用できません');
            this._addingToCart = false;
            return;
        }
        // 既存カート内に同じIDがあれば数量だけ増やす
        const existingItem = this.cart.find(i => i.id === item.id);
        if (existingItem) {
            console.log('🔄 既存アイテムを発見、数量を増やします:', existingItem.quantity, '→', existingItem.quantity + 1);
            if (existingItem.quantity >= 20) {
                alert('⚠️ 1つのメニューは最大20個までです');
                this._addingToCart = false;
                return;
            }
            existingItem.quantity++;
        } else {
            console.log('➕ 新規アイテムとして追加します');
            // itemの参照を持たないよう新規オブジェクトで追加
            this.cart.push({
                id: item.id,
                menuId: item.id, // サーバー側が期待するプロパティ
                name: item.name,
                price: item.price,
                storeId: item.storeId,
                storeName: item.storeName,
                image: item.image,
                description: item.description,
                quantity: 1
            });
        }
        console.log('✅ カートに追加:', item.name, `(合計: ${this.cart.length}種類)`, 'カート状態(後):', JSON.stringify(this.cart.map(i => ({name: i.name, qty: i.quantity}))));
        // 受取日の値を保持してから再レンダリング
        const dateInput = document.getElementById('pickup-date');
        if (dateInput && dateInput.value) {
            this.selectedDate = dateInput.value;
        }
        this.app.renderCurrentView();

        // 処理完了後、フラグをリセット（少し遅延させる）
        setTimeout(() => {
            this._addingToCart = false;
        }, 100);
    }

    removeFromCart(index) {
        const removedItem = this.cart[index];
        this.cart.splice(index, 1);
        console.log('🗑️ カートから削除:', removedItem?.name);
        
        // 受取日の値を保持してから再レンダリング
        const dateInput = document.getElementById('pickup-date');
        if (dateInput && dateInput.value) {
            this.selectedDate = dateInput.value;
        }
        this.app.renderCurrentView();
    }
    
    increaseCartItem(index) {
        const item = this.cart[index];
        if (item.quantity >= 20) {
            alert('⚠️ 1つのメニューは最大20個までです');
            return;
        }
        item.quantity++;
        console.log('➕ 数量増加:', item.name, `→ ${item.quantity}個`);
        
        // 受取日の値を保持してから再レンダリング
        const dateInput = document.getElementById('pickup-date');
        if (dateInput && dateInput.value) {
            this.selectedDate = dateInput.value;
        }
        this.app.renderCurrentView();
    }
    
    decreaseCartItem(index) {
        const item = this.cart[index];
        if (item.quantity > 1) {
            item.quantity--;
            console.log('➖ 数量減少:', item.name, `→ ${item.quantity}個`);
            
            // 受取日の値を保持してから再レンダリング
            const dateInput = document.getElementById('pickup-date');
            if (dateInput && dateInput.value) {
                this.selectedDate = dateInput.value;
            }
            this.app.renderCurrentView();
        } else {
            // 数量が1の場合は削除確認
            if (confirm(`${item.name}をカートから削除しますか？`)) {
                this.removeFromCart(index);
            }
        }
    }

    async submitOrder() {
        // 二重実行防止
        if (this.isSubmitting) {
            console.log('⚠️ 注文処理中です');
            return;
        }
        
        const dateInput = document.getElementById('pickup-date');
        const submitBtn = document.getElementById('submit-order-btn');
        
        // バリデーション: 受取日
        if (!dateInput || !dateInput.value) {
            alert('❌ 受取日を選択してください');
            // 受取日選択までスクロール
            dateInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            dateInput?.focus();
            return;
        }
        
        const pickupDate = new Date(dateInput.value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (pickupDate < today) {
            alert('❌ 過去の日付は選択できません');
            dateInput.focus();
            return;
        }
        
        // 7日先までの制限
        const maxDate = new Date(today);
        maxDate.setDate(maxDate.getDate() + 7);
        if (pickupDate > maxDate) {
            alert('❌ 受取日は7日先までしか選択できません');
            return;
        }
        
        // バリデーション: カート
        if (this.cart.length === 0) {
            alert('❌ カートが空です');
            return;
        }
        
        // 合計金額チェック
        const totalAmount = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        if (totalAmount <= 0) {
            alert('❌ 注文金額が不正です');
            console.error('Invalid total amount:', totalAmount, this.cart);
            return;
        }
        
        // 確認ダイアログ（詳細表示、スクロール対応）
        const formattedDate = new Date(dateInput.value).toLocaleDateString('ja-JP', { 
            year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' 
        });
        
        const itemsSummary = this.cart.map((item, idx) => 
            `${idx + 1}. ${item.name} × ${item.quantity}個 = ¥${(item.price * item.quantity).toLocaleString()}`
        ).join('\n');
        
        const confirmMessage = [
            '📦 ご注文内容を確認してください',
            '',
            '【受取日】',
            `  ${formattedDate}`,
            '',
            '【注文内容】',
            itemsSummary,
            '',
            '【合計金額】',
            `  ¥${totalAmount.toLocaleString()}`,
            '',
            '※ 注文番号はOKを押した後に発行されます',
            '',
            'この内容で注文を確定しますか？'
        ].join('\n');
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        // ボタンを無効化して二重送信を防止
        this.isSubmitting = true;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = '⏳ 送信中...';
            submitBtn.style.opacity = '0.6';
        }
        
        console.log('📝 注文送信:', {
            items: this.cart.length,
            totalAmount,
            pickupDate: dateInput.value
        });
        
        const result = await this.api.submitOrder(this.cart, dateInput.value);
        
        // 処理完了後にボタンを有効化
        this.isSubmitting = false;
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '💳 注文を確定';
            submitBtn.style.opacity = '1';
        }
        
        if (result.success) {
            console.log('✅ 注文完了:', result.orderCode);
            this.selectedDate = dateInput.value;
            this.app.showOrder(result.orderCode, result.order);
        } else {
            // 注文不可のメニューがある場合の詳細表示
            if (result.unavailableItems && result.unavailableItems.length > 0) {
                const unavailableList = result.unavailableItems.map(item => 
                    `・${item.name}: ${item.reason}`
                ).join('\n');
                alert(`❌ 以下のメニューは注文できません:\n\n${unavailableList}\n\nカートから削除して再度お試しください。`);
            } else {
                const errorMsg = result.error || '不明なエラーが発生しました';
                alert('❌ 注文エラー: ' + errorMsg);
            }
            console.error('注文失敗:', result);
        }
    }

    newOrder() {
        console.log('🔄 新規注文を開始');
        this.cart = [];
        this.selectedDate = null;
        this.app.showUserHome();
    }
    
    // 注文番号をコピー
    async copyOrderCode(orderCode) {
        // 二重実行防止
        if (this.isCopying) {
            console.log('⚠️ コピー処理中です');
            return;
        }
        
        this.isCopying = true;
        
        try {
            await navigator.clipboard.writeText(orderCode);
            alert('📋 注文番号をコピーしました');
        } catch (error) {
            console.error('コピーエラー:', error);
            alert('❌ コピーに失敗しました');
        } finally {
            // 少し遅延してフラグをリセット
            setTimeout(() => {
                this.isCopying = false;
            }, 500);
        }
    }
    
    // キャンセル機能
    renderCancelSearch() {
        return `
            <div class="header">
                <div class="header-content">
                    <div class="header-title">🚫 注文キャンセル</div>
                    <button onclick="app.showUserHome()">戻る</button>
                </div>
            </div>
            
            <div class="container">
                <div class="card">
                    <div class="card-header">注文番号でキャンセル</div>
                    
                    <div class="warning-message" style="margin-bottom: 20px;">
                        <strong>⚠️ キャンセルについて</strong><br>
                        • 注文後30分以内のみキャンセル可能<br>
                        • 受取24時間前を過ぎるとキャンセル不可<br>
                        • 決済済みの注文はキャンセルできません
                    </div>
                    
                    <div class="form-group">
                        <label>注文番号</label>
                        <input type="text" id="cancel-order-code" placeholder="例: R-0001" 
                               onkeydown="if(event.key==='Enter') app.searchOrderForCancel()"
                               style="text-transform: uppercase;">
                    </div>
                    
                    <button onclick="app.searchOrderForCancel()" class="full-width">検索 <small style="opacity: 0.7;">(Enter)</small></button>
                </div>
                
                <div id="cancel-result"></div>
            </div>
            ${this.renderUserBottomNav('cancel')}
        `;
    }
    
    async searchOrderForCancel(code) {
        const input = document.getElementById('cancel-order-code');
        const orderCode = code || input?.value?.trim() || '';
        const resultDiv = document.getElementById('cancel-result');
        
        if (!resultDiv) {
            console.error('cancel-result要素が見つかりません');
            return;
        }
        
        if (!orderCode) {
            alert('注文番号を入力してください');
            input?.focus();
            return;
        }
        
        // ローディング表示
        resultDiv.innerHTML = '<div style="text-align: center; padding: 20px; color: #6b7280;">🔍 検索中...</div>';
        
        const result = await this.api.searchOrder(orderCode);
        
        if (!result.success) {
            resultDiv.innerHTML = `
                <div class="card" style="margin-top: 20px;">
                    <div class="error-message">❌ ${result.error || '注文番号が見つかりません'}</div>
                </div>
            `;
            return;
        }
        
        const order = result.order;
        const createdAt = new Date(order.createdAt);
        const now = new Date();
        const minutesPassed = Math.floor((now - createdAt) / 1000 / 60);
        
        const canCancel = order.status === 'PENDING' && minutesPassed <= 30;
        
        document.getElementById('cancel-result').innerHTML = `
            <div class="card" style="margin-top: 20px;">
                <div class="card-header">注文内容</div>
                
                <div style="margin-bottom: 15px;">
                    <strong>注文番号:</strong> ${order.orderCode}<br>
                    <strong>受取日:</strong> ${order.pickupDate}<br>
                    <strong>状態:</strong> <span class="status-badge status-${order.status.toLowerCase()}">${
                        order.status === 'PENDING' ? '未決済' :
                        order.status === 'PAID' ? '決済済' :
                        order.status === 'CANCELLED' ? 'キャンセル済' : order.status
                    }</span><br>
                    <strong>注文時刻:</strong> ${createdAt.toLocaleString('ja-JP')}<br>
                    <strong>経過時間:</strong> ${minutesPassed}分
                </div>
                
                <table style="margin-bottom: 15px;">
                    <thead>
                        <tr>
                            <th>店舗</th>
                            <th>メニュー</th>
                            <th>個数</th>
                            <th>金額</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items.map(item => `
                            <tr>
                                <td>${item.storeName || item.storeId}</td>
                                <td>${item.menuName}</td>
                                <td>${item.quantity}個</td>
                                <td>¥${(item.price * item.quantity).toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div style="text-align: right; font-size: 1.2em; font-weight: bold; margin-bottom: 20px;">
                    合計: ¥${order.totalAmount.toLocaleString()}
                </div>
                
                ${canCancel ? `
                    <button id="cancel-btn-${order.orderCode}" onclick="app.confirmCancelOrder('${order.orderCode}')" class="danger full-width">
                        この注文をキャンセルする
                    </button>
                ` : `
                    <div class="error-message">
                        ${order.status === 'CANCELLED' ? 'この注文は既にキャンセルされています' :
                          order.status !== 'PENDING' ? 'この注文はキャンセルできません（決済済み）' :
                          'キャンセル可能時間（30分）を過ぎています'}
                    </div>
                `}
            </div>
        `;
    }
    
    async confirmCancelOrder(orderCode) {
        // 二重実行防止
        if (this.isCancelling) {
            console.log('⚠️ キャンセル処理中です');
            return;
        }
        
        if (!confirm('本当にこの注文をキャンセルしますか？\nこの操作は取り消せません。')) {
            return;
        }
        
        // ボタンを無効化
        this.isCancelling = true;
        const cancelBtn = document.getElementById(`cancel-btn-${orderCode}`);
        if (cancelBtn) {
            cancelBtn.disabled = true;
            cancelBtn.textContent = '⏳ 処理中...';
            cancelBtn.style.opacity = '0.6';
        }
        
        const result = await this.api.cancelOrder(orderCode);
        
        // 処理完了後にフラグをリセット
        this.isCancelling = false;
        if (cancelBtn) {
            cancelBtn.disabled = false;
            cancelBtn.textContent = 'この注文をキャンセルする';
            cancelBtn.style.opacity = '1';
        }
        
        if (result.success) {
            alert('✅ キャンセルしました');
            this.searchOrderForCancel(orderCode);
        } else {
            alert('❌ ' + result.error);
        }
    }

    renderUserBottomNav(currentView) {
        const navItems = [
            { id: 'home', icon: '🏠', label: 'ホーム', action: 'app.showHome()' },
            { id: 'cancel', icon: '🔍', label: 'キャンセル', action: 'app.showCancelSearch()' }
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
    
    // クーポン適用変数
    appliedCoupon = null;
    
    // クーポン適用
    async applyCoupon() {
        const couponCodeInput = document.getElementById('coupon-code');
        const couponResult = document.getElementById('coupon-result');
        const code = couponCodeInput?.value?.trim().toUpperCase();
        
        if (!code) {
            couponResult.innerHTML = '<span style="color: #dc2626;">❌ クーポンコードを入力してください</span>';
            return;
        }
        
        const totalAmount = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        try {
            const response = await fetch('/api/coupons/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, amount: totalAmount })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.appliedCoupon = data;
                
                // 金額表示を更新
                document.getElementById('original-amount').style.display = 'block';
                document.getElementById('original-amount-value').textContent = data.originalAmount.toLocaleString();
                document.getElementById('discount-amount').style.display = 'block';
                document.getElementById('discount-amount-value').textContent = data.discount.toLocaleString();
                document.getElementById('total-amount').textContent = data.finalAmount.toLocaleString();
                
                couponResult.innerHTML = `<span style="color: #16a34a;">✅ クーポン「${data.coupon.code}」を適用しました！ ¥${data.discount.toLocaleString()}割引</span>`;
                couponCodeInput.disabled = true;
            } else {
                couponResult.innerHTML = `<span style="color: #dc2626;">❌ ${data.error}</span>`;
                this.appliedCoupon = null;
            }
        } catch (error) {
            console.error('クーポン適用エラー:', error);
            couponResult.innerHTML = '<span style="color: #dc2626;">❌ クーポン適用に失敗しました</span>';
            this.appliedCoupon = null;
        }
    }
}
