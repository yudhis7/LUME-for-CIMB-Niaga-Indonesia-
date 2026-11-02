//go:build !windows && !darwin

package main

import (
	"fmt"
	"os"

	webview "github.com/abemedia/go-webview"
)

// Linux builds are only used for development checks.
func prepareNative() error          { return nil }
func afterCreate(w webview.WebView) {}
func fatal(msg string)              { fmt.Fprintln(os.Stderr, msg) }
func fatalNoWebView()               { fatal("webview could not be created (is WebKitGTK installed?)") }
