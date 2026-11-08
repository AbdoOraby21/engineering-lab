#!/bin/bash
# Database backup / restore utility for Engineering Lab
#
# Usage:
#   BACKUP_DIR=./backups DATABASE_URL=... ./backup.sh backup
#   BACKUP_DIR=./backups DATABASE_URL=... ./backup.sh restore <file.sql>
#
# Requires pg_dump / pg_restore to be available on PATH.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DATABASE_URL="${DATABASE_URL:-}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set" >&2
  exit 1
fi

url=$(echo "$DATABASE_URL" | sed 's|postgresql://||')
user=$(echo "$url" | cut -d'/' -f1 | cut -d':' -f1)
password=$(echo "$url" | cut -d'/' -f1 | cut -d':' -f2 | sed 's/:.*//' || true)
host=$(echo "$url" | cut -d'/' -f3 | cut -d: -f1)
port=$(echo "$url" | cut -d'/' -f3 | cut -d: -f2 || echo "5432")
db=$(echo "$url" | cut -d'/' -f4 | sed 's/^\///')

env_export() {
  export PGHOST="$host"
  export PGPORT="$port"
  export PGDATABASE="$db"
  if [ -n "$password" ]; then
    export PGPASSWORD="$password"
  fi
  export PGUSER="$user"
}

run_backup() {
  mkdir -p "$BACKUP_DIR"
  timestamp=$(date +%Y-%m-%d_%H-%M-%S)
  backup_file="$BACKUP_DIR/db-${timestamp}.sql"
  env_export
  if pg_dump --no-owner --no-privileges --format=plain --file="$backup_file" "$db" > /dev/null 2>&1; then
    echo "Backup written to $backup_file"
  else
    echo "ERROR: pg_dump failed" >&2
    exit 1
  fi
}

run_restore() {
  if [ -z "$1" ]; then
    echo "ERROR: No backup file specified" >&2
    echo "Usage: $0 restore <file.sql>" >&2
    exit 1
  fi
  if [ ! -f "$1" ]; then
    echo "ERROR: Backup file not found: $1" >&2
    exit 1
  fi
  env_export
  if pg_restore --no-owner --no-privileges --clean --if-exists --dbname="$db" "$1" > /dev/null 2>&1; then
    echo "Restored from $1"
  else
    echo "ERROR: pg_restore failed" >&2
    exit 1
  fi
}

command="${1:-}"
case "$command" in
  backup)
    run_backup
    ;;
  restore)
    run_restore "$2"
    ;;
  *)
    echo "Usage: $0 backup|restore <file.sql>" >&2
    exit 1
    ;;
esac