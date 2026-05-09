/**
 * API通信モジュール
 */
export class ApiClient {
    constructor() {
        this.baseUrl = '/api';
    }

    logError(context, error, details = {}) {
        const errorInfo = {
            timestamp: new Date().toISOString(),
            context,
            error: error.message || error,
            stack: error.stack,
            ...details
        };
        console.error('🔴 エラー発生:', errorInfo);
        
        // LocalStorageにエラーログを保存（デバッグ用）
        try {
            const errorLogs = JSON.parse(localStorage.getItem('errorLogs') || '[]');
            errorLogs.push(errorInfo);
            // 最新100件のみ保持
            if (errorLogs.length > 100) errorLogs.shift();
            localStorage.setItem('errorLogs', JSON.stringify(errorLogs));
        } catch (e) {
            console.warn('エラーログの保存に失敗:', e);
        }
        
        return errorInfo;
    }

    async request(endpoint, options = {}) {
        const startTime = performance.now();
        const timeout = options.timeout || 30000; // 30秒デフォルト
        
        try {
            console.log(`📡 API Request: ${options.method || 'GET'} ${endpoint}`);
            
            // タイムアウト処理
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });
            
            clearTimeout(timeoutId);
            
            const endTime = performance.now();
            console.log(`✅ API Response: ${endpoint} (${Math.round(endTime - startTime)}ms) - ${response.status}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.success && data.error) {
                this.logError(`API: ${endpoint}`, new Error(data.error), {
                    endpoint,
                    method: options.method || 'GET',
                    responseTime: Math.round(endTime - startTime)
                });
            }
            
            return data;
        } catch (error) {
            const endTime = performance.now();
            this.logError(`API Request Failed: ${endpoint}`, error, {
                endpoint,
                method: options.method || 'GET',
                responseTime: Math.round(endTime - startTime)
            });
            
            return { 
                success: false, 
                error: `通信エラー: ${error.message}`,
                details: {
                    endpoint,
                    originalError: error.message
                }
            };
        }
    }

    // 認証API
    async login(email, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }

    async logout() {
        return this.request('/auth/logout', { method: 'POST' });
    }

    async checkSession() {
        return this.request('/auth/session');
    }

    async register(name, email, password) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });
    }

    async verifyEmail(email, code) {
        return this.request('/auth/verify', {
            method: 'POST',
            body: JSON.stringify({ email, code })
        });
    }

    async approveAdmin(adminId) {
        return this.request(`/auth/approve/${adminId}`, { method: 'POST' });
    }

    async rejectAdmin(adminId) {
        return this.request(`/auth/reject/${adminId}`, { method: 'POST' });
    }

    async getPendingAdmins() {
        return this.request('/auth/pending');
    }

    // データAPI
    async getStores() {
        return this.request('/stores');
    }

    async getStoreInquiries(storeId) {
        return this.request(`/stores/${storeId}/inquiries`);
    }

    async getMenu() {
        return this.request('/menu');
    }

    async getBusinessHours() {
        return this.request('/business-hours');
    }

    // 注文API（統合版 - orderCode使用を推奨）
    // ============================================
    // 新しいAPI（推奨）: submitOrder, searchOrder, processPayment (orderCode)
    // 古いAPI（互換性）: submitIntake, searchIntake, processPayment (intakeCode)
    // ============================================
    
    // 【推奨】注文作成（orderCodeで返却）
    async submitOrder(cart, pickupDate) {
        return this.request('/order', {
            method: 'POST',
            body: JSON.stringify({ cart, pickupDate })
        });
    }
    
    // 【互換性】注文作成（旧API - submitOrderを使用してください）
    async submitIntake(cart, pickupDate) {
        return this.submitOrder(cart, pickupDate);
    }

    // 【推奨】注文検索
    async searchOrder(code) {
        return this.request(`/order/${code}`);
    }
    
    // 【互換性】注文検索（旧API - searchOrderを使用してください）
    async searchIntake(code) {
        return this.searchOrder(code);
    }

    // 決済処理（orderCode/intakeCode両方対応）
    async processPayment(codeOrIntakeCode, paymentMethod = 'cash') {
        // 後方互換性: intakeCodeパラメータもorderCodeとして扱う
        const orderCode = codeOrIntakeCode;
        return this.request('/payment', {
            method: 'POST',
            body: JSON.stringify({ orderCode, intakeCode: orderCode, paymentMethod })
        });
    }

    async completePickup(code) {
        return this.request(`/pickup/${code}`, { method: 'POST' });
    }

    async getOrders() {
        return this.request('/orders');
    }

    async getDashboardStats() {
        return this.request('/dashboard/stats');
    }

    // 管理機能API
    async addMenu(menuData) {
        return this.request('/menu', {
            method: 'POST',
            body: JSON.stringify(menuData)
        });
    }

    async updateMenu(menuId, menuData) {
        return this.request(`/menu/${menuId}`, {
            method: 'PUT',
            body: JSON.stringify(menuData)
        });
    }

    async deleteMenu(menuId) {
        return this.request(`/menu/${menuId}`, { method: 'DELETE' });
    }

    async toggleMenuActive(menuId) {
        return this.request(`/menu/${menuId}/toggle`, { method: 'PATCH' });
    }

    async addStore(storeData) {
        return this.request('/stores', {
            method: 'POST',
            body: JSON.stringify(storeData)
        });
    }

    async updateStore(storeId, storeData) {
        return this.request(`/stores/${storeId}`, {
            method: 'PUT',
            body: JSON.stringify(storeData)
        });
    }

    async deleteStore(storeId) {
        return this.request(`/stores/${storeId}`, { method: 'DELETE' });
    }

    async toggleStoreActive(storeId) {
        return this.request(`/stores/${storeId}/toggle`, { method: 'PATCH' });
    }

    async updateBusinessHours(hours) {
        return this.request('/business-hours', {
            method: 'PUT',
            body: JSON.stringify(hours)
        });
    }

    async getSystemMessage() {
        return this.request('/system-message');
    }

    async updateSystemMessage(message) {
        return this.request('/system-message', {
            method: 'PUT',
            body: JSON.stringify(message)
        });
    }
    
    // ログAPI
    async getLogs(type = null, limit = 100) {
        const params = new URLSearchParams();
        if (type) params.append('type', type);
        if (limit) params.append('limit', limit);
        
        return this.request(`/logs?${params.toString()}`);
    }
    
    // キャンセル・変更API
    async getCancelPolicy() {
        return this.request('/cancel-policy');
    }
    
    async updateCancelPolicy(policy) {
        return this.request('/cancel-policy', {
            method: 'PUT',
            body: JSON.stringify(policy)
        });
    }
    
    // 注文編集・削除API（統合版）
    // ============================================
    
    // 【推奨】注文キャンセル
    async cancelOrder(orderCode) {
        return this.request(`/order/${orderCode}/cancel`, {
            method: 'POST'
        });
    }
    
    // 【互換性】注文キャンセル（旧API）
    async cancelIntake(intakeCode) {
        return this.cancelOrder(intakeCode);
    }
    
    // 【推奨】注文編集（管理者用）
    async updateOrder(orderCode, updateData) {
        // updateData: { pickupDate, items }
        return this.request(`/order/${orderCode}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
    }

