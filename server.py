"""
TeamVault - Simple Python Server
Run this to enable auto-sync without file picking!

Usage: python server.py
Then open: http://localhost:8080
"""

import http.server
import json
import os
from urllib.parse import urlparse

PORT = 8080
DB_FILE = 'db.json'

class TeamVaultHandler(http.server.SimpleHTTPRequestHandler):
    
    def do_GET(self):
        parsed = urlparse(self.path)
        
        # API endpoint to get database
        if parsed.path == '/api/db':
            self.send_json_response(self.read_db())
        else:
            # Serve static files
            super().do_GET()
    
    def do_POST(self):
        parsed = urlparse(self.path)
        
        # API endpoint to save database
        if parsed.path == '/api/db':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                self.write_db(data)
                self.send_json_response({'success': True})
            except Exception as e:
                self.send_json_response({'error': str(e)}, 500)
        else:
            self.send_error(404)
    
    def do_OPTIONS(self):
        # Handle CORS preflight
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()
    
    def send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
    
    def send_json_response(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
    
    def read_db(self):
        if os.path.exists(DB_FILE):
            with open(DB_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {'users': {}, 'passwords': {}, 'teams': {}}
    
    def write_db(self, data):
        with open(DB_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)


if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)) or '.')
    
    print(f'''
╔══════════════════════════════════════════════╗
║        TeamVault Server Started!             ║
╠══════════════════════════════════════════════╣
║  Open in browser: http://localhost:{PORT}      ║
║  Database file:   {DB_FILE}                     ║
║  Press Ctrl+C to stop                        ║
╚══════════════════════════════════════════════╝
    ''')
    
    with http.server.HTTPServer(('', PORT), TeamVaultHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\nServer stopped.')
