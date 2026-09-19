"""GUI automation for EmoteLab confined to a dedicated virtual desktop.

HARD RULE: never click/capture on the user's own desktop. Everything here runs
on a separate virtual desktop named "EmoteLab-Auto":
  launch        ensure the dedicated desktop exists, start EmoteLab.exe, move
                its window there, switch to it; prints window geometry JSON
  click X Y     left-click at window-CLIENT coordinates (--shot FILE, --wait S)
  rclick X Y    right-click
  drag X1 Y1 X2 Y2
  wheel X Y D   scroll (D<0 down)
  shot FILE     capture the game window
  done          switch back to the desktop that was active before launch

State (home desktop id) is persisted in %TEMP%\\emotelab_vdesktop.json so each
subcommand works as a standalone process invocation.
"""
import argparse
import ctypes
import ctypes.wintypes as wt
import json
import os
import subprocess
import sys
import tempfile
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import emotelab_common as ec

AUTO_NAME = "EmoteLab-Auto"
PW_RENDERFULLCONTENT = 2
STATE_FILE = os.path.join(tempfile.gettempdir(), "emotelab_vdesktop.json")
user32 = ctypes.windll.user32
gdi32 = ctypes.windll.gdi32

# Per-Monitor-DPI-Aware: coords in screenshots then map 1:1 to click coords.
try:
    user32.SetProcessDpiAwarenessContext(ctypes.c_void_p(-4))
except Exception:
    pass


class BITMAPINFOHEADER(ctypes.Structure):
    _fields_ = [("biSize", wt.DWORD), ("biWidth", wt.LONG), ("biHeight", wt.LONG),
                ("biPlanes", wt.WORD), ("biBitCount", wt.WORD), ("biCompression", wt.DWORD),
                ("biSizeImage", wt.DWORD), ("biXPelsPerMeter", wt.LONG), ("biYPelsPerMeter", wt.LONG),
                ("biClrUsed", wt.DWORD), ("biClrImportant", wt.DWORD)]


def _pyvda():
    import pyvda
    return pyvda


def _save_state(data):
    with open(STATE_FILE, "w") as f:
        json.dump(data, f)


def _load_state():
    try:
        with open(STATE_FILE) as f:
            return json.load(f)
    except Exception:
        return {}


def ensure_auto_desktop():
    pyvda = _pyvda()
    for d in pyvda.get_virtual_desktops():
        if d.name == AUTO_NAME:
            return d
    d = pyvda.VirtualDesktop.create()
    try:
        d.rename(AUTO_NAME)
    except Exception:
        pass
    return d


def _ensure_auto_active():
    """Guard: input must NEVER land on the user's desktop."""
    pyvda = _pyvda()
    cur = pyvda.VirtualDesktop.current()
    if cur.name != AUTO_NAME:
        auto = None
        for d in pyvda.get_virtual_desktops():
            if d.name == AUTO_NAME:
                auto = d
                break
        if auto is None:
            raise SystemExit("auto desktop missing")
        auto.go()
        time.sleep(0.8)


def game_window(timeout=40):
    """Find the EmoteLab Unity window (class UnityWndClass)."""
    end = time.time() + timeout
    while True:
        hwnd = user32.FindWindowW("UnityWndClass", "EmoteLab")
        if hwnd and user32.IsWindowVisible(hwnd):
            return hwnd
        if time.time() > end:
            return None
        time.sleep(1)


def ensure_window_usable(hwnd):
    """Leave the window restored and non-minimized.

    Switching virtual desktops can leave Unity minimized; a minimized window has
    a 0x0 client rect parked at (-32000,-32000), which makes both capture and
    clicks fail with "window has no client area".
    """
    if user32.IsIconic(hwnd):
        user32.ShowWindow(hwnd, 9)  # SW_RESTORE
        time.sleep(1.5)
    for _ in range(10):
        w, h = client_rect(hwnd)
        if w > 0 and h > 0:
            return True
        time.sleep(0.5)
    return False


def _pin_registry_screen():
    """Borderless fullscreen 1920x1080 (client == whole screen on the auto
    desktop, so reference coordinates are always exact). Original values are
    remembered and restored by `done`."""
    import winreg
    key_path = r"Software\GlycoProduction\EmoteLab"
    vals = {
        "Screenmanager Fullscreen mode_h3630240806": 1,
        "Screenmanager Resolution Width_h182942802": 1920,
        "Screenmanager Resolution Height_h2627697771": 1080,
    }
    with winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_ALL_ACCESS) as k:
        original = {}
        for name, v in vals.items():
            try:
                original[name] = winreg.QueryValueEx(k, name)[0]
            except FileNotFoundError:
                pass
            winreg.SetValueEx(k, name, 0, winreg.REG_DWORD, v)
    st = _load_state()
    st.setdefault("screen_original", original)
    _save_state(st)


