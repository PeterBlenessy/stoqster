// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command

// #[tauri::command]
// async fn show_main_window(window: tauri::WebviewWindow) {
//     get_webview_window("main").unwrap().show().unwrap();
// }

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        // .invoke_handler(tauri::generate_handler![show_main_window])
        .run(tauri::generate_context!())
        .expect("Some error occured while running application");
}
