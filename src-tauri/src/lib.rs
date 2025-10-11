mod database;
mod vault;

use database::{Database, Note, SearchResult};
use vault::{Vault, VaultConfig};
use std::sync::Arc;
use std::sync::Mutex;
use tauri::State;
use serde_json::Value as JsonValue;

pub struct AppState {
    db: Arc<Mutex<Database>>,
    vault: Arc<Mutex<Vault>>,
}

#[tauri::command]
async fn create_note(
    state: State<'_, AppState>,
    title: String,
    content: String,
    tags: Vec<String>,
) -> Result<Note, String> {
    let vault = state.vault.lock().map_err(|e| e.to_string())?;
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let note = vault
        .create_note(&title, &content, tags)
        .map_err(|e| e.to_string())?;

    db.create_note(&note).map_err(|e| e.to_string())?;

    Ok(note)
}

#[tauri::command]
async fn update_note(
    state: State<'_, AppState>,
    id: String,
    content: String,
) -> Result<Note, String> {
    let vault = state.vault.lock().map_err(|e| e.to_string())?;
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let _note = vault.update_note(&id, &content).map_err(|e| e.to_string())?;
    let updated = db.update_note(&id, &content).map_err(|e| e.to_string())?;

    Ok(updated)
}

#[tauri::command]
async fn delete_note(state: State<'_, AppState>, id: String) -> Result<bool, String> {
    let vault = state.vault.lock().map_err(|e| e.to_string())?;
    let db = state.db.lock().map_err(|e| e.to_string())?;

    vault.delete_note(&id).map_err(|e| e.to_string())?;
    let deleted = db.delete_note(&id).map_err(|e| e.to_string())?;

    Ok(deleted)
}

#[tauri::command]
async fn get_note(state: State<'_, AppState>, id: String) -> Result<Option<Note>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_note(&id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn list_notes(state: State<'_, AppState>) -> Result<Vec<Note>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.list_notes().map_err(|e| e.to_string())
}

#[tauri::command]
async fn search_notes(
    state: State<'_, AppState>,
    query: String,
) -> Result<Vec<SearchResult>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.search_notes(&query).map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_settings(state: State<'_, AppState>) -> Result<JsonValue, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    if let Ok(Some(settings_str)) = db.get_setting("user_settings") {
        serde_json::from_str(&settings_str).map_err(|e| e.to_string())
    } else {
        // Return default settings
        Ok(serde_json::json!({
            "general": {
                "vaultPath": "~/Documents/BrainVault",
                "autoSave": true,
                "autoSaveInterval": 30000,
                "spellCheck": true,
                "defaultView": "split"
            },
            "appearance": {
                "theme": "auto",
                "font": "Inter",
                "fontSize": 16,
                "lineHeight": 1.6
            }
        }))
    }
}

#[tauri::command]
async fn update_settings(
    state: State<'_, AppState>,
    settings: JsonValue,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let settings_str = serde_json::to_string(&settings).map_err(|e| e.to_string())?;
    db.set_setting("user_settings", &settings_str)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn reset_settings(state: State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.set_setting("user_settings", "{}")
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn init_vault(state: State<'_, AppState>) -> Result<(), String> {
    let vault = state.vault.lock().map_err(|e| e.to_string())?;
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Load all notes from the vault
    let notes = vault.load_all_notes().map_err(|e| e.to_string())?;

    // Sync with database
    for note in notes {
        if db.get_note(&note.id).map_err(|e| e.to_string())?.is_none() {
            db.create_note(&note).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize vault and database
    let vault_config = VaultConfig::default();
    let vault = Vault::new(vault_config).expect("Failed to initialize vault");

    let db_path = dirs::data_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("BrainVault")
        .join("brainvault.db");

    std::fs::create_dir_all(db_path.parent().unwrap()).ok();

    let db = Database::new(&db_path).expect("Failed to initialize database");

    let app_state = AppState {
        db: Arc::new(Mutex::new(db)),
        vault: Arc::new(Mutex::new(vault)),
    };

    tauri::Builder::default()
        .manage(app_state)
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            create_note,
            update_note,
            delete_note,
            get_note,
            list_notes,
            search_notes,
            get_settings,
            update_settings,
            reset_settings,
            init_vault,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