def launch():
    pyvda = _pyvda()
    home = pyvda.VirtualDesktop.current()
    auto = ensure_auto_desktop()
    _save_state({"home_desktop_id": str(home.id)})

    hwnd = game_window(timeout=1)
    if not hwnd:
        running = "EmoteLab.exe" in subprocess.run(["tasklist", "/FO", "CSV"], capture_output=True).stdout.decode(
            "utf-8", "ignore")
        if not running:
            _pin_registry_screen()
            exe = ec.exe_path()
            subprocess.Popen([exe], cwd=os.path.dirname(exe))
        hwnd = game_window()
    if not hwnd:
        raise SystemExit("EmoteLab window did not appear")

    av = pyvda.AppView(hwnd)
    try:
        av.move(auto)
    except Exception as e:
        print(f"WARN: move window to auto desktop failed: {e}", file=sys.stderr)
    auto.go()
    time.sleep(1.0)
    ensure_window_usable(hwnd)
    _pin_window_size(hwnd)
    user32.SetForegroundWindow(hwnd)
    time.sleep(0.8)
    w, h = client_rect(hwnd)
    print(json.dumps({"hwnd": hwnd, "client_w": w, "client_h": h}))


def _pin_window_size(hwnd, cw=1920, ch=1080):
    """Resize so the CLIENT area is exactly cw x ch (Unity renders at that size).
    Converges by measuring actual client rect and correcting for non-client
    chrome, because AdjustWindowRect alone mis-estimates Unity's title bar.
    Reference coordinates in the skill assume 1920x1080; use fractions when
    the work area is too small to pin."""
    class RECTS(ctypes.Structure):
        _fields_ = [("l", wt.LONG), ("t", wt.LONG), ("r", wt.LONG), ("b", wt.LONG)]
    wa = RECTS()
    user32.SystemParametersInfoW(0x0030, 0, ctypes.byref(wa), 0)  # SPI_GETWORKAREA
    if wa.r - wa.l < cw or wa.b - wa.t < ch:
        return False
    user32.ShowWindow(hwnd, 1)  # SW_NORMAL (leave maximized state)
    time.sleep(0.5)
    outer = RECTS()
    user32.AdjustWindowRect(ctypes.byref(outer), 0x00CF0000, False)
    ow, oh = cw + outer.r - outer.l, ch + outer.b - outer.t
    for _ in range(6):
        x = max(0, (wa.r - wa.l - ow) // 2)
        y = max(0, (wa.b - wa.t - oh) // 2)
        user32.SetWindowPos(hwnd, 0, x, y, ow, oh, 0x0004)
        time.sleep(0.8)
        w, h = client_rect(hwnd)
        if w <= 0:
            time.sleep(1.5)
            continue
        if abs(w - cw) <= 2 and abs(h - ch) <= 2:
            return True
        ow += cw - w
        oh += ch - h
    w, h = client_rect(hwnd)
    return abs(w - cw) <= 2 and abs(h - ch) <= 2


def done():
    pyvda = _pyvda()
    st = _load_state()
    # restore the user's own screen settings (effective on next manual launch)
    orig = st.get("screen_original")
    if orig:
        import winreg
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\GlycoProduction\EmoteLab", 0,
                            winreg.KEY_SET_VALUE) as k:
            for name, v in orig.items():
                winreg.SetValueEx(k, name, 0, winreg.REG_DWORD, v)
        st.pop("screen_original", None)
        _save_state(st)
    want = st.get("home_desktop_id")
    if want:
        for d in pyvda.get_virtual_desktops():
            if str(d.id) == want:
                d.go()
                print("switched back")
                return
    print("home desktop not found; staying put")


# ---------- input / capture ----------

def client_rect(hwnd):
    rc = wt.RECT()
    user32.GetClientRect(hwnd, ctypes.byref(rc))
    return rc.right, rc.bottom


def _client_to_screen(hwnd, x, y):
    pt = wt.POINT(x, y)
    user32.ClientToScreen(hwnd, ctypes.byref(pt))
    return pt.x, pt.y


def click(hwnd, x, y, right=False):
    sx, sy = _client_to_screen(hwnd, x, y)
    user32.SetCursorPos(sx, sy)
    time.sleep(0.06)
    down, up = (0x0008, 0x0010) if right else (0x0002, 0x0004)
    user32.mouse_event(down, 0, 0, 0, None)
    user32.mouse_event(up, 0, 0, 0, None)


def drag(hwnd, x1, y1, x2, y2, steps=12):
    sx1, sy1 = _client_to_screen(hwnd, x1, y1)
    sx2, sy2 = _client_to_screen(hwnd, x2, y2)
    user32.SetCursorPos(sx1, sy1)
    time.sleep(0.05)
    user32.mouse_event(0x0002, 0, 0, 0, None)
    for i in range(1, steps + 1):
        user32.SetCursorPos(int(sx1 + (sx2 - sx1) * i / steps), int(sy1 + (sy2 - sy1) * i / steps))
        time.sleep(0.01)
    user32.mouse_event(0x0004, 0, 0, 0, None)


def wheel(hwnd, x, y, delta):
    sx, sy = _client_to_screen(hwnd, x, y)
    user32.SetCursorPos(sx, sy)
    time.sleep(0.05)
    user32.mouse_event(0x0800, 0, 0, delta & 0xFFFFFFFF, None)


def capture(hwnd, path):
    w, h = client_rect(hwnd)
    if w <= 0 or h <= 0:
        raise SystemExit("window has no client area")
    from PIL import Image
    hdc = user32.GetDC(hwnd)
    mem = gdi32.CreateCompatibleDC(hdc)
    bmp = gdi32.CreateCompatibleBitmap(hdc, w, h)
    gdi32.SelectObject(mem, bmp)
    gdi32.BitBlt(mem, 0, 0, w, h, hdc, 0, 0, 0x00CC0020)
    user32.PrintWindow(hwnd, mem, PW_RENDERFULLCONTENT)
    bi = BITMAPINFOHEADER()
    bi.biSize = ctypes.sizeof(BITMAPINFOHEADER)
    bi.biWidth = w
    bi.biHeight = -h
    bi.biPlanes = 1
    bi.biBitCount = 32
    bi.biCompression = 0
    buf = ctypes.create_string_buffer(w * h * 4)
    gdi32.GetDIBits(mem, bmp, 0, h, buf, ctypes.byref(bi), 0)
    img = Image.frombuffer("RGBX", (w, h), buf.raw, "raw", "RGBX", 0, 1)
    img.convert("RGB").save(path)
    gdi32.DeleteObject(bmp)
    gdi32.DeleteDC(mem)
    user32.ReleaseDC(hwnd, hdc)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("launch")
    p = sub.add_parser("click"); p.add_argument("x", type=int); p.add_argument("y", type=int)
    p.add_argument("--shot"); p.add_argument("--wait", type=float, default=1.5)
    p = sub.add_parser("rclick"); p.add_argument("x", type=int); p.add_argument("y", type=int); p.add_argument("--shot")
    p = sub.add_parser("drag"); p.add_argument("x1", type=int); p.add_argument("y1", type=int)
    p.add_argument("x2", type=int); p.add_argument("y2", type=int)
    p = sub.add_parser("wheel"); p.add_argument("x", type=int); p.add_argument("y", type=int); p.add_argument("delta", type=int)
    p = sub.add_parser("shot"); p.add_argument("file")
    sub.add_parser("done")
    a = ap.parse_args()

    if a.cmd == "launch":
        launch()
        return
    if a.cmd == "done":
        done()
        return

    hwnd = game_window(timeout=3)
    if not hwnd:
        raise SystemExit("EmoteLab window not found; run `launch` first")
    _ensure_auto_active()
    ensure_window_usable(hwnd)
    user32.SetForegroundWindow(hwnd)
    time.sleep(0.3)
    if a.cmd == "shot":
        capture(hwnd, a.file)
        print(a.file)
        return
    if a.cmd == "click":
        click(hwnd, a.x, a.y)
    elif a.cmd == "rclick":
        click(hwnd, a.x, a.y, right=True)
    elif a.cmd == "drag":
        drag(hwnd, a.x1, a.y1, a.x2, a.y2)
    elif a.cmd == "wheel":
        wheel(hwnd, a.x, a.y, a.delta)
    time.sleep(getattr(a, "wait", 1.0) or 1.0)
    if getattr(a, "shot", None):
        capture(hwnd, a.shot)
        print(a.shot)
    else:
        print("ok")


if __name__ == "__main__":
    main()
