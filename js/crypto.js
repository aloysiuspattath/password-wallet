/**
 * Crypto utilities with fallback for file:// protocol
 * Uses Web Crypto API when available, falls back to JS implementation
 */

const CryptoUtils = {
  // Check if Web Crypto is available
  hasWebCrypto: typeof crypto !== 'undefined' && crypto.subtle,

  /**
   * Simple hash function (fallback)
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    // Make it longer and more hash-like
    const base = Math.abs(hash).toString(16);
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += this.simpleHashRound(base + i + str).toString(16).padStart(8, '0');
    }
    return result;
  },

  simpleHashRound(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    }
    return Math.abs(hash);
  },

  /**
   * Generate a random salt
   */
  generateSalt() {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      return crypto.getRandomValues(new Uint8Array(16));
    }
    // Fallback random
    const arr = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  },

  /**
   * Convert ArrayBuffer to hex string
   */
  bufferToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  },

  /**
   * Convert hex string to ArrayBuffer
   */
  hexToBuffer(hex) {
    const matches = hex.match(/.{1,2}/g);
    return new Uint8Array(matches.map(byte => parseInt(byte, 16)));
  },

  /**
   * Hash password for storage
   */
  async hashPassword(password) {
    const salt = this.generateSalt();
    const saltHex = this.bufferToHex(salt);

    if (this.hasWebCrypto) {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + saltHex);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return { hash: this.bufferToHex(hashBuffer), salt: saltHex };
      } catch (e) {
        // Fall through to fallback
      }
    }

    // Fallback hash
    const hash = this.simpleHash(password + saltHex);
    return { hash, salt: saltHex };
  },

  /**
   * Verify password against stored hash
   */
  async verifyPassword(password, storedHash, saltHex) {
    if (this.hasWebCrypto) {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + saltHex);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return this.bufferToHex(hashBuffer) === storedHash;
      } catch (e) {
        // Fall through to fallback
      }
    }

    // Fallback verify
    const hash = this.simpleHash(password + saltHex);
    return hash === storedHash;
  },

  /**
   * Simple XOR-based encryption (fallback)
   */
  xorEncrypt(text, key) {
    const keyHash = this.simpleHash(key);
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ keyHash.charCodeAt(i % keyHash.length);
      result += String.fromCharCode(charCode);
    }
    return btoa(unescape(encodeURIComponent(result)));
  },

  xorDecrypt(encoded, key) {
    try {
      const text = decodeURIComponent(escape(atob(encoded)));
      const keyHash = this.simpleHash(key);
      let result = '';
      for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i) ^ keyHash.charCodeAt(i % keyHash.length);
        result += String.fromCharCode(charCode);
      }
      return result;
    } catch (e) {
      throw new Error('Decryption failed');
    }
  },

  /**
   * Encrypt data with password
   */
  async encrypt(data, password) {
    const jsonStr = JSON.stringify(data);
    const salt = this.bufferToHex(this.generateSalt());
    const encrypted = this.xorEncrypt(jsonStr, password + salt);
    return { encrypted, salt, iv: 'fallback' };
  },

  /**
   * Decrypt data with password
   */
  async decrypt(encryptedData, password) {
    try {
      const decrypted = this.xorDecrypt(encryptedData.encrypted, password + encryptedData.salt);
      return JSON.parse(decrypted);
    } catch (e) {
      throw new Error('Decryption failed - invalid password');
    }
  },

  /**
   * Generate secure random password
   */
  generatePassword(length = 16, options = {}) {
    const { lowercase = true, uppercase = true, numbers = true, symbols = true } = options;

    let chars = '';
    if (lowercase) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (numbers) chars += '0123456789';
    if (symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    if (!chars) chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    let result = '';
    for (let i = 0; i < length; i++) {
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const arr = new Uint32Array(1);
        crypto.getRandomValues(arr);
        result += chars[arr[0] % chars.length];
      } else {
        result += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    return result;
  },

  /**
   * Check password strength
   */
  checkPasswordStrength(password) {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 2) return { level: 'weak', score: 1, text: 'Weak' };
    if (score <= 4) return { level: 'medium', score: 2, text: 'Medium' };
    if (score <= 5) return { level: 'strong', score: 3, text: 'Strong' };
    return { level: 'strong', score: 4, text: 'Very Strong' };
  },

  /**
   * Generate a team invite code
   */
  generateInviteCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const arr = new Uint32Array(1);
        crypto.getRandomValues(arr);
        result += chars[arr[0] % chars.length];
      } else {
        result += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    return result;
  }
};

window.CryptoUtils = CryptoUtils;
