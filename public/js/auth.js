/**
 * 認証UI管理モジュール
 */
export class AuthUI {
    constructor(api, app) {
        this.api = api;
        this.app = app;
        this.pendingEmail = null;
    }

    renderLogin() {
        return `
            <div class="login-container">
                <div class="login-box">
                    <h1 class="login-title">🍱 管理者ログイン</h1>
                    
                    <div id="login-error"></div>
                    
                    <div class="form-group">
                        <label>メールアドレス</label>
                        <input type="email" id="login-email" value="admin@example.com"
                               onkeydown="if(event.key==='Enter') document.getElementById('login-password').focus()">
                    </div>
                    
                    <div class="form-group">
                        <label>パスワード</label>
                        <input type="password" id="login-password" value="admin123"
                               onkeydown="if(event.key==='Enter') app.handleLogin()">
                    </div>
                    
                    <button onclick="app.handleLogin()" style="width: 100%; margin-bottom: 10px;">
                        ログイン <small style="opacity: 0.7;">(Enter)</small>
                    </button>
                    
                    <button onclick="app.showModeSelect()" class="secondary" style="width: 100%; margin-bottom: 15px;">
                        戻る
                    </button>
                    
                    <div style="text-align: center;">
                        <button onclick="app.showRegistration()" style="background: none; border: none; color: #3b82f6; text-decoration: underline; cursor: pointer;">
                            新しい管理者アカウントを登録
                        </button>
                    </div>
                    
                    <div class="warning-message" style="margin-top: 20px;">
                        🔒 <strong>セキュリティ:</strong><br>
                        ログインには認証済みのアカウントが必要です
                    </div>
                    
                    <div class="info-box">
                        <strong>デモ用ログイン情報:</strong><br>
                        メール: admin@example.com<br>
                        パスワード: admin123
                    </div>
                </div>
            </div>
        `;
    }

    renderRegistration() {
        return `
            <div class="login-container">
                <div class="login-box">
                    <h1 class="login-title">👤 管理者アカウント登録</h1>
                    
                    <div id="register-error"></div>
                    
                    <div class="form-group">
                        <label>名前</label>
                        <input type="text" id="register-name" placeholder="山田 太郎">
                    </div>
                    
                    <div class="form-group">
                        <label>メールアドレス</label>
                        <input type="email" id="register-email" placeholder="example@university.ac.jp">
                    </div>
                    
                    <div class="form-group">
                        <label>パスワード (8文字以上)</label>
                        <input type="password" id="register-password" placeholder="8文字以上">
                    </div>
                    
                    <div class="form-group">
                        <label>パスワード確認</label>
                        <input type="password" id="register-password-confirm" placeholder="パスワードを再入力">
                    </div>
                    
                    <button onclick="app.handleRegister()" style="width: 100%; margin-bottom: 10px;">
                        📧 登録して認証コードを送信
                    </button>
                    
                    <button onclick="app.showLogin()" class="secondary" style="width: 100%;">
                        ログイン画面に戻る
                    </button>
                    
                    <div class="info-box" style="margin-top: 20px;">
                        <strong>ℹ️ 登録後の流れ:</strong><br>
                        1. メールアドレスに認証コードが送信されます<br>
                        2. 認証コードを入力して本人確認<br>
                        3. 管理者の承認後、ログイン可能に<br>
                        <small>(デモ版では認証コードを画面に表示します)</small>
                    </div>
                </div>
            </div>
        `;
    }

    renderVerification(email, code) {
        return `
            <div class="login-container">
                <div class="login-box">
                    <h1 class="login-title">✉️ メール認証</h1>
                    
                    <div style="background: #dbeafe; border: 2px solid #3b82f6; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                        <p style="text-align: center; margin-bottom: 15px; color: #1e40af;">
                            <strong>${email}</strong> に送信された認証コードを入力してください
                        </p>
                        <div class="verification-code">
                            ${code}
                        </div>
                        <p style="text-align: center; font-size: 12px; color: #6b7280; margin-top: 10px;">
                            【デモ用認証コード】
                        </p>
                    </div>
                    
                    <div id="verify-error"></div>
                    
                    <div class="form-group">
                        <label>認証コード (6桁)</label>
                        <input type="text" id="verify-code" placeholder="000000" maxlength="6" 
                               style="text-align: center; font-size: 24px; font-family: monospace; letter-spacing: 5px;">
                    </div>
                    
                    <button onclick="app.handleVerify()" style="width: 100%; margin-bottom: 10px;">
                        ✔️ 認証する
                    </button>
                    
                    <button onclick="app.showLogin()" class="secondary" style="width: 100%;">
                        キャンセル
                    </button>
                    
                    <div class="info-box" style="margin-top: 20px;">
                        <strong>⏰ 有効期限:</strong> 10分間<br>
                        <strong>ℹ️ 認証後:</strong> 管理者の承認が必要です
                    </div>
                </div>
            </div>
        `;
    }

    async handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        const result = await this.api.login(email, password);
        
        if (result.success) {
            this.app.currentUser = result.admin;
            this.app.showDashboard();
        } else {
            document.getElementById('login-error').innerHTML = 
                `<div class="error-message">${result.error}</div>`;
        }
    }

    async handleRegister() {
        const name = document.getElementById('register-name').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const passwordConfirm = document.getElementById('register-password-confirm').value;
        
        const errorDiv = document.getElementById('register-error');
        
        if (password !== passwordConfirm) {
            errorDiv.innerHTML = '<div class="error-message">パスワードが一致しません</div>';
            return;
        }
        
        const result = await this.api.register(name, email, password);
        
        if (result.success) {
            this.pendingEmail = result.email;
            this.app.showVerification(result.email, result.verificationCode);
        } else {
            errorDiv.innerHTML = `<div class="error-message">${result.error}</div>`;
        }
    }

    async handleVerify() {
        const code = document.getElementById('verify-code').value.trim();
        const errorDiv = document.getElementById('verify-error');
        
        if (!code) {
            errorDiv.innerHTML = '<div class="error-message">認証コードを入力してください</div>';
            return;
        }
        
        const result = await this.api.verifyEmail(this.pendingEmail, code);
        
        if (result.success) {
            alert('✅ ' + result.message);
            this.app.showLogin();
        } else {
            errorDiv.innerHTML = `<div class="error-message">${result.error}</div>`;
        }
    }
}
