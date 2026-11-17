r"""
Sukasan POS — Database & Uploads Backup / Restore / Migration Status Utility
============================================================================
Usage (from `backend/` directory):
    .\.venv\Scripts\python.exe scripts\db_backup.py status
    .\.venv\Scripts\python.exe scripts\db_backup.py backup
    .\.venv\Scripts\python.exe scripts\db_backup.py list
    .\.venv\Scripts\python.exe scripts\db_backup.py restore <path_to_zip_or_backup>
"""
import argparse
import os
import shutil
import subprocess
import sys
import zipfile
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse, unquote

from sqlalchemy import create_engine, text

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import get_settings
from app.core.timezone import WITA_TZ

BACKUPS_DIR = PROJECT_ROOT / "backups"
UPLOADS_DIR = BACKEND_DIR / "app" / "static" / "uploads"
MAX_KEEP_BACKUPS = 14


def parse_db_url(db_url: str) -> dict:
    parsed = urlparse(db_url)
    return {
        "host": parsed.hostname or "localhost",
        "port": str(parsed.port or 5432),
        "user": unquote(parsed.username or "postgres"),
        "password": unquote(parsed.password or ""),
        "dbname": (parsed.path or "/sukasan_pos").lstrip("/"),
    }


def locate_pg_bin(engine) -> Path | None:
    """Finds PostgreSQL bin directory containing pg_dump.exe, pg_restore.exe, and psql.exe."""
    # 1. Check PATH
    pg_dump_in_path = shutil.which("pg_dump")
    if pg_dump_in_path:
        return Path(pg_dump_in_path).parent

    # 2. Query PostgreSQL data_directory via SQL (e.g. D:/Software/PostgreSQL/17/data -> ../bin)
    try:
        with engine.connect() as conn:
            data_dir = conn.execute(text("SHOW data_directory")).scalar()
            if data_dir:
                candidate_bin = Path(data_dir).resolve().parent / "bin"
                if (candidate_bin / "pg_dump.exe").exists():
                    return candidate_bin
    except Exception:
        pass

    # 3. Common Windows installation paths
    common_roots = [
        Path("D:/Software/PostgreSQL"),
        Path("C:/Program Files/PostgreSQL"),
        Path("C:/laragon/bin/postgresql"),
    ]
    for root in common_roots:
        if root.exists():
            matches = list(root.rglob("pg_dump.exe"))
            if matches:
                return matches[0].parent

    return None


def cmd_status() -> None:
    settings = get_settings()
    db_info = parse_db_url(settings.database_url)
    engine = create_engine(settings.database_url)
    pg_bin = locate_pg_bin(engine)

    print("=" * 68)
    print(f"  SUKASAN POS — DATABASE & MIGRATION STATUS ({db_info['dbname']})")
    print("=" * 68)
    print(f"  Worktree Root : {PROJECT_ROOT}")
    print(f"  Database      : {db_info['dbname']} @ {db_info['host']}:{db_info['port']}")
    print(f"  PG Binaries   : {pg_bin if pg_bin else 'Not found (SQLAlchemy fallback)'}")

    with engine.connect() as conn:
        # Check Alembic revision
        tables = [
            r[0]
            for r in conn.execute(
                text(
                    "SELECT table_name FROM information_schema.tables "
                    "WHERE table_schema = 'public' ORDER BY table_name"
                )
            )
        ]
        alembic_ver = "Not stamped yet"
        if "alembic_version" in tables:
            ver = conn.execute(text("SELECT version_num FROM alembic_version LIMIT 1")).scalar()
            alembic_ver = ver or "Empty"

        print(f"  Alembic Head  : {alembic_ver}")
        print("-" * 68)
        print(f"  {'Table Name':<32} | {'Row Count':>12}")
        print("-" * 68)
        for tbl in tables:
            if tbl == "alembic_version":
                continue
            cnt = conn.execute(text(f'SELECT COUNT(*) FROM "{tbl}"')).scalar()
            print(f"  {tbl:<32} | {cnt:>12,}")
    print("=" * 68)


