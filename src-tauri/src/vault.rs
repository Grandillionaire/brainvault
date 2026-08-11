use anyhow::Result;
use chrono::{DateTime, Utc};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;
use walkdir::WalkDir;

use crate::database::{Attachment, Note};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultConfig {
    pub path: PathBuf,
    pub notes_folder: PathBuf,
    pub attachments_folder: PathBuf,
    pub templates_folder: PathBuf,
    pub daily_notes_folder: PathBuf,
}

impl Default for VaultConfig {
    fn default() -> Self {
        let base_path = dirs::document_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("BrainVault");

        VaultConfig {
            path: base_path.clone(),
            notes_folder: base_path.join("notes"),
            attachments_folder: base_path.join("attachments"),
            templates_folder: base_path.join("templates"),
            daily_notes_folder: base_path.join("notes").join("daily"),
        }
    }
}

pub struct Vault {
    config: VaultConfig,
    watcher: Option<notify::RecommendedWatcher>,
}

impl Vault {
    pub fn new(config: VaultConfig) -> Result<Self> {
        // Create vault directories if they don't exist
        fs::create_dir_all(&config.path)?;
        fs::create_dir_all(&config.notes_folder)?;
        fs::create_dir_all(&config.attachments_folder)?;
        fs::create_dir_all(&config.templates_folder)?;
        fs::create_dir_all(&config.daily_notes_folder)?;

        // Create default .brainvault config folder
        let config_dir = config.path.join(".brainvault");
        fs::create_dir_all(&config_dir)?;

        Ok(Vault {
            config,
            watcher: None,
        })
    }

    pub fn create_note(&self, title: &str, content: &str, tags: Vec<String>) -> Result<Note> {
        let id = Uuid::new_v4().to_string();
        let file_path = self.free_note_path(title);

        // Create frontmatter
        let frontmatter = create_frontmatter(&id, title, &tags);
        let full_content = format!("{}\n\n{}", frontmatter, content);

        // Write to file
        write_atomic(&file_path, &full_content)?;

        // Extract metadata
        let plain_content = strip_markdown(content);
        let links = extract_wiki_links(content);

        Ok(Note {
            id: id.clone(),
            title: title.to_string(),
            content: content.to_string(),
            plain_content,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            tags,
            links,
            backlinks: Vec::new(),
            attachments: Vec::new(),
            metadata: serde_json::json!({
                "file_path": file_path.to_string_lossy(),
            }),
            path: Some(file_path.to_string_lossy().to_string()),
        })
    }

    /// Pick a file name no other note already occupies.
    ///
    /// The slug alone is not unique: a second note titled "Meeting Notes"
    /// would truncate and replace the first one's file.
    fn free_note_path(&self, title: &str) -> PathBuf {
        let mut base = slugify(title);
        if base.is_empty() {
            base = "untitled".to_string();
        }

        let mut candidate = self.config.notes_folder.join(format!("{}.md", base));
        let mut counter = 1;
        while candidate.exists() {
            counter += 1;
            candidate = self
                .config
                .notes_folder
                .join(format!("{}-{}.md", base, counter));
        }

        candidate
    }

    pub fn update_note(&self, id: &str, content: &str) -> Result<Note> {
        // Find the note file
        let note_path = self.find_note_file(id)?;

        // Read existing frontmatter
        let existing_content = fs::read_to_string(&note_path)?;
        let (frontmatter, _) = parse_frontmatter(&existing_content)?;

        // Update frontmatter
        let mut metadata: HashMap<String, String> = frontmatter;
        metadata.insert("updated_at".to_string(), Utc::now().to_rfc3339());

        // Extract new tags and links
        let tags = extract_tags(content);
        let links = extract_wiki_links(content);

        // Create new content with updated frontmatter
        let new_frontmatter = create_frontmatter_from_map(&metadata);
        let full_content = format!("{}\n\n{}", new_frontmatter, content);

        // Write to file
        write_atomic(&note_path, &full_content)?;

        // Return updated note
        Ok(Note {
            id: id.to_string(),
            title: metadata.get("title").cloned().unwrap_or_default(),
            content: content.to_string(),
            plain_content: strip_markdown(content),
            created_at: metadata
                .get("created_at")
                .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(Utc::now),
            updated_at: Utc::now(),
            tags,
            links,
            backlinks: Vec::new(),
            attachments: Vec::new(),
            metadata: serde_json::json!(metadata),
            path: Some(note_path.to_string_lossy().to_string()),
        })
    }

    pub fn delete_note(&self, id: &str) -> Result<bool> {
        let note_path = self.find_note_file(id)?;

        // Move to trash folder instead of deleting
        let trash_folder = self.config.path.join(".trash");
        fs::create_dir_all(&trash_folder)?;

        let file_name = note_path.file_name().unwrap();
        let trash_path = trash_folder.join(format!(
            "{}_{}.md",
            Utc::now().timestamp(),
            file_name.to_string_lossy()
        ));

        fs::rename(&note_path, &trash_path)?;
        Ok(true)
    }

    pub fn load_all_notes(&self) -> Result<Vec<Note>> {
        let mut notes = Vec::new();

        for entry in WalkDir::new(&self.config.notes_folder)
            .follow_links(true)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if entry.file_type().is_file() {
                let path = entry.path();
                if path.extension().and_then(|s| s.to_str()) == Some("md") {
                    if let Ok(note) = self.load_note_from_file(path) {
                        notes.push(note);
                    }
                }
            }
        }

        Ok(notes)
    }

    fn load_note_from_file(&self, path: &Path) -> Result<Note> {
        let content = fs::read_to_string(path)?;
        let (frontmatter, body) = parse_frontmatter(&content)?;

        let id = frontmatter
            .get("id")
            .cloned()
            .unwrap_or_else(|| Uuid::new_v4().to_string());

        let title = frontmatter
            .get("title")
            .cloned()
            .unwrap_or_else(|| path.file_stem().unwrap().to_string_lossy().to_string());

        let tags = frontmatter
            .get("tags")
            .and_then(|s| serde_json::from_str::<Vec<String>>(s).ok())
            .unwrap_or_else(|| extract_tags(&body));

        let links = extract_wiki_links(&body);

        let created_at = frontmatter
            .get("created_at")
            .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
            .map(|dt| dt.with_timezone(&Utc))
            .unwrap_or_else(Utc::now);

        let updated_at = frontmatter
            .get("updated_at")
            .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
            .map(|dt| dt.with_timezone(&Utc))
            .unwrap_or(created_at);

        Ok(Note {
            id,
            title,
            content: body.clone(),
            plain_content: strip_markdown(&body),
            created_at,
            updated_at,
            tags,
            links,
            backlinks: Vec::new(),
            attachments: Vec::new(),
            metadata: serde_json::json!(frontmatter),
            path: Some(path.to_string_lossy().to_string()),
        })
    }

    fn find_note_file(&self, id: &str) -> Result<PathBuf> {
        for entry in WalkDir::new(&self.config.notes_folder)
            .follow_links(true)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if entry.file_type().is_file() {
                let path = entry.path();
                if path.extension().and_then(|s| s.to_str()) == Some("md") {
                    // One unreadable file (non-UTF-8, half-written, binary with
                    // a .md name) must not abort the search for every note.
                    let Ok(content) = fs::read_to_string(path) else {
                        continue;
                    };
                    if let Ok((frontmatter, _)) = parse_frontmatter(&content) {
                        if frontmatter.get("id").map(|s| s == id).unwrap_or(false) {
                            return Ok(path.to_path_buf());
                        }
                    }
                }
            }
        }

        Err(anyhow::anyhow!("Note with id {} not found", id))
    }

    pub fn save_attachment(&self, name: &str, data: &[u8]) -> Result<Attachment> {
        let id = Uuid::new_v4().to_string();
        let file_path = self.config.attachments_folder.join(&name);

        fs::write(&file_path, data)?;

        Ok(Attachment {
            id,
            name: name.to_string(),
            path: file_path.to_string_lossy().to_string(),
            size: data.len() as u64,
            mime_type: mime_guess::from_path(&file_path)
                .first_or_octet_stream()
                .to_string(),
            created_at: Utc::now(),
        })
    }

    pub fn get_daily_note_path(&self, date: &DateTime<Utc>) -> PathBuf {
        let file_name = format!("{}.md", date.format("%Y-%m-%d"));
        self.config.daily_notes_folder.join(file_name)
    }

    pub fn create_daily_note(&self, date: &DateTime<Utc>) -> Result<Note> {
        let title = format!("Daily Note - {}", date.format("%Y-%m-%d"));
        let template = self.get_daily_note_template();
        let content = template.replace("{{date}}", &date.format("%B %d, %Y").to_string());

        self.create_note(&title, &content, vec!["daily".to_string()])
    }

    fn get_daily_note_template(&self) -> String {
        let template_path = self.config.templates_folder.join("daily.md");

        if template_path.exists() {
            fs::read_to_string(template_path).unwrap_or_else(|_| default_daily_template())
        } else {
            default_daily_template()
        }
    }
}

