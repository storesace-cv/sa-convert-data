import os
import webview
from app.backend.api import ExposedAPI

APP_TITLE = "sa-convert-data — Deduplicator"

def run():
    api = ExposedAPI()
    index_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "app/frontend/index.html"))
    window = webview.create_window(title=APP_TITLE, url=index_path, js_api=api, width=1200, height=800)
    webview.start(debug=True)

if __name__ == "__main__":
    run()
