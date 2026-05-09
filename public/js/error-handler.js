/**
 * グローバルエラーハンドラー
 * 予期しないエラーをキャッチして記録
 */

// 未捕捉のエラーをキャッチ
window.addEventListener('error', function(event) {
    console.error('🔴 グローバルエラー:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
    });
    
    // エラーログに保存
    saveErrorLog({
        type: 'error',
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error && event.error.stack ? event.error.stack : null,
        timestamp: new Date().toISOString()
    });
    
    // ユーザーに通知（開発モード時のみ）
    if (isDevelopmentMode()) {
        showErrorNotification('エラーが発生しました', event.message);
    }
});

// 未処理のPromise拒否をキャッチ
window.addEventListener('unhandledrejection', function(event) {
    console.error('🔴 未処理のPromise拒否:', event.reason);
    
    // エラーログに保存
    saveErrorLog({
        type: 'unhandledRejection',
        reason: event.reason && event.reason.message ? event.reason.message : event.reason,
        stack: event.reason && event.reason.stack ? event.reason.stack : null,
        timestamp: new Date().toISOString()
    });
    
    // デフォルトのエラー処理を防止
    event.preventDefault();
    
    // ユーザーに通知
    if (isDevelopmentMode()) {
        var message = event.reason && event.reason.message ? event.reason.message : '不明なエラー';
        showErrorNotification('非同期エラー', message);
    }
});

// エラーログをLocalStorageに保存
function saveErrorLog(errorInfo) {
    try {
        var errorLogs = JSON.parse(localStorage.getItem('globalErrorLogs') || '[]');
        errorLogs.push(errorInfo);
        
        // 最新100件のみ保持
        if (errorLogs.length > 100) {
            errorLogs.shift();
        }
        
        localStorage.setItem('globalErrorLogs', JSON.stringify(errorLogs));
    } catch (e) {
        console.warn('エラーログの保存に失敗:', e);
    }
}

// 開発モードかどうかを判定
function isDevelopmentMode() {
    return location.hostname === 'localhost' || location.hostname === '127.0.0.1';
}

// エラー通知を表示
function showErrorNotification(title, message) {
    var notification = document.createElement('div');
    notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #fee2e2; border: 2px solid #ef4444; border-radius: 8px; padding: 16px; max-width: 400px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); z-index: 10000; animation: slideIn 0.3s ease-out;';
    
    notification.innerHTML = '<div style="display: flex; align-items: start; gap: 12px;"><div style="font-size: 24px;">❌</div><div style="flex: 1;"><h4 style="margin: 0 0 8px 0; color: #991b1b; font-size: 14px;">' + title + '</h4><p style="margin: 0; color: #7f1d1d; font-size: 12px;">' + message + '</p></div><button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: #991b1b; cursor: pointer; font-size: 20px; padding: 0;">×</button></div>';
    
    // アニメーション定義を追加
    if (!document.getElementById('error-notification-style')) {
        var style = document.createElement('style');
        style.id = 'error-notification-style';
        style.textContent = '@keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }';
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // 5秒後に自動で消す
    setTimeout(function() {
        notification.style.transition = 'opacity 0.3s';
        notification.style.opacity = '0';
        setTimeout(function() { notification.remove(); }, 300);
    }, 5000);
}

// エラーログをエクスポート（デバッグ用）
window.exportErrorLogs = function() {
    var logs = localStorage.getItem('globalErrorLogs') || '[]';
    var blob = new Blob([logs], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'error-logs-' + new Date().toISOString() + '.json';
    a.click();
    URL.revokeObjectURL(url);
    console.log('✅ エラーログをダウンロードしました');
};

// エラーログをクリア
window.clearErrorLogs = function() {
    localStorage.removeItem('globalErrorLogs');
    localStorage.removeItem('errorLogs'); // 古いキーも削除
    console.log('✅ エラーログをクリアしました');
};

// コンソールに便利機能を表示
console.log('%c🛠️ デバッグコマンド', 'font-size: 16px; font-weight: bold; color: #3b82f6;');
console.log('%cwindow.exportErrorLogs() - エラーログをダウンロード', 'color: #6b7280;');
console.log('%cwindow.clearErrorLogs() - エラーログをクリア', 'color: #6b7280;');
console.log('%cwindow.app - アプリケーションインスタンス', 'color: #6b7280;');
