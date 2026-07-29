mod backend; use std::sync::Mutex; use backend::{BackendProcess,spawn_backend}; use tauri::{Emitter,Manager};
#[tauri::command] async fn start_backend(a:tauri::AppHandle,s:tauri::State<'_,BackendProcess>)->Result<String,String>{spawn_backend(a,&s)}
fn main(){tauri::Builder::default().plugin(tauri_plugin_shell::init()).plugin(tauri_plugin_fs::init()).plugin(tauri_plugin_process::init())
    .manage(BackendProcess(Mutex::new(None))).invoke_handler(tauri::generate_handler![start_backend])
    .setup(|a|{let h=a.handle().clone();tauri::async_runtime::spawn(async move{
        if let Err(e)=start_backend(h.clone(),h.state::<BackendProcess>()).await{let _=h.emit("backend-status",format!("error:{e}"));}});Ok(())})
    .build(tauri::generate_context!()).expect("build error")
    .run(|a,e|{if let tauri::RunEvent::Exit=e{if let Some(mut c)=a.state::<BackendProcess>().0.lock().unwrap().take(){let _=c.kill();}}});}
