use anyhow::Result;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: String,
    pub plain_content: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub tags: Vec<String>,
    pub links: Vec<String>,
    pub backlinks: Vec<String>,
    pub attachments: Vec<Attachment>,
    pub metadata: serde_json::Value,
    pub path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Attachment {
    pub id: String,
    pub name: String,
    pub path: String,
    pub size: u64,
    pub mime_type: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub note: Note,
    pub score: f64,
    pub snippet: String,
}

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new(path: &Path) -> Result<Self> {
        let conn = Connection::open(path)?;

        // Enable FTS5
        conn.execute_batch("PRAGMA journal_mode=WAL;")?;

        // Create tables
        conn.execute(
            "CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                plain_content TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                tags TEXT,
                links TEXT,
                backlinks TEXT,
                attachments TEXT,
                metadata TEXT,
                path TEXT
            )",
            [],
        )?;

        // Create FTS5 virtual table for full-text search
        conn.execute(
            "CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
                title,
                plain_content,
                tags,
                content=notes,
                content_rowid=rowid,
                tokenize='porter unicode61'
            )",
            [],
        )?;

        // Create triggers to keep FTS index in sync
        conn.execute(
            "CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
                INSERT INTO notes_fts(rowid, title, plain_content, tags)
                VALUES (new.rowid, new.title, new.plain_content, new.tags);
            END",
            [],
        )?;

        conn.execute(
            "CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
                DELETE FROM notes_fts WHERE rowid = old.rowid;
            END",
            [],
        )?;

        conn.execute(
            "CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
                UPDATE notes_fts
                SET title = new.title, plain_content = new.plain_content, tags = new.tags
                WHERE rowid = new.rowid;
            END",
            [],
        )?;

        // Create settings table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )",
            [],
        )?;

        // Create indexes
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_notes_created ON notes(created_at)",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at)",
            [],
        )?;

        Ok(Database { conn })
    }

    pub fn create_note(&self, note: &Note) -> Result<()> {
        let tags_json = serde_json::to_string(&note.tags)?;
        let links_json = serde_json::to_string(&note.links)?;
        let backlinks_json = serde_json::to_string(&note.backlinks)?;
        let attachments_json = serde_json::to_string(&note.attachments)?;
        let metadata_json = serde_json::to_string(&note.metadata)?;

        self.conn.execute(
            "INSERT INTO notes (
                id, title, content, plain_content, created_at, updated_at,
                tags, links, backlinks, attachments, metadata, path
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                note.id,
                note.title,
                note.content,
                note.plain_content,
                note.created_at,
                note.updated_at,
                tags_json,
                links_json,
                backlinks_json,
                attachments_json,
                metadata_json,
                note.path
            ],
        )?;

        Ok(())
    }

    pub fn update_note(&self, id: &str, content: &str) -> Result<Note> {
        let plain_content = strip_markdown(content);
        let tags = extract_tags(content);
        let links = extract_wiki_links(content);

        let tags_json = serde_json::to_string(&tags)?;
        let links_json = serde_json::to_string(&links)?;

        self.conn.execute(
            "UPDATE notes SET content = ?1, plain_content = ?2, tags = ?3, links = ?4, updated_at = ?5 WHERE id = ?6",
            params![content, plain_content, tags_json, links_json, Utc::now(), id],
        )?;

        self.get_note(id)?.ok_or_else(|| anyhow::anyhow!("Note not found"))
    }

    pub fn delete_note(&self, id: &str) -> Result<bool> {
        let deleted = self.conn.execute("DELETE FROM notes WHERE id = ?1", params![id])?;
        Ok(deleted > 0)
    }

    pub fn get_note(&self, id: &str) -> Result<Option<Note>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, title, content, plain_content, created_at, updated_at,
             tags, links, backlinks, attachments, metadata, path
             FROM notes WHERE id = ?1"
        )?;

        let note = stmt.query_row(params![id], |row| {
            Ok(Note {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                plain_content: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                tags: serde_json::from_str(&row.get::<_, String>(6)?).unwrap_or_default(),
                links: serde_json::from_str(&row.get::<_, String>(7)?).unwrap_or_default(),
                backlinks: serde_json::from_str(&row.get::<_, String>(8)?).unwrap_or_default(),
                attachments: serde_json::from_str(&row.get::<_, String>(9)?).unwrap_or_default(),
                metadata: serde_json::from_str(&row.get::<_, String>(10)?).unwrap_or_default(),
                path: row.get(11)?,
            })
        }).optional()?;

        Ok(note)
    }

    pub fn list_notes(&self) -> Result<Vec<Note>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, title, content, plain_content, created_at, updated_at,
             tags, links, backlinks, attachments, metadata, path
             FROM notes ORDER BY updated_at DESC"
        )?;

        let notes = stmt.query_map([], |row| {
            Ok(Note {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                plain_content: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                tags: serde_json::from_str(&row.get::<_, String>(6)?).unwrap_or_default(),
                links: serde_json::from_str(&row.get::<_, String>(7)?).unwrap_or_default(),
                backlinks: serde_json::from_str(&row.get::<_, String>(8)?).unwrap_or_default(),
                attachments: serde_json::from_str(&row.get::<_, String>(9)?).unwrap_or_default(),
                metadata: serde_json::from_str(&row.get::<_, String>(10)?).unwrap_or_default(),
                path: row.get(11)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(notes)
    }

    pub fn search_notes(&self, query: &str) -> Result<Vec<SearchResult>> {
        let mut stmt = self.conn.prepare(
            "SELECT
                n.id, n.title, n.content, n.plain_content, n.created_at, n.updated_at,
                n.tags, n.links, n.backlinks, n.attachments, n.metadata, n.path,
                rank
             FROM notes n
             JOIN notes_fts ON n.rowid = notes_fts.rowid
             WHERE notes_fts MATCH ?1
             ORDER BY rank"
        )?;

        let results = stmt.query_map(params![query], |row| {
            let note = Note {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                plain_content: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                tags: serde_json::from_str(&row.get::<_, String>(6)?).unwrap_or_default(),
                links: serde_json::from_str(&row.get::<_, String>(7)?).unwrap_or_default(),
                backlinks: serde_json::from_str(&row.get::<_, String>(8)?).unwrap_or_default(),
                attachments: serde_json::from_str(&row.get::<_, String>(9)?).unwrap_or_default(),
                metadata: serde_json::from_str(&row.get::<_, String>(10)?).unwrap_or_default(),
                path: row.get(11)?,
            };

            let rank: f64 = row.get(12)?;
            let snippet = extract_snippet(&note.plain_content, query, 150);

            Ok(SearchResult {
                note,
                score: -rank, // FTS5 rank is negative
                snippet,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(results)
    }

    pub fn get_setting(&self, key: &str) -> Result<Option<String>> {
        let mut stmt = self.conn.prepare("SELECT value FROM settings WHERE key = ?1")?;
        let value = stmt.query_row(params![key], |row| {
            row.get(0)
        }).optional()?;
        Ok(value)
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            params![key, value],
        )?;
        Ok(())
    }
}

// Helper functions
fn strip_markdown(content: &str) -> String {
    // Simple markdown stripping - can be enhanced
    content
        .replace("#", "")
        .replace("*", "")
        .replace("_", "")
        .replace("[", "")
        .replace("]", "")
        .replace("(", "")
        .replace(")", "")
        .replace("`", "")
        .replace("~", "")
        .replace(">", "")
        .trim()
        .to_string()
}

fn extract_tags(content: &str) -> Vec<String> {
    let re = regex::Regex::new(r"#(\w+)").unwrap();
    re.captures_iter(content)
        .map(|cap| cap[1].to_string())
        .collect::<Vec<_>>()
}

fn extract_wiki_links(content: &str) -> Vec<String> {
    let re = regex::Regex::new(r"\[\[([^\]]+)\]\]").unwrap();
    re.captures_iter(content)
        .map(|cap| cap[1].to_string())
        .collect::<Vec<_>>()
}

fn extract_snippet(content: &str, query: &str, max_length: usize) -> String {
    let lower_content = content.to_lowercase();
    let lower_query = query.to_lowercase();

    if let Some(pos) = lower_content.find(&lower_query) {
        let start = pos.saturating_sub(50);
        let end = (pos + query.len() + 100).min(content.len());
        let mut snippet = content[start..end].to_string();

        if start > 0 {
            snippet = format!("...{}", snippet);
        }
        if end < content.len() {
            snippet = format!("{}...", snippet);
        }

        snippet
    } else {
        content.chars().take(max_length).collect::<String>()
    }
}