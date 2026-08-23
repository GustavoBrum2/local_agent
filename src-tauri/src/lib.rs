use serde_json::Value;
use std::{fs, path::PathBuf, process::Command};
use tauri::{path::BaseDirectory, Manager};

const DIGITAL_TWIN_FILENAME: &str = "digital-twin.json";

fn twin_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir.join(DIGITAL_TWIN_FILENAME))
}

#[tauri::command]
fn detect_hardware(app: tauri::AppHandle) -> Result<Value, String> {
    #[cfg(not(target_os = "windows"))]
    {
        let _ = app;
        return Err("O coletor deste MVP foi implementado para Windows.".into());
    }

    #[cfg(target_os = "windows")]
    {
        let script = app
            .path()
            .resolve("resources/collect-hardware.ps1", BaseDirectory::Resource)
            .map_err(|error| error.to_string())?;

        let output = Command::new("powershell.exe")
            .args([
                "-NoLogo",
                "-NoProfile",
                "-NonInteractive",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
            ])
            .arg(&script)
            .output()
            .map_err(|error| format!("Falha ao iniciar coletor PowerShell: {error}"))?;

        if !output.status.success() {
            return Err(format!(
                "Falha na coleta de hardware: {}",
                String::from_utf8_lossy(&output.stderr).trim()
            ));
        }

        let stdout = String::from_utf8(output.stdout)
            .map_err(|error| format!("Resposta do coletor não é UTF-8: {error}"))?;

        serde_json::from_str(stdout.trim())
            .map_err(|error| format!("JSON inválido retornado pelo coletor: {error}"))
    }
}

#[tauri::command]
fn save_digital_twin(app: tauri::AppHandle, json: String) -> Result<(), String> {
    // Valida antes de persistir para evitar gravar um arquivo corrompido.
    let _: Value = serde_json::from_str(&json).map_err(|error| error.to_string())?;
    fs::write(twin_path(&app)?, json).map_err(|error| error.to_string())
}

#[tauri::command]
fn load_digital_twin(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let path = twin_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    fs::read_to_string(path).map(Some).map_err(|error| error.to_string())
}

#[tauri::command]
fn delete_digital_twin(app: tauri::AppHandle) -> Result<(), String> {
    let path = twin_path(&app)?;
    if path.exists() {
        fs::remove_file(path).map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            detect_hardware,
            save_digital_twin,
            load_digital_twin,
            delete_digital_twin
        ])
        .run(tauri::generate_context!())
        .expect("erro ao executar Local Chat");
}
