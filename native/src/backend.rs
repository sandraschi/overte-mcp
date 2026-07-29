use std::fs::{self,OpenOptions}; use std::io::{BufRead,BufReader,Write}; use std::net::{SocketAddr,TcpStream};
use std::path::PathBuf; use std::process::{Child,Command,Stdio}; use std::str::FromStr; use std::sync::Mutex;
use std::thread; use std::time::Duration;
use tauri::path::BaseDirectory; use tauri::{AppHandle,Emitter,Manager};
pub struct BackendProcess(pub Mutex<Option<Child>>);
const BN:&str="overte-mcp-backend.exe"; const BP:u16=11110; const ET:&str="OVERTE_MCP_TAURI";
fn dev()->Option<PathBuf>{if!cfg!(debug_assertions){return None}
    let p=PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("binaries").join("overte-mcp-backend-x86_64-pc-windows-msvc.exe");p.exists().then_some(p)}
fn logln(a:&AppHandle,m:&str){eprintln!("[backend] {m}");
    if let Ok(d)=a.path().app_log_dir(){let _=fs::create_dir_all(&d);
        if let Ok(mut f)=OpenOptions::new().create(true).append(true).open(d.join("backend-spawn.log")){let _=writeln!(f,"{m}");}}}
fn res(a:&AppHandle)->Result<PathBuf,String>{
    for p in &[BN,&format!("resources/{BN}")]{if let Ok(path)=a.path().resolve(p,BaseDirectory::Resource){if path.exists(){return Ok(path);}}}
    Err("bundled backend not found".into())}
pub fn mat(a:&AppHandle)->Result<PathBuf,String>{if let Some(d)=dev(){logln(a,&format!("dev:{}",d.display()));return Ok(d);}res(a)}
fn free(p:u16)->bool{
    #[cfg(windows)]{
        let k=format!("Stop-Process -Name 'overte-mcp-backend','overte_mcp-native' -Force -EA 0;taskkill /F /IM overte-mcp-backend.exe /T 2>$null;taskkill /F /IM overte_mcp-native.exe /T 2>$null");
        let _=Command::new("powershell.exe").args(["-NoProfile","-Command",&k]).stdout(Stdio::null()).stderr(Stdio::null()).status();
        let kp=format!("Get-NetTCPConnection -LocalPort {p} -EA 0 | %{{ taskkill /F /PID $_.OwningProcess /T 2>$null }}");
        let _=Command::new("powershell.exe").args(["-NoProfile","-Command",&kp]).stdout(Stdio::null()).stderr(Stdio::null()).status();
        for i in 0..240{
            let cmd=format!("if(Get-NetTCPConnection -LocalPort {p} -EA 0){{1}}else{{0}}");
            let o=Command::new("powershell.exe").args(["-NoProfile","-Command",&cmd]).stdout(Stdio::piped()).stderr(Stdio::null()).output();
            if o.ok().and_then(|x|String::from_utf8(x.stdout).ok().and_then(|s|s.trim().parse::<u32>().ok())).unwrap_or(1)==0{return true;}
            if i%15==0{let _=Command::new("powershell.exe").args(["-NoProfile","-Command",&k]).status();}thread::sleep(Duration::from_secs(1));}
        false}
    #[cfg(not(windows))]{true}}
pub fn spawn_backend(a:AppHandle,s:&BackendProcess)->Result<String,String>{
    if let Some(mut c)=s.0.lock().unwrap().take(){let _=c.kill();let _=c.wait();}
    if!free(BP){return Err(format!("port {BP} busy after 240s"));}
    let bp=mat(&a)?;let mut c=Command::new(&bp);
    c.env("MCP_PORT",BP.to_string()).env("MCP_HOST","127.0.0.1").env(ET,"1").stdout(Stdio::piped()).stderr(Stdio::piped());
    #[cfg(windows)]{use std::os::windows::process::CommandExt;c.creation_flags(0x0800_0000);}
    let mut child=c.spawn().map_err(|e|format!("spawn:{e}"))?;
    s.0.lock().unwrap().replace(child);
    let h=a.clone();thread::spawn(move||{
        let addr=SocketAddr::from_str(&format!("127.0.0.1:{BP}")).unwrap();
        for i in 0..30{thread::sleep(Duration::from_secs(2));
            if TcpStream::connect_timeout(&addr,Duration::from_secs(2)).is_ok(){
                logln(&h,&format!("health PASS({})",i+1));let _=h.emit("backend-status","ready");return;}}
        logln(&h,"health FAIL");let _=h.emit("backend-status","error");});
    Ok(format!("backend on {BP}"))}
