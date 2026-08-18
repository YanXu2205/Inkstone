/// Inkstone desktop shell.
///
/// All editor logic lives in the web layer (src/); the Rust side only
/// wires up the dialog + fs plugins so the web app can read and write
/// real local files.
#[tauri::mobile_entry_point]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running Inkstone");
}