// Helper functions

/// Write via a temp file and rename, so an interrupted or failing write can
/// never leave a truncated note behind.
fn write_atomic(path: &Path, contents: &str) -> Result<()> {
    let temp_path = path.with_extension("md.tmp");
    fs::write(&temp_path, contents)?;
    fs::rename(&temp_path, path)?;
    Ok(())
}

fn slugify(text: &str) -> String {
    text.to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' { c } else { '-' })
        .collect::<String>()
        .split('-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

fn create_frontmatter(id: &str, title: &str, tags: &[String]) -> String {
    format!(
        "---\nid: {}\ntitle: {}\ntags: {}\ncreated_at: {}\nupdated_at: {}\n---",
        id,
        title,
        serde_json::to_string(tags).unwrap_or_else(|_| "[]".to_string()),
        Utc::now().to_rfc3339(),
        Utc::now().to_rfc3339()
    )
}

fn create_frontmatter_from_map(metadata: &HashMap<String, String>) -> String {
    let mut lines = vec!["---".to_string()];
    for (key, value) in metadata {
        lines.push(format!("{}: {}", key, value));
    }
    lines.push("---".to_string());
    lines.join("\n")
}

fn parse_frontmatter(content: &str) -> Result<(HashMap<String, String>, String)> {
    let re = Regex::new(r"^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$")?;

    if let Some(captures) = re.captures(content) {
        let frontmatter_str = captures.get(1).map_or("", |m| m.as_str());
        let body = captures.get(2).map_or("", |m| m.as_str());

        let mut metadata = HashMap::new();
        for line in frontmatter_str.lines() {
            if let Some((key, value)) = line.split_once(':') {
                metadata.insert(
                    key.trim().to_string(),
                    value.trim().to_string(),
                );
            }
        }

        Ok((metadata, body.to_string()))
    } else {
        Ok((HashMap::new(), content.to_string()))
    }
}

fn strip_markdown(content: &str) -> String {
    content
        .lines()
        .map(|line| {
            line.trim_start_matches('#')
                .replace("**", "")
                .replace("*", "")
                .replace("__", "")
                .replace("_", "")
                .replace("~~", "")
                .replace("`", "")
                .to_string()
        })
        .filter(|line| !line.trim().is_empty())
        .collect::<Vec<_>>()
        .join(" ")
}

fn extract_tags(content: &str) -> Vec<String> {
    let re = Regex::new(r"#(\w+)").unwrap();
    let mut tags: Vec<String> = re
        .captures_iter(content)
        .map(|cap| cap[1].to_string())
        .collect();
    tags.sort();
    tags.dedup();
    tags
}

fn extract_wiki_links(content: &str) -> Vec<String> {
    let re = Regex::new(r"\[\[([^\]]+)\]\]").unwrap();
    let mut links: Vec<String> = re
        .captures_iter(content)
        .map(|cap| cap[1].to_string())
        .collect();
    links.sort();
    links.dedup();
    links
}

fn default_daily_template() -> String {
    r#"# {{date}}

## 📝 Tasks
- [ ]

## 💭 Notes


## 🎯 Goals for Today


## 📚 Reading List


## 💡 Ideas


## 🙏 Gratitude
"#.to_string()
}
#[cfg(test)]
mod tests {
    use super::*;

    fn temp_vault() -> (Vault, PathBuf) {
        let base = std::env::temp_dir().join(format!("brainvault-test-{}", Uuid::new_v4()));
        let config = VaultConfig {
            path: base.clone(),
            notes_folder: base.join("notes"),
            attachments_folder: base.join("attachments"),
            templates_folder: base.join("templates"),
            daily_notes_folder: base.join("notes").join("daily"),
        };
        (Vault::new(config).expect("vault"), base)
    }

    #[test]
    fn create_note_does_not_overwrite_a_same_titled_note() {
        let (vault, base) = temp_vault();

        let first = vault
            .create_note("Meeting Notes", "first body", vec![])
            .expect("first");
        let second = vault
            .create_note("Meeting Notes", "second body", vec![])
            .expect("second");

        assert_ne!(first.path, second.path);
        let first_on_disk = fs::read_to_string(first.path.clone().unwrap()).unwrap();
        assert!(first_on_disk.contains("first body"));

        fs::remove_dir_all(base).ok();
    }

    #[test]
    fn create_note_falls_back_when_the_title_has_no_slug_characters() {
        let (vault, base) = temp_vault();

        let note = vault.create_note("!!!", "body", vec![]).expect("note");

        assert!(note.path.unwrap().ends_with("untitled.md"));
        fs::remove_dir_all(base).ok();
    }

    #[test]
    fn find_note_file_skips_files_it_cannot_read_as_utf8() {
        let (vault, base) = temp_vault();

        let note = vault.create_note("Real Note", "body", vec![]).expect("note");
        // A latin-1 note or a stray binary with a .md extension
        fs::write(vault.config.notes_folder.join("broken.md"), [0xff, 0xfe, 0x00]).unwrap();

        let found = vault.find_note_file(&note.id).expect("still finds the note");
        assert_eq!(found, PathBuf::from(note.path.unwrap()));

        // The whole folder must still be searchable: the bad file may sort
        // after the note we want, so the failure only shows on a full scan.
        let err = vault
            .find_note_file("no-such-id")
            .expect_err("missing note should be reported as missing");
        assert!(
            err.to_string().contains("not found"),
            "one unreadable file aborted the search: {err}"
        );

        fs::remove_dir_all(base).ok();
    }

    #[test]
    fn update_note_leaves_no_temp_file_behind() {
        let (vault, base) = temp_vault();

        let note = vault.create_note("Journal", "v1", vec![]).expect("note");
        vault.update_note(&note.id, "v2").expect("update");

        let mut names: Vec<String> = fs::read_dir(&vault.config.notes_folder)
            .unwrap()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_type().map(|t| t.is_file()).unwrap_or(false))
            .map(|e| e.file_name().to_string_lossy().to_string())
            .collect();
        names.sort();
        assert_eq!(names, vec!["journal.md".to_string()]);

        fs::remove_dir_all(base).ok();
    }

    #[test]
    fn slugify_keeps_non_latin_scripts() {
        assert_eq!(slugify("日本語のノート"), "日本語のノート");
        assert_eq!(slugify("Заметка о работе"), "заметка-о-работе");
        assert_eq!(slugify("!!!"), "");
    }
}
