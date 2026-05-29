use std::sync::Mutex;
use tauri::{AppHandle, Emitter};
use windows_sys::Win32::UI::WindowsAndMessaging::*;

static HOOK: Mutex<Option<HHOOK>> = Mutex::new(None);
static APP: Mutex<Option<AppHandle>> = Mutex::new(None);

/// Check whether Ctrl key is currently pressed
fn is_ctrl_pressed() -> bool {
    unsafe { (GetAsyncKeyState(0x11) & 0x8000) != 0 }
}

// SAFETY: Called from the Windows message loop thread. Short-lived callback.
unsafe extern "system" fn mouse_proc(code: i32, wparam: usize, lparam: isize) -> isize {
    if code >= 0 && wparam == WM_MOUSEWHEEL && is_ctrl_pressed() {
        // lparam points to MSLLHOOKSTRUCT; mouseData is at offset 8 (after POINT pt)
        let mouse_data = *(lparam.wrapping_add(8) as *const u32);
        let delta = ((mouse_data >> 16) as i16) as i32;
        let direction = if delta > 0 { "up" } else { "down" };

        if let Some(ref app) = *APP.lock().unwrap() {
            let _ = app.emit("mouse-wheel-adjust", direction);
        }

        // Return 1 to indicate we handled the event — it won't reach the game
        return 1;
    }

    // All other mouse events: pass through to the next hook
    unsafe { CallNextHookEx(0, code, wparam, lparam) }
}

/// Install the low-level mouse hook.
pub fn install(app: AppHandle) {
    *APP.lock().unwrap() = Some(app);

    unsafe {
        let hook = SetWindowsHookExW(WH_MOUSE_LL, Some(mouse_proc), std::ptr::null_mut(), 0);
        *HOOK.lock().unwrap() = hook;
    }
}

/// Uninstall the low-level mouse hook.
pub fn uninstall() {
    unsafe {
        if let Some(hook) = HOOK.lock().unwrap().take() {
            UnhookWindowsHookEx(hook);
        }
    }
    APP.lock().unwrap().take();
}
