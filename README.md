# 🔐 TeamVault - Password Manager

A simple, secure password manager for teams. Share passwords with your team using invite codes.

## ✨ Features

- **User Authentication** - Register/login with master password
- **Password Vault** - Store website credentials securely
- **Team Sharing** - Create teams and share passwords with invite codes
- **Password Generator** - Generate strong random passwords
- **Works Offline** - No server needed, runs directly in browser

## 🚀 Quick Start

1. **Open** `index.html` in your browser (just double-click it!)
2. **Register** with your email and master password
3. **Add passwords** using the ➕ button
4. **Create a team** to share with others

## 👥 Team Sharing

### Create a Team
1. Click **+ Create** in the sidebar
2. Enter a team name
3. Copy the **invite code** and share with team members

### Join a Team
1. Click **🔗 Join** in the sidebar
2. Enter the invite code
3. Access shared passwords!

### View Invite Code Again
Click the **⚙️** icon next to any team name to see its invite code.

## 🔄 Syncing Across Team

### Option 1: Python Server (Recommended - Auto-Sync)
```bash
python server.py
```
Open http://localhost:8080 - data auto-syncs to `db.json`!

### Option 2: Manual Load/Save
1. **Save** - Downloads encrypted `teamvault-db.json`
2. **Share** via Google Drive, Dropbox, etc.
3. Team members click **Load** to import
4. Data **merges** automatically!

## 📁 Project Structure

```
password-wallet/
├── index.html      # Main application
├── css/
│   └── style.css   # Dark theme styling
└── js/
    ├── app.js      # Main app logic
    ├── auth.js     # Authentication
    ├── crypto.js   # Encryption utilities
    └── storage.js  # Data persistence
```

## 🔒 Security Notes

- Passwords are stored in browser's localStorage
- Uses encryption for stored data
- Each browser/device maintains separate data
- For sensitive data, consider using HTTPS

## 📝 License

MIT License - Free to use and modify.