def cmd_backup(max_keep: int = MAX_KEEP_BACKUPS) -> Path:
    settings = get_settings()
    db_info = parse_db_url(settings.database_url)
    dbname = db_info["dbname"]
    engine = create_engine(settings.database_url)
    pg_bin = locate_pg_bin(engine)

    if not pg_bin:
        raise RuntimeError("Could not locate pg_dump.exe. Ensure PostgreSQL is running.")

    BACKUPS_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(WITA_TZ).strftime("%Y%m%d_%H%M%S")

    sql_file = BACKUPS_DIR / f"{dbname}_{ts}.sql"
    custom_file = BACKUPS_DIR / f"{dbname}_{ts}.backup"
    zip_file = BACKUPS_DIR / f"{dbname}_backup_{ts}.zip"

    env = os.environ.copy()
    env["PGPASSWORD"] = db_info["password"]
    pg_dump = str(pg_bin / "pg_dump.exe")

    print(f"[1/4] Dumping plain-text SQL script -> {sql_file.name} ...")
    subprocess.run(
        [
            pg_dump,
            "-h",
            db_info["host"],
            "-p",
            db_info["port"],
            "-U",
            db_info["user"],
            "-d",
            dbname,
            "--clean",
            "--if-exists",
            "--inserts",
            "-f",
            str(sql_file),
        ],
        env=env,
        check=True,
    )

    print(f"[2/4] Dumping pgAdmin custom archive (-Fc) -> {custom_file.name} ...")
    subprocess.run(
        [
            pg_dump,
            "-h",
            db_info["host"],
            "-p",
            db_info["port"],
            "-U",
            db_info["user"],
            "-d",
            dbname,
            "-Fc",
            "-f",
            str(custom_file),
        ],
        env=env,
        check=True,
    )

    print(f"[3/4] Packaging SQL + .backup + static uploads into -> {zip_file.name} ...")
    upload_count = 0
    with zipfile.ZipFile(zip_file, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.write(sql_file, arcname=sql_file.name)
        zf.write(custom_file, arcname=custom_file.name)
        if UPLOADS_DIR.exists():
            for file_path in UPLOADS_DIR.rglob("*"):
                if file_path.is_file():
                    rel_arc = Path("uploads") / file_path.relative_to(UPLOADS_DIR)
                    zf.write(file_path, arcname=str(rel_arc))
                    upload_count += 1

    # Remove intermediate uncompressed .sql and .backup files (kept inside the .zip)
    sql_file.unlink(missing_ok=True)
    custom_file.unlink(missing_ok=True)

    # Retention policy: keep newest `max_keep` timestamped zip backups for this db
    pattern = f"{dbname}_backup_*.zip"
    all_zips = sorted(BACKUPS_DIR.glob(pattern), key=lambda p: p.stat().st_mtime, reverse=True)
    for old_zip in all_zips[max_keep:]:
        old_zip.unlink(missing_ok=True)

    size_kb = zip_file.stat().st_size / 1024
    print(
        f"[4/4] Backup complete! Archive: {zip_file} ({size_kb:,.1f} KB, {upload_count} uploaded media files included)"
    )
    return zip_file


def cmd_list() -> None:
    BACKUPS_DIR.mkdir(parents=True, exist_ok=True)
    archives = sorted(BACKUPS_DIR.glob("*.zip"), key=lambda p: p.stat().st_mtime, reverse=True)
    print("=" * 78)
    print(f"  AVAILABLE BACKUP ARCHIVES IN {BACKUPS_DIR}")
    print("=" * 78)
    if not archives:
        print("  No .zip backup archives found.")
    else:
        print(f"  {'Archive Filename':<46} | {'Size (KB)':>10} | {'Modified (WITA)'}")
        print("-" * 78)
        for arc in archives:
            stat = arc.stat()
            mtime = datetime.fromtimestamp(stat.st_mtime, tz=WITA_TZ).strftime("%Y-%m-%d %H:%M:%S")
            print(f"  {arc.name:<46} | {stat.st_size / 1024:>10,.1f} | {mtime}")
    print("=" * 78)


def cmd_restore(target_path_str: str) -> None:
    settings = get_settings()
    db_info = parse_db_url(settings.database_url)
    dbname = db_info["dbname"]
    engine = create_engine(settings.database_url)
    pg_bin = locate_pg_bin(engine)

    if not pg_bin:
        raise RuntimeError("Could not locate pg_restore.exe / psql.exe.")

    target_path = Path(target_path_str)
    if not target_path.exists():
        candidate = BACKUPS_DIR / target_path_str
        if candidate.exists():
            target_path = candidate
        else:
            raise FileNotFoundError(f"Backup archive not found: {target_path_str}")

    print(f"[Safety] Creating pre-restore backup of '{dbname}' first...")
    cmd_backup()

    env = os.environ.copy()
    env["PGPASSWORD"] = db_info["password"]
    pg_restore = str(pg_bin / "pg_restore.exe")
    psql = str(pg_bin / "psql.exe")

    if target_path.suffix.lower() == ".zip":
        temp_extract = BACKUPS_DIR / "_restore_tmp"
        if temp_extract.exists():
            shutil.rmtree(temp_extract)
        temp_extract.mkdir(parents=True, exist_ok=True)
        try:
            with zipfile.ZipFile(target_path, "r") as zf:
                zf.extractall(temp_extract)

            backup_files = list(temp_extract.glob("*.backup"))
            sql_files = list(temp_extract.glob("*.sql"))

            if backup_files:
                print(f"[Restore] Restoring database '{dbname}' from {backup_files[0].name} via pg_restore...")
                subprocess.run(
                    [
                        pg_restore,
                        "-h",
                        db_info["host"],
                        "-p",
                        db_info["port"],
                        "-U",
                        db_info["user"],
                        "-d",
                        dbname,
                        "--clean",
                        "--if-exists",
                        "--no-owner",
                        str(backup_files[0]),
                    ],
                    env=env,
                    check=True,
                )
            elif sql_files:
                print(f"[Restore] Restoring database '{dbname}' from {sql_files[0].name} via psql...")
                subprocess.run(
                    [
                        psql,
                        "-h",
                        db_info["host"],
                        "-p",
                        db_info["port"],
                        "-U",
                        db_info["user"],
                        "-d",
                        dbname,
                        "-f",
                        str(sql_files[0]),
                    ],
                    env=env,
                    check=True,
                )

            extracted_uploads = temp_extract / "uploads"
            if extracted_uploads.exists():
                UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
                shutil.copytree(extracted_uploads, UPLOADS_DIR, dirs_exist_ok=True)
                print(f"[Restore] Restored static uploads to {UPLOADS_DIR}")
        finally:
            shutil.rmtree(temp_extract, ignore_errors=True)
    elif target_path.suffix.lower() == ".backup":
        subprocess.run(
            [
                pg_restore,
                "-h",
                db_info["host"],
                "-p",
                db_info["port"],
                "-U",
                db_info["user"],
                "-d",
                dbname,
                "--clean",
                "--if-exists",
                "--no-owner",
                str(target_path),
            ],
            env=env,
            check=True,
        )
    elif target_path.suffix.lower() == ".sql":
        subprocess.run(
            [
                psql,
                "-h",
                db_info["host"],
                "-p",
                db_info["port"],
                "-U",
                db_info["user"],
                "-d",
                dbname,
                "-f",
                str(target_path),
            ],
            env=env,
            check=True,
        )
    print(f"[Restore] Successfully restored '{dbname}' from {target_path.name}!")


def main() -> None:
    parser = argparse.ArgumentParser(description="Sukasan POS Database Backup & Restore CLI")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("status", help="Show database connection, Alembic version, and table row counts")
    sub.add_parser("backup", help="Create a full .zip backup (.sql + .backup + static uploads)")
    sub.add_parser("list", help="List available backup archives")
    restore_p = sub.add_parser("restore", help="Restore database and uploads from a backup file")
    restore_p.add_argument("file", help="Path or filename of .zip, .backup, or .sql file")

    args = parser.parse_args()
    if args.command == "status":
        cmd_status()
    elif args.command == "backup":
        cmd_backup()
    elif args.command == "list":
        cmd_list()
    elif args.command == "restore":
        cmd_restore(args.file)


if __name__ == "__main__":
    main()
