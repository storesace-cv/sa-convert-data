#!/usr/bin/env python3
"""Build release artifacts with deterministic validation."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import tempfile
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Dict, Iterable, Iterator, Tuple
from zipfile import ZIP_DEFLATED, ZipFile

REPO_ROOT = Path(__file__).resolve().parents[2]
ARTIFACTS_DIR = REPO_ROOT / "artifacts"
VERSION_FILE = REPO_ROOT / "VERSION"


if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))


def load_version() -> str:
    """Read the release version from the VERSION file."""

    if not VERSION_FILE.exists():
        raise FileNotFoundError("VERSION file not found; cannot build release.")
    version = VERSION_FILE.read_text(encoding="utf-8").strip()
    if not version:
        raise ValueError("VERSION file is empty.")
    return version


@contextmanager
def temporary_env(vars_map: Dict[str, str]) -> Iterator[None]:
    previous: Dict[str, str | None] = {}
    try:
        for key, value in vars_map.items():
            previous[key] = os.environ.get(key)
            os.environ[key] = value
        yield
    finally:
        for key, value in previous.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value


def _create_learning_workbook(path: Path) -> None:
    from openpyxl import Workbook

    wb = Workbook()
    ws = wb.active
    ws.append(
        [
            "Nome",
            "Familia",
            "Subfamilia",
            "Sinonimos",
            "Unidade Default",
            "Unidade Compra",
            "Unidade Stock",
            "Unidade Logistica",
            "Fingerprint",
        ]
    )
    ws.append(
        [
            "Manteiga sem sal 250g",
            "Laticinios",
            "Manteiga",
            "Manteiga sem sal;Manteiga s/ sal",
            "KG",
            "KG",
            "KG",
            "KG",
            "Manteiga sem sal 250g",
        ]
    )
    wb.save(path)
    wb.close()


def run_end_to_end(version: str, release_dir: Path) -> Dict[str, Any]:
    """Run learning import, seed data, validate export, and gather metrics."""

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    release_dir.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="sa-convert-release-") as tmp_root:
        tmp = Path(tmp_root)
        db_dir = tmp / "db"
        import_dir = tmp / "import"
        export_dir = tmp / "export"
        db_path = db_dir / "data.db"
        learning_workbook = tmp / "learning_input.xlsx"

        env = {
            "SA_CONVERT_DB_DIR": str(db_dir),
            "SA_CONVERT_IMPORT_DIR": str(import_dir),
            "SA_CONVERT_EXPORT_DIR": str(export_dir),
            "SA_CONVERT_DB": str(db_path),
            "SA_CONVERT_USER": "release-bot",
        }

        _create_learning_workbook(learning_workbook)

        with temporary_env(env):
            import importlib

            from app.backend.db import connect, init_db
            from app.backend.learning_importer import learn_from_xlsx
            from app.backend.sample_data import seed_release_dataset
            from app.backend.dashboard_metrics import collect_dashboard_metrics
            from tools.export_validate import run_export_validation

            importlib.reload(sys.modules["app.backend.db"])
            init_db()

            learning_result = learn_from_xlsx(str(learning_workbook), scope="release")

            conn = connect()
            try:
                seed_summary = seed_release_dataset(
                    conn,
                    batch_id="release-batch",
                    canonical_label="Produto Canonico",
                    import_user="release-bot",
                )
            finally:
                conn.close()

            export_result = run_export_validation(
                "release-batch",
                excel_out=str(tmp / "cleaned_articles.xlsx"),
                report_out=str(tmp / "validation_report.json"),
            )

            metrics = collect_dashboard_metrics(scope="release")

        excel_target = release_dir / "cleaned_articles.xlsx"
        report_target = release_dir / "validation_report.json"
        summary_target = release_dir / "summary.json"

        shutil.copy2(tmp / "cleaned_articles.xlsx", excel_target)
        shutil.copy2(tmp / "validation_report.json", report_target)

        report_payload = json.loads(report_target.read_text(encoding="utf-8"))
        report_payload["export_file"] = str(excel_target.relative_to(REPO_ROOT))
        report_target.write_text(json.dumps(report_payload, indent=2, ensure_ascii=False), encoding="utf-8")

        learning_result.pop("file", None)
        export_result["out"] = str(excel_target.relative_to(REPO_ROOT))
        export_result["report"] = str(report_target.relative_to(REPO_ROOT))
        export_result.pop("cleaned_rows", None)

        summary = {
            "version": version,
            "learning": learning_result,
            "seed": seed_summary.as_dict(),
            "export": export_result,
            "dashboard_metrics": metrics,
        }
        summary_target.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")

    return summary


def _iter_package_files() -> Iterator[Tuple[Path, str]]:
    excluded_prefixes = {
        ".git",
        ".github/workflows/__pycache__",
        ".venv",
        "__pycache__",
        "artifacts",
        ".mypy_cache",
    }
    excluded_suffixes = {".pyc", ".pyo"}

    for path in sorted(REPO_ROOT.rglob("*")):
        if path.is_dir():
            continue
        rel = path.relative_to(REPO_ROOT)
        rel_str = rel.as_posix()
        if any(rel_str == prefix or rel_str.startswith(prefix + "/") for prefix in excluded_prefixes):
            continue
        if rel.suffix in excluded_suffixes:
            continue
        yield path, rel_str


def build_zip(version: str, release_dir: Path) -> Path:
    """Package repository contents and validation outputs into a zip."""

    zip_name = f"sa-convert-data_v{version}.zip"
    zip_path = ARTIFACTS_DIR / zip_name

    with ZipFile(zip_path, mode="w", compression=ZIP_DEFLATED) as zf:
        for src_path, rel in _iter_package_files():
            zf.write(src_path, arcname=rel)

        for extra in ("cleaned_articles.xlsx", "validation_report.json", "summary.json"):
            extra_path = release_dir / extra
            if extra_path.exists():
                zf.write(extra_path, arcname=f"release/{extra}")

    return zip_path


def main(argv: Iterable[str] | None = None) -> int:
    global ARTIFACTS_DIR

    parser = argparse.ArgumentParser(description="Build release artifact with validation.")
    parser.add_argument(
        "--skip-e2e",
        action="store_true",
        help="Skip the end-to-end validation run.",
    )
    parser.add_argument(
        "--skip-zip",
        action="store_true",
        help="Skip packaging the zip artifact.",
    )
    parser.add_argument(
        "--artifacts-dir",
        default=None,
        help="Override artifacts directory (defaults to repo artifacts/).",
    )
    args = parser.parse_args(list(argv) if argv is not None else None)

    if args.artifacts_dir is None:
        artifacts_dir = ARTIFACTS_DIR
    else:
        artifacts_dir = Path(args.artifacts_dir)
        ARTIFACTS_DIR = artifacts_dir

    version = load_version()
    release_dir = artifacts_dir / f"release_v{version}"

    result: Dict[str, Any] = {"version": version}

    if not args.skip_e2e:
        result["validation"] = run_end_to_end(version, release_dir)
    else:
        release_dir.mkdir(parents=True, exist_ok=True)

    if not args.skip_zip:
        artifact_path = build_zip(version, release_dir)
        result["artifact"] = str(artifact_path)
    else:
        result["artifact"] = None

    print(json.dumps(result, indent=2, sort_keys=True, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
