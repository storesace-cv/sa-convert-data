# app.py — Minimal GUI entrypoint for sa-convert-data (Phase 3)
import os
import threading
from bottle import Bottle, static_file
import webview

APP_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(APP_DIR, 'app', 'frontend')

app = Bottle()

@app.get('/')
def index():
    return static_file('index.html', root=FRONTEND_DIR)

@app.get('/<path:path>')
def static_assets(path):
    return static_file(path, root=FRONTEND_DIR)

def run_server():
    app.run(host='127.0.0.1', port=23999, quiet=True, debug=False, reloader=False)

if __name__ == '__main__':
    t = threading.Thread(target=run_server, daemon=True)
    t.start()
    webview.create_window('sa-convert-data', 'http://127.0.0.1:23999', width=1100, height=720)
    webview.start()
