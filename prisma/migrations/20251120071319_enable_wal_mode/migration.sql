-- Enable WAL mode for SQLite concurrency
-- WAL (Write-Ahead Logging) allows concurrent reads while writes are happening
PRAGMA journal_mode = WAL;
