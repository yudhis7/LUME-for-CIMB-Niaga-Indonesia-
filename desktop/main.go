// Lume for CIMB Niaga: desktop shell for the Lume console.
// The web app is embedded and served from 127.0.0.1 on a fixed port so that
// the browser storage (demo data, roles, drafts) survives between launches.
package main

import (
	_ "embed"
	"fmt"
	"net"
	"net/http"
	"runtime"
	"strings"
	"time"

	webview "github.com/abemedia/go-webview"
)

const (
	appName    = "Lume for CIMB Niaga"
	appVersion = "1.1.0"
	fixedPort  = "47616"
)

//go:embed web/index.html
var indexHTML []byte

func init() {
	// Cocoa and Win32 UI must run on the process's main thread.
	runtime.LockOSThread()
}

func main() {
	defer func() {
		if r := recover(); r != nil {
			msg := fmt.Sprint(r)
			if strings.Contains(msg, "failed to create window") {
				fatalNoWebView()
				return
			}
			fatal("Lume could not start.\n\n" + msg)
		}
	}()

	if err := prepareNative(); err != nil {
		fatal("Lume could not prepare its runtime files.\n\n" + err.Error())
		return
	}
	addr, err := serve()
	if err != nil {
		fatal("Lume could not start its local server.\n\n" + err.Error())
		return
	}

	w := webview.New(false)
	defer w.Destroy()
	w.SetTitle(appName)
	w.SetSize(1000, 640, webview.HintMin)
	w.SetSize(1320, 840, webview.HintNone)
	afterCreate(w)
	w.Navigate("http://" + addr + "/#command")
	w.Run()
}

// serve starts the embedded web server on the loopback interface only.
func serve() (string, error) {
	ln, err := net.Listen("tcp", "127.0.0.1:"+fixedPort)
	if err != nil {
		// Port busy (for example a second copy of the app is open): use any free port.
		ln, err = net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			return "", err
		}
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(rw http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" && r.URL.Path != "/index.html" {
			http.NotFound(rw, r)
			return
		}
		h := rw.Header()
		h.Set("Content-Type", "text/html; charset=utf-8")
		h.Set("Cache-Control", "no-store")
		h.Set("X-Content-Type-Options", "nosniff")
		_, _ = rw.Write(indexHTML)
	})
	mux.HandleFunc("/__lume", func(rw http.ResponseWriter, r *http.Request) {
		_, _ = rw.Write([]byte(appName + " " + appVersion))
	})
	srv := &http.Server{Handler: mux, ReadHeaderTimeout: 10 * time.Second}
	go func() { _ = srv.Serve(ln) }()
	return ln.Addr().String(), nil
}
