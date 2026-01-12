/**
 * Storage layer for persisting data using localStorage
 */

const Storage = {
    KEYS: {
        USERS: 'pm_users',
        PASSWORDS: 'pm_passwords',
        TEAMS: 'pm_teams',
        CURRENT_USER: 'pm_current_user',
        MASTER_KEY: 'pm_master_key'
    },

    /**
     * Get data from localStorage
     */
    get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Storage get error:', e);
            return null;
        }
    },

    /**
     * Set data in localStorage
     */
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage set error:', e);
            return false;
        }
    },

    /**
     * Remove data from localStorage
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Storage remove error:', e);
            return false;
        }
    },

    /**
     * Initialize default data structure
     */
    init() {
        if (!this.get(this.KEYS.USERS)) {
            this.set(this.KEYS.USERS, {});
        }
        if (!this.get(this.KEYS.PASSWORDS)) {
            this.set(this.KEYS.PASSWORDS, {});
        }
        if (!this.get(this.KEYS.TEAMS)) {
            this.set(this.KEYS.TEAMS, {});
        }
    },

    // ===== User Management =====

    /**
     * Get all users
     */
    getUsers() {
        return this.get(this.KEYS.USERS) || {};
    },

    /**
     * Get user by email
     */
    getUser(email) {
        const users = this.getUsers();
        return users[email.toLowerCase()] || null;
    },

    /**
     * Save user
     */
    saveUser(user) {
        const users = this.getUsers();
        users[user.email.toLowerCase()] = user;
        return this.set(this.KEYS.USERS, users);
    },

    /**
     * Get current logged in user
     */
    getCurrentUser() {
        return this.get(this.KEYS.CURRENT_USER);
    },

    /**
     * Set current logged in user
     */
    setCurrentUser(user, masterKey) {
        this.set(this.KEYS.CURRENT_USER, user);
        // Store master key in session for decryption
        sessionStorage.setItem(this.KEYS.MASTER_KEY, masterKey);
    },

    /**
     * Get master key from session
     */
    getMasterKey() {
        return sessionStorage.getItem(this.KEYS.MASTER_KEY);
    },

    /**
     * Clear current user session
     */
    clearSession() {
        this.remove(this.KEYS.CURRENT_USER);
        sessionStorage.removeItem(this.KEYS.MASTER_KEY);
    },

    // ===== Password Management =====

    /**
     * Get all passwords for a user
     */
    getUserPasswords(userEmail) {
        const allPasswords = this.get(this.KEYS.PASSWORDS) || {};
        return allPasswords[userEmail.toLowerCase()] || [];
    },

    /**
     * Save password for user
     */
    savePassword(userEmail, passwordEntry) {
        const allPasswords = this.get(this.KEYS.PASSWORDS) || {};
        const userPasswords = allPasswords[userEmail.toLowerCase()] || [];

        // Check if updating existing
        const existingIndex = userPasswords.findIndex(p => p.id === passwordEntry.id);
        if (existingIndex >= 0) {
            userPasswords[existingIndex] = passwordEntry;
        } else {
            userPasswords.push(passwordEntry);
        }

        allPasswords[userEmail.toLowerCase()] = userPasswords;
        return this.set(this.KEYS.PASSWORDS, allPasswords);
    },

    /**
     * Delete password for user
     */
    deletePassword(userEmail, passwordId) {
        const allPasswords = this.get(this.KEYS.PASSWORDS) || {};
        const userPasswords = allPasswords[userEmail.toLowerCase()] || [];

        allPasswords[userEmail.toLowerCase()] = userPasswords.filter(p => p.id !== passwordId);
        return this.set(this.KEYS.PASSWORDS, allPasswords);
    },

    // ===== Team Management =====

    /**
     * Get all teams
     */
    getTeams() {
        return this.get(this.KEYS.TEAMS) || {};
    },

    /**
     * Get team by ID
     */
    getTeam(teamId) {
        const teams = this.getTeams();
        return teams[teamId] || null;
    },

    /**
     * Get team by invite code
     */
    getTeamByInviteCode(code) {
        const teams = this.getTeams();
        return Object.values(teams).find(t => t.inviteCode === code) || null;
    },

    /**
     * Save team
     */
    saveTeam(team) {
        const teams = this.getTeams();
        teams[team.id] = team;
        return this.set(this.KEYS.TEAMS, teams);
    },

    /**
     * Get teams for user
     */
    getUserTeams(userEmail) {
        const teams = this.getTeams();
        return Object.values(teams).filter(
            t => t.members.some(m => m.email.toLowerCase() === userEmail.toLowerCase())
        );
    },

    /**
     * Get team passwords
     */
    getTeamPasswords(teamId) {
        const team = this.getTeam(teamId);
        return team ? team.passwords || [] : [];
    },

    /**
     * Save team password
     */
    saveTeamPassword(teamId, passwordEntry) {
        const team = this.getTeam(teamId);
        if (!team) return false;

        if (!team.passwords) team.passwords = [];

        const existingIndex = team.passwords.findIndex(p => p.id === passwordEntry.id);
        if (existingIndex >= 0) {
            team.passwords[existingIndex] = passwordEntry;
        } else {
            team.passwords.push(passwordEntry);
        }

        return this.saveTeam(team);
    },

    /**
     * Delete team password
     */
    deleteTeamPassword(teamId, passwordId) {
        const team = this.getTeam(teamId);
        if (!team || !team.passwords) return false;

        team.passwords = team.passwords.filter(p => p.id !== passwordId);
        return this.saveTeam(team);
    },

    /**
     * Generate unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
};

// Initialize storage
Storage.init();

// Export for use in other modules
window.Storage = Storage;
