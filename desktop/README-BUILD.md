# Lume for CIMB Niaga · desktop build

Native shell around the Lume console (`web/index.html`), written in Go with no cgo.
Windows uses WebView2 (Edge); macOS uses WKWebView. The console is served from
`127.0.0.1:47616` so its saved data persists between launches.

- `main.go`: embedded web server and window
- `native_windows.go`: unpacks `webview.dll` and the Visual C++ runtime next to the app data, sets the icon, WebView2 check
- `native_darwin.go`: standard macOS menu bar (App, Edit, View, Window)
- `third_party/`: go-webview (MIT) and purego (Apache-2.0) with their prebuilt webview libraries
- `build.sh`: builds both apps (needs Go 1.22+, Python 3, `rsrc` for Windows resources, `rcodesign` or `codesign` for macOS)

To ship without security warnings, sign the Windows `.exe` with an Authenticode
certificate (`signtool sign /fd sha256 /tr <timestamp-url> ...`) and sign plus
notarize the macOS app with a Developer ID (steps are in `build.sh`).
