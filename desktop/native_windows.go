//go:build windows

package main

import (
	_ "embed"
	"os"
	"path/filepath"
	"syscall"
	"unsafe"

	webview "github.com/abemedia/go-webview"
)

// Native webview library plus the Visual C++ runtime it links against,
// deployed app-locally so the app runs on PCs without the VC++ redistributable.
var (
	//go:embed native/windows_amd64/webview.dll
	dllWebview []byte
	//go:embed native/windows_amd64/msvcp140.dll
	dllMsvcp140 []byte
	//go:embed native/windows_amd64/vcruntime140.dll
	dllVcruntime140 []byte
	//go:embed native/windows_amd64/vcruntime140_1.dll
	dllVcruntime140_1 []byte
	//go:embed assets/icon.ico
	iconICO []byte
)

const runtimeDirName = "runtime-webview-0.12.0-vc14.51"

var (
	kernel32             = syscall.NewLazyDLL("kernel32.dll")
	user32               = syscall.NewLazyDLL("user32.dll")
	shell32              = syscall.NewLazyDLL("shell32.dll")
	procSetDllDirectoryW = kernel32.NewProc("SetDllDirectoryW")
	procMessageBoxW      = user32.NewProc("MessageBoxW")
	procLoadImageW       = user32.NewProc("LoadImageW")
	procSendMessageW     = user32.NewProc("SendMessageW")
	procShellExecuteW    = shell32.NewProc("ShellExecuteW")
	appDataDir           string
)

func prepareNative() error {
	base := os.Getenv("LOCALAPPDATA")
	if base == "" {
		base = os.TempDir()
	}
	appDataDir = filepath.Join(base, appName)
	dir := filepath.Join(appDataDir, runtimeDirName)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	files := map[string][]byte{
		"webview.dll":        dllWebview,
		"msvcp140.dll":       dllMsvcp140,
		"vcruntime140.dll":   dllVcruntime140,
		"vcruntime140_1.dll": dllVcruntime140_1,
		"lume.ico":           iconICO,
	}
	for name, data := range files {
		if err := writeIfChanged(filepath.Join(dir, name), data); err != nil {
			return err
		}
	}
	p, err := syscall.UTF16PtrFromString(dir)
	if err != nil {
		return err
	}
	_, _, _ = procSetDllDirectoryW.Call(uintptr(unsafe.Pointer(p)))
	return os.Setenv("PATH", dir+";"+os.Getenv("PATH"))
}

func writeIfChanged(path string, data []byte) error {
	if st, err := os.Stat(path); err == nil && st.Size() == int64(len(data)) {
		return nil
	}
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		return err
	}
	_ = os.Remove(path)
	return os.Rename(tmp, path)
}

const (
	wmSetIcon       = 0x0080
	iconSmall       = 0
	iconBig         = 1
	imageIcon       = 1
	lrLoadFromFile  = 0x0010
	mbOK            = 0x0000
	mbYesNo         = 0x0004
	mbIconError     = 0x0010
	mbIconWarning   = 0x0030
	idYes           = 6
	swShowNormal    = 1
	webView2Install = "https://go.microsoft.com/fwlink/p/?LinkId=2124703"
)

// afterCreate sets the window and taskbar icon from the app icon.
func afterCreate(w webview.WebView) {
	hwnd := uintptr(w.Window())
	if hwnd == 0 {
		return
	}
	icoPath, err := syscall.UTF16PtrFromString(filepath.Join(appDataDir, runtimeDirName, "lume.ico"))
	if err != nil {
		return
	}
	for _, sz := range []struct{ which, px uintptr }{{iconBig, 32}, {iconSmall, 16}} {
		h, _, _ := procLoadImageW.Call(0, uintptr(unsafe.Pointer(icoPath)), imageIcon, sz.px, sz.px, lrLoadFromFile)
		if h != 0 {
			_, _, _ = procSendMessageW.Call(hwnd, wmSetIcon, sz.which, h)
		}
	}
}

func messageBox(text string, flags uintptr) uintptr {
	t, _ := syscall.UTF16PtrFromString(text)
	c, _ := syscall.UTF16PtrFromString(appName)
	r, _, _ := procMessageBoxW.Call(0, uintptr(unsafe.Pointer(t)), uintptr(unsafe.Pointer(c)), flags)
	return r
}

func fatal(msg string) { messageBox(msg, mbOK|mbIconError) }

func fatalNoWebView() {
	r := messageBox("Lume needs the Microsoft Edge WebView2 Runtime, which is missing on this PC.\n\n"+
		"It is free from Microsoft and is already installed on most Windows 10 and 11 computers.\n\n"+
		"Open the download page now?", mbYesNo|mbIconWarning)
	if r == idYes {
		verb, _ := syscall.UTF16PtrFromString("open")
		url, _ := syscall.UTF16PtrFromString(webView2Install)
		_, _, _ = procShellExecuteW.Call(0, uintptr(unsafe.Pointer(verb)), uintptr(unsafe.Pointer(url)), 0, 0, swShowNormal)
	}
}
