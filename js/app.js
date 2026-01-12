/**
 * Main Application Controller
 */

const App = {
    currentView: 'auth',
    currentFilter: 'all',
    selectedTeam: null,
    editingPassword: null,
    fileHandle: null, // For File System Access API auto-sync
    autoSyncEnabled: false,

    init() {
        if (Auth.isLoggedIn()) {
            this.showDashboard();
        } else {
            this.showAuth();
        }
        this.bindEvents();
    },

    bindEvents() {
        // Auth tabs
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchAuthTab(tab.dataset.tab));
        });

        // Auth forms
        document.getElementById('loginForm')?.addEventListener('submit', e => this.handleLogin(e));
        document.getElementById('registerForm')?.addEventListener('submit', e => this.handleRegister(e));

        // Password toggles
        document.querySelectorAll('.password-toggle').forEach(btn => {
            btn.addEventListener('click', () => this.togglePasswordVisibility(btn));
        });

        // Dashboard events
        document.getElementById('logoutBtn')?.addEventListener('click', () => this.handleLogout());
        document.getElementById('addPasswordBtn')?.addEventListener('click', () => this.showPasswordModal());
        document.getElementById('createTeamBtn')?.addEventListener('click', () => this.showTeamModal());
        document.getElementById('joinTeamBtn')?.addEventListener('click', () => this.showJoinTeamModal());

        // Modal events
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeModals());
        });
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', e => {
                if (e.target === overlay) this.closeModals();
            });
        });

        // Password form
        document.getElementById('passwordForm')?.addEventListener('submit', e => this.handleSavePassword(e));
        document.getElementById('generatePassword')?.addEventListener('click', () => this.generatePasswordField());

        // Team forms
        document.getElementById('createTeamForm')?.addEventListener('submit', e => this.handleCreateTeam(e));
        document.getElementById('joinTeamForm')?.addEventListener('submit', e => this.handleJoinTeam(e));

        // Search
        document.getElementById('searchInput')?.addEventListener('input', e => this.handleSearch(e.target.value));

        // Nav items
        document.querySelectorAll('.nav-item[data-filter]').forEach(item => {
            item.addEventListener('click', () => this.filterPasswords(item.dataset.filter));
        });

        // Copy invite code
        document.getElementById('copyInviteCode')?.addEventListener('click', () => this.copyInviteCode());

        // Database sync buttons
        document.getElementById('loadDbBtn')?.addEventListener('click', () => this.loadDatabase());
        document.getElementById('saveDbBtn')?.addEventListener('click', () => this.saveDatabase());
        document.getElementById('dbFileInput')?.addEventListener('change', e => this.handleDbFileLoad(e));
    },

    // ===== Auth Methods =====
    showAuth() {
        document.getElementById('authPage').classList.remove('hidden');
        document.getElementById('dashboardPage').classList.add('hidden');
        this.currentView = 'auth';
    },

    showDashboard() {
        document.getElementById('authPage').classList.add('hidden');
        document.getElementById('dashboardPage').classList.remove('hidden');
        this.currentView = 'dashboard';
        this.renderDashboard();
    },

    switchAuthTab(tab) {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
        document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
    },

    async handleLogin(e) {
        e.preventDefault();
        const form = e.target;
        const email = form.querySelector('[name="email"]').value;
        const password = form.querySelector('[name="password"]').value;

        try {
            await Auth.login(email, password);
            this.showToast('Welcome back!', 'success');
            this.showDashboard();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    },

    async handleRegister(e) {
        e.preventDefault();
        const form = e.target;
        const name = form.querySelector('[name="name"]').value;
        const email = form.querySelector('[name="email"]').value;
        const password = form.querySelector('[name="password"]').value;

        try {
            await Auth.register(email, name, password);
            this.showToast('Account created successfully!', 'success');
            this.showDashboard();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    },

    handleLogout() {
        Auth.logout();
        this.showAuth();
        this.showToast('Logged out successfully', 'success');
    },

    togglePasswordVisibility(btn) {
        const input = btn.parentElement.querySelector('input');
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        btn.innerHTML = isPassword ? '👁️' : '👁️‍🗨️';
    },

    // ===== Dashboard Methods =====
    renderDashboard() {
        const user = Auth.getCurrentUser();
        if (!user) return;

        // Update user info
        document.getElementById('userName').textContent = user.name;
        document.getElementById('userAvatar').textContent = user.name.charAt(0).toUpperCase();

        // Render passwords
        this.renderPasswords();
        this.renderTeams();
        this.updateCounts();
    },

    renderPasswords() {
        const user = Auth.getCurrentUser();
        const container = document.getElementById('passwordList');
        let passwords = Storage.getUserPasswords(user.email);

        // Add team passwords if viewing team
        if (this.selectedTeam) {
            passwords = Storage.getTeamPasswords(this.selectedTeam);
        } else if (this.currentFilter === 'all') {
            // Include team passwords in all view
            const teams = Storage.getUserTeams(user.email);
            teams.forEach(team => {
                const teamPasswords = (team.passwords || []).map(p => ({ ...p, isTeam: true, teamName: team.name }));
                passwords = [...passwords, ...teamPasswords];
            });
        }

        // Apply search filter
        const search = document.getElementById('searchInput')?.value?.toLowerCase() || '';
        if (search) {
            passwords = passwords.filter(p =>
                p.title.toLowerCase().includes(search) ||
                p.username.toLowerCase().includes(search) ||
                (p.url && p.url.toLowerCase().includes(search))
            );
        }

        if (passwords.length === 0) {
            container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔐</div>
          <div class="empty-state-title">No passwords yet</div>
          <div class="empty-state-text">Add your first password to get started</div>
          <button class="btn btn-primary" onclick="App.showPasswordModal()" style="width: auto;">
            ➕ Add Password
          </button>
        </div>
      `;
            return;
        }

        container.innerHTML = passwords.map(p => this.renderPasswordCard(p)).join('');
    },

    renderPasswordCard(password) {
        const icon = this.getPasswordIcon(password.url || password.title);
        const tag = password.isTeam ? `<span class="password-tag team">👥 ${password.teamName}</span>` : '';

        return `
      <div class="password-card" data-id="${password.id}" onclick="App.showPasswordDetails('${password.id}', ${password.isTeam || false})">
        <div class="password-icon">${icon}</div>
        <div class="password-info">
          <div class="password-title">${this.escapeHtml(password.title)}</div>
          <div class="password-subtitle">${this.escapeHtml(password.username)}</div>
        </div>
        ${tag}
        <div class="password-actions">
          <button class="btn btn-secondary btn-icon" onclick="event.stopPropagation(); App.copyPassword('${password.id}', ${password.isTeam || false})" title="Copy Password">📋</button>
          <button class="btn btn-secondary btn-icon" onclick="event.stopPropagation(); App.editPassword('${password.id}', ${password.isTeam || false})" title="Edit">✏️</button>
          <button class="btn btn-danger btn-icon" onclick="event.stopPropagation(); App.deletePassword('${password.id}', ${password.isTeam || false})" title="Delete">🗑️</button>
        </div>
      </div>
    `;
    },

    getPasswordIcon(text) {
        const lower = (text || '').toLowerCase();
        if (lower.includes('google')) return '🔵';
        if (lower.includes('github')) return '⚫';
        if (lower.includes('facebook')) return '🔵';
        if (lower.includes('twitter') || lower.includes('x.com')) return '🐦';
        if (lower.includes('amazon')) return '📦';
        if (lower.includes('netflix')) return '🎬';
        if (lower.includes('spotify')) return '🎵';
        if (lower.includes('bank') || lower.includes('finance')) return '🏦';
        if (lower.includes('email') || lower.includes('mail')) return '📧';
        return '🔑';
    },

    // ===== Password Operations =====
    showPasswordModal(password = null) {
        this.editingPassword = password;
        const modal = document.getElementById('passwordModal');
        const title = document.getElementById('passwordModalTitle');
        const form = document.getElementById('passwordForm');

        title.textContent = password ? 'Edit Password' : 'Add New Password';
        form.reset();

        if (password) {
            form.querySelector('[name="title"]').value = password.title;
            form.querySelector('[name="username"]').value = password.username;
            form.querySelector('[name="password"]').value = password.password;
            form.querySelector('[name="url"]').value = password.url || '';
            form.querySelector('[name="notes"]').value = password.notes || '';
        }

        // Populate team dropdown
        const teamSelect = form.querySelector('[name="team"]');
        const user = Auth.getCurrentUser();
        const teams = Storage.getUserTeams(user.email);
        teamSelect.innerHTML = '<option value="">Personal (Private)</option>' +
            teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');

        if (password && password.teamId) {
            teamSelect.value = password.teamId;
        }

        modal.classList.add('active');
    },

    async handleSavePassword(e) {
        e.preventDefault();
        const form = e.target;
        const user = Auth.getCurrentUser();
        const masterKey = Storage.getMasterKey();

        const passwordData = {
            id: this.editingPassword?.id || Storage.generateId(),
            title: form.querySelector('[name="title"]').value.trim(),
            username: form.querySelector('[name="username"]').value.trim(),
            password: form.querySelector('[name="password"]').value,
            url: form.querySelector('[name="url"]').value.trim(),
            notes: form.querySelector('[name="notes"]').value.trim(),
            updatedAt: new Date().toISOString()
        };

        if (!this.editingPassword) {
            passwordData.createdAt = new Date().toISOString();
        }

        const teamId = form.querySelector('[name="team"]').value;

        try {
            if (teamId) {
                passwordData.teamId = teamId;
                Storage.saveTeamPassword(teamId, passwordData);
            } else {
                Storage.savePassword(user.email, passwordData);
            }

            this.closeModals();
            this.renderPasswords();
            this.updateCounts();
            this.showToast(this.editingPassword ? 'Password updated!' : 'Password saved!', 'success');
            this.autoSave(); // Auto-sync if enabled
        } catch (error) {
            this.showToast('Failed to save password', 'error');
        }
    },

    async copyPassword(id, isTeam = false) {
        const user = Auth.getCurrentUser();
        let password;

        if (isTeam) {
            const teams = Storage.getUserTeams(user.email);
            for (const team of teams) {
                const found = (team.passwords || []).find(p => p.id === id);
                if (found) { password = found; break; }
            }
        } else {
            password = Storage.getUserPasswords(user.email).find(p => p.id === id);
        }

        if (password) {
            await navigator.clipboard.writeText(password.password);
            this.showToast('Password copied to clipboard!', 'success');
        }
    },

    editPassword(id, isTeam = false) {
        const user = Auth.getCurrentUser();
        let password;

        if (isTeam) {
            const teams = Storage.getUserTeams(user.email);
            for (const team of teams) {
                const found = (team.passwords || []).find(p => p.id === id);
                if (found) { password = { ...found, teamId: team.id }; break; }
            }
        } else {
            password = Storage.getUserPasswords(user.email).find(p => p.id === id);
        }

        if (password) {
            this.showPasswordModal(password);
        }
    },

    deletePassword(id, isTeam = false) {
        if (!confirm('Are you sure you want to delete this password?')) return;

        const user = Auth.getCurrentUser();

        if (isTeam) {
            const teams = Storage.getUserTeams(user.email);
            for (const team of teams) {
                if ((team.passwords || []).find(p => p.id === id)) {
                    Storage.deleteTeamPassword(team.id, id);
                    break;
                }
            }
        } else {
            Storage.deletePassword(user.email, id);
        }

        this.renderPasswords();
        this.updateCounts();
        this.showToast('Password deleted', 'success');
        this.autoSave(); // Auto-sync if enabled
    },

    showPasswordDetails(id, isTeam = false) {
        // For now, just edit the password
        this.editPassword(id, isTeam);
    },

    generatePasswordField() {
        const password = CryptoUtils.generatePassword(16);
        document.querySelector('#passwordForm [name="password"]').value = password;
        this.showToast('Strong password generated!', 'success');
    },

    // ===== Team Operations =====
    renderTeams() {
        const user = Auth.getCurrentUser();
        const teams = Storage.getUserTeams(user.email);
        const container = document.getElementById('teamNav');

        if (teams.length === 0) {
            container.innerHTML = `
        <div style="text-align: center; padding: 1rem; color: var(--text-muted);">
          No teams yet
        </div>
      `;
            return;
        }

        container.innerHTML = teams.map(team => `
      <div class="team-nav-item">
        <button class="nav-item ${this.selectedTeam === team.id ? 'active' : ''}" 
                data-team="${team.id}" onclick="App.selectTeam('${team.id}')">
          <span class="nav-item-icon">👥</span>
          ${this.escapeHtml(team.name)}
          <span class="nav-item-count">${(team.passwords || []).length}</span>
        </button>
        <button class="team-settings-btn" onclick="App.showTeamSettings('${team.id}')" title="Team Settings">⚙️</button>
      </div>
    `).join('');
    },

    selectTeam(teamId) {
        this.selectedTeam = this.selectedTeam === teamId ? null : teamId;
        this.renderTeams();
        this.renderPasswords();

        // Update active states
        document.querySelectorAll('.nav-item[data-filter]').forEach(el => el.classList.remove('active'));
        if (!this.selectedTeam) {
            document.querySelector('.nav-item[data-filter="all"]').classList.add('active');
        }
    },

    showTeamModal() {
        document.getElementById('createTeamModal').classList.add('active');
        document.getElementById('createTeamForm').reset();
    },

    showJoinTeamModal() {
        document.getElementById('joinTeamModal').classList.add('active');
        document.getElementById('joinTeamForm').reset();
    },

    handleCreateTeam(e) {
        e.preventDefault();
        const form = e.target;
        const user = Auth.getCurrentUser();
        const teamName = form.querySelector('[name="teamName"]').value.trim();

        if (!teamName) {
            this.showToast('Please enter a team name', 'error');
            return;
        }

        const team = {
            id: Storage.generateId(),
            name: teamName,
            inviteCode: CryptoUtils.generateInviteCode(),
            createdBy: user.email,
            createdAt: new Date().toISOString(),
            members: [{ email: user.email, name: user.name, role: 'admin' }],
            passwords: []
        };

        Storage.saveTeam(team);
        this.closeModals();
        this.renderTeams();
        this.updateCounts();
        this.showToast(`Team "${teamName}" created!`, 'success');
        this.autoSave(); // Auto-sync if enabled

        // Show invite code
        setTimeout(() => {
            this.showTeamInvite(team);
        }, 300);
    },

    showTeamInvite(team) {
        document.getElementById('teamInviteModal').classList.add('active');
        document.getElementById('inviteCodeDisplay').textContent = team.inviteCode;
        document.getElementById('inviteTeamName').textContent = team.name;
        document.getElementById('inviteModalTitle').textContent = 'Team Invite Code';

        // Show member count
        const memberInfo = document.getElementById('teamMemberInfo');
        if (memberInfo) {
            memberInfo.innerHTML = `<strong>${team.members.length}</strong> member${team.members.length > 1 ? 's' : ''}`;
        }
    },

    showTeamSettings(teamId) {
        const team = Storage.getTeam(teamId);
        if (!team) return;
        this.showTeamInvite(team);
    },

    copyInviteCode() {
        const code = document.getElementById('inviteCodeDisplay').textContent;
        navigator.clipboard.writeText(code);
        this.showToast('Invite code copied!', 'success');
    },

    handleJoinTeam(e) {
        e.preventDefault();
        const form = e.target;
        const user = Auth.getCurrentUser();
        const code = form.querySelector('[name="inviteCode"]').value.trim().toUpperCase();

        const team = Storage.getTeamByInviteCode(code);

        if (!team) {
            this.showToast('Invalid invite code', 'error');
            return;
        }

        if (team.members.some(m => m.email.toLowerCase() === user.email.toLowerCase())) {
            this.showToast('You are already a member of this team', 'error');
            return;
        }

        team.members.push({ email: user.email, name: user.name, role: 'member' });
        Storage.saveTeam(team);

        this.closeModals();
        this.renderTeams();
        this.updateCounts();
        this.showToast(`Joined team "${team.name}"!`, 'success');
        this.autoSave(); // Auto-sync if enabled
    },

    // ===== Utility Methods =====
    filterPasswords(filter) {
        this.currentFilter = filter;
        this.selectedTeam = null;

        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        document.querySelector(`[data-filter="${filter}"]`)?.classList.add('active');

        this.renderPasswords();
    },

    handleSearch(query) {
        this.renderPasswords();
    },

    updateCounts() {
        const user = Auth.getCurrentUser();
        const passwords = Storage.getUserPasswords(user.email);
        const teams = Storage.getUserTeams(user.email);

        let teamPasswordCount = 0;
        teams.forEach(t => teamPasswordCount += (t.passwords || []).length);

        document.getElementById('allCount').textContent = passwords.length + teamPasswordCount;
        document.getElementById('personalCount').textContent = passwords.length;
        document.getElementById('teamCount').textContent = teamPasswordCount;
    },

    closeModals() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
        this.editingPassword = null;
    },

    showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = { success: '✅', error: '❌', warning: '⚠️' };
        toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.success}</span>
      <span class="toast-message">${this.escapeHtml(message)}</span>
    `;

        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // ===== Database Sync Methods (File System Access API) =====

    // Check if File System Access API is supported
    hasFileSystemAccess() {
        return 'showOpenFilePicker' in window;
    },

    async loadDatabase() {
        if (this.hasFileSystemAccess()) {
            try {
                // Use File System Access API
                const [handle] = await window.showOpenFilePicker({
                    types: [{
                        description: 'JSON Database',
                        accept: { 'application/json': ['.json'] }
                    }]
                });
                this.fileHandle = handle;
                this.autoSyncEnabled = true;
                await this.readFromFileHandle();
                this.updateSyncStatus(true);
                this.showToast('Auto-sync enabled! Changes will save automatically.', 'success');
            } catch (err) {
                if (err.name !== 'AbortError') {
                    this.showToast('Failed to open file', 'error');
                }
            }
        } else {
            // Fallback to file input
            document.getElementById('dbFileInput').click();
        }
    },

    async readFromFileHandle() {
        if (!this.fileHandle) return;
        try {
            const file = await this.fileHandle.getFile();
            const text = await file.text();
            const data = JSON.parse(text);
            this.mergeDatabase(data);
            this.renderDashboard();
        } catch (err) {
            console.error('Read error:', err);
        }
    },

    async autoSave() {
        if (!this.autoSyncEnabled || !this.fileHandle) return;
        try {
            const writable = await this.fileHandle.createWritable();
            const data = {
                version: '1.0',
                exportedAt: new Date().toISOString(),
                users: Storage.get(Storage.KEYS.USERS) || {},
                passwords: Storage.get(Storage.KEYS.PASSWORDS) || {},
                teams: Storage.get(Storage.KEYS.TEAMS) || {}
            };
            await writable.write(JSON.stringify(data, null, 2));
            await writable.close();
        } catch (err) {
            console.error('Auto-save error:', err);
            this.autoSyncEnabled = false;
            this.updateSyncStatus(false);
        }
    },

    updateSyncStatus(enabled) {
        const loadBtn = document.getElementById('loadDbBtn');
        if (loadBtn) {
            loadBtn.innerHTML = enabled ? '🔄 Synced' : '📂 Load';
            loadBtn.style.background = enabled ? 'rgba(16, 185, 129, 0.2)' : '';
            loadBtn.style.borderColor = enabled ? 'rgba(16, 185, 129, 0.5)' : '';
        }
    },

    handleDbFileLoad(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                this.mergeDatabase(data);
                this.showToast('Database loaded and merged!', 'success');
                this.renderDashboard();
            } catch (err) {
                this.showToast('Invalid database file', 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    },

    mergeDatabase(data) {
        if (data.users) {
            const existingUsers = Storage.get(Storage.KEYS.USERS) || {};
            Object.assign(existingUsers, data.users);
            Storage.set(Storage.KEYS.USERS, existingUsers);
        }

        if (data.passwords) {
            const existingPasswords = Storage.get(Storage.KEYS.PASSWORDS) || {};
            for (const email in data.passwords) {
                if (!existingPasswords[email]) {
                    existingPasswords[email] = [];
                }
                const existingIds = new Set(existingPasswords[email].map(p => p.id));
                for (const pwd of data.passwords[email]) {
                    if (!existingIds.has(pwd.id)) {
                        existingPasswords[email].push(pwd);
                    }
                }
            }
            Storage.set(Storage.KEYS.PASSWORDS, existingPasswords);
        }

        if (data.teams) {
            const existingTeams = Storage.get(Storage.KEYS.TEAMS) || {};
            for (const teamId in data.teams) {
                if (existingTeams[teamId]) {
                    const existingEmails = new Set(existingTeams[teamId].members.map(m => m.email.toLowerCase()));
                    for (const member of data.teams[teamId].members) {
                        if (!existingEmails.has(member.email.toLowerCase())) {
                            existingTeams[teamId].members.push(member);
                        }
                    }
                    if (!existingTeams[teamId].passwords) existingTeams[teamId].passwords = [];
                    const existingPwdIds = new Set(existingTeams[teamId].passwords.map(p => p.id));
                    for (const pwd of (data.teams[teamId].passwords || [])) {
                        if (!existingPwdIds.has(pwd.id)) {
                            existingTeams[teamId].passwords.push(pwd);
                        }
                    }
                } else {
                    existingTeams[teamId] = data.teams[teamId];
                }
            }
            Storage.set(Storage.KEYS.TEAMS, existingTeams);
        }
    },

    async saveDatabase() {
        // If auto-sync is enabled, just trigger a save
        if (this.autoSyncEnabled && this.fileHandle) {
            await this.autoSave();
            this.showToast('Database synced!', 'success');
            return;
        }

        // Otherwise, use Save As dialog or download
        if (this.hasFileSystemAccess()) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: 'teamvault-db.json',
                    types: [{
                        description: 'JSON Database',
                        accept: { 'application/json': ['.json'] }
                    }]
                });
                this.fileHandle = handle;
                this.autoSyncEnabled = true;
                await this.autoSave();
                this.updateSyncStatus(true);
                this.showToast('Saved! Auto-sync now enabled.', 'success');
            } catch (err) {
                if (err.name !== 'AbortError') {
                    this.showToast('Failed to save file', 'error');
                }
            }
        } else {
            // Fallback download
            const data = {
                version: '1.0',
                exportedAt: new Date().toISOString(),
                users: Storage.get(Storage.KEYS.USERS) || {},
                passwords: Storage.get(Storage.KEYS.PASSWORDS) || {},
                teams: Storage.get(Storage.KEYS.TEAMS) || {}
            };
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'teamvault-db.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.showToast('Database saved!', 'success');
        }
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
window.App = App;
