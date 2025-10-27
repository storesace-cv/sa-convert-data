## Platform & Packaging (Important)

- **Target OS:** macOS (Apple Silicon & Intel) — Python runtime only.
- **No app bundling:** We will **not** compile to `.app` or package as a standalone binary.
- **Execution mode:** run via `python app.py` or `scripts/launchers/sa_convert_data.sh`.
- **CI note:** GUI tests are not executed headlessly; CI validates CLI & structure only.
