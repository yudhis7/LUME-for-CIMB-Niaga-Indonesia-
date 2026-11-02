//go:build darwin

package main

import (
	"fmt"
	"os"
	"os/exec"
	"strings"

	webview "github.com/abemedia/go-webview"
	"github.com/ebitengine/purego/objc"
)

// libwebview.dylib ships inside the app bundle (Contents/Frameworks), where
// go-webview looks for it next to Contents/MacOS.
func prepareNative() error { return nil }

// afterCreate adds the standard macOS menu bar once the app has launched:
// the webview library creates none, and without an Edit menu Cmd+C / Cmd+V
// do not reach text fields in WKWebView.
func afterCreate(w webview.WebView) {
	w.Dispatch(func() {
		defer func() { _ = recover() }() // a missing menu must never take the app down
		setupMenu()
	})
}

var selCache = map[string]objc.SEL{}

func sel(name string) objc.SEL {
	if s, ok := selCache[name]; ok {
		return s
	}
	s := objc.RegisterName(name)
	selCache[name] = s
	return s
}

func class(name string) objc.ID { return objc.ID(objc.GetClass(name)) }

func nsString(s string) objc.ID {
	return class("NSString").Send(sel("stringWithUTF8String:"), s)
}

func newMenu(title string) objc.ID {
	return class("NSMenu").Send(sel("alloc")).Send(sel("initWithTitle:"), nsString(title))
}

// newItem builds an NSMenuItem; an empty action leaves it without one.
// Actions target the first responder (nil target), as in a standard Xcode app.
func newItem(title, action, key string) objc.ID {
	var act objc.SEL
	if action != "" {
		act = sel(action)
	}
	return class("NSMenuItem").Send(sel("alloc")).Send(sel("initWithTitle:action:keyEquivalent:"), nsString(title), act, nsString(key))
}

func addItem(menu, item objc.ID) { menu.Send(sel("addItem:"), item) }

func separator() objc.ID { return class("NSMenuItem").Send(sel("separatorItem")) }

func submenu(parent objc.ID, title string, items ...objc.ID) objc.ID {
	holder := newItem(title, "", "")
	m := newMenu(title)
	for _, it := range items {
		addItem(m, it)
	}
	holder.Send(sel("setSubmenu:"), m)
	addItem(parent, holder)
	return m
}

func setupMenu() {
	app := class("NSApplication").Send(sel("sharedApplication"))
	if app == 0 {
		return
	}
	bar := newMenu("")

	// Application menu (macOS shows the app name as its title).
	submenu(bar, appName,
		newItem("About "+appName, "orderFrontStandardAboutPanel:", ""),
		separator(),
		newItem("Hide "+appName, "hide:", "h"),
		newItem("Show All", "unhideAllApplications:", ""),
		separator(),
		newItem("Quit "+appName, "terminate:", "q"),
	)
	// Edit menu: routes copy/paste/undo shortcuts to the web view.
	submenu(bar, "Edit",
		newItem("Undo", "undo:", "z"),
		newItem("Redo", "redo:", "Z"),
		separator(),
		newItem("Cut", "cut:", "x"),
		newItem("Copy", "copy:", "c"),
		newItem("Paste", "paste:", "v"),
		newItem("Select All", "selectAll:", "a"),
	)
	// View menu: reload the console.
	submenu(bar, "View",
		newItem("Reload", "reload:", "r"),
		newItem("Enter Full Screen", "toggleFullScreen:", "f"),
	)
	// Window menu.
	win := submenu(bar, "Window",
		newItem("Minimize", "performMiniaturize:", "m"),
		newItem("Zoom", "performZoom:", ""),
		separator(),
		newItem("Close Window", "performClose:", "w"),
	)
	app.Send(sel("setMainMenu:"), bar)
	app.Send(sel("setWindowsMenu:"), win)
}

func fatal(msg string) {
	fmt.Fprintln(os.Stderr, msg)
	esc := strings.NewReplacer(`\`, `\\`, `"`, `\"`).Replace(msg)
	_ = exec.Command("/usr/bin/osascript", "-e", `display alert "`+appName+`" message "`+esc+`" as critical`).Run()
}

func fatalNoWebView() {
	fatal("Lume could not open its window. It needs macOS 14 Sonoma or later.")
}