    // 【互換性】注文編集（旧API）
    async updateIntake(intakeCode, updateData) {
        return this.updateOrder(intakeCode, updateData);
    }

    // 【推奨】注文削除（管理者用）
    async deleteOrder(orderCode) {
        return this.request(`/order/${orderCode}`, {
            method: 'DELETE'
        });
    }
    
    // 【互換性】注文削除（旧API）
    async deleteIntake(intakeCode) {
        return this.deleteOrder(intakeCode);
    }
    
    // 特定日設定API
    async getSpecialDays() {
        return this.request('/special-days');
    }
    
    async addSpecialDay(date, open, reason) {
        return this.request('/special-days', {
            method: 'POST',
            body: JSON.stringify({ date, open, reason })
        });
    }
    
    async deleteSpecialDay(date) {
        return this.request(`/special-days/${date}`, {
            method: 'DELETE'
        });
    }
    
    // レポートAPI
    async getSalesReport(startDate, endDate) {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        
        return this.request(`/reports/sales?${params.toString()}`);
    }
    
    async cleanupOldData(days) {
        return this.request('/cleanup', {
            method: 'POST',
            body: JSON.stringify({ days })
        });
    }
    
    async getAllOrders() {
        return this.request('/orders');
    }
    
    // データベース的機能
    async aggregateSales(groupBy = 'date') {
        return this.request(`/sales/aggregate?groupBy=${groupBy}`);
    }
    
    // バックアップ・復元
    async createBackup() {
        return this.request('/backup', { method: 'POST' });
    }
    
    async listBackups() {
        return this.request('/backup/list');
    }
    
    async restoreBackup(timestamp) {
        return this.request('/backup/restore', {
            method: 'POST',
            body: JSON.stringify({ timestamp })
        });
    }
    
    // 特例処理
    async getSpecialCases() {
        return this.request('/special-cases');
    }
    
    async applyDiscount(orderCode, discountAmount, reason) {
        return this.request(`/orders/${orderCode}/discount`, {
            method: 'POST',
            body: JSON.stringify({ discountAmount, reason })
        });
    }
    
    async addCustomerNote(orderCode, note) {
        return this.request(`/orders/${orderCode}/note`, {
            method: 'POST',
            body: JSON.stringify({ note })
        });
    }
}
