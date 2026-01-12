/**
 * Authentication module for user registration and login
 */

const Auth = {
    async register(email, name, password) {
        if (!email || !name || !password) {
            throw new Error('All fields are required');
        }
        if (!this.validateEmail(email)) {
            throw new Error('Please enter a valid email address');
        }
        if (password.length < 8) {
            throw new Error('Password must be at least 8 characters');
        }
        if (Storage.getUser(email)) {
            throw new Error('An account with this email already exists');
        }

        const { hash, salt } = await CryptoUtils.hashPassword(password);
        const user = {
            email: email.toLowerCase(),
            name: name.trim(),
            passwordHash: hash,
            passwordSalt: salt,
            createdAt: new Date().toISOString(),
            teams: []
        };

        Storage.saveUser(user);
        return this.login(email, password);
    },

    async login(email, password) {
        const user = Storage.getUser(email);
        if (!user) throw new Error('Invalid email or password');

        const isValid = await CryptoUtils.verifyPassword(password, user.passwordHash, user.passwordSalt);
        if (!isValid) throw new Error('Invalid email or password');

        const sessionUser = { email: user.email, name: user.name, createdAt: user.createdAt, teams: user.teams };
        Storage.setCurrentUser(sessionUser, password);
        return sessionUser;
    },

    logout() { Storage.clearSession(); },
    isLoggedIn() { return Storage.getCurrentUser() !== null && Storage.getMasterKey() !== null; },
    getCurrentUser() { return Storage.getCurrentUser(); },
    validateEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
};

window.Auth = Auth;
