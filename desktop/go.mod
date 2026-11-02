module lume-desktop

go 1.22

require (
	github.com/abemedia/go-webview v0.0.0-00010101000000-000000000000
	github.com/ebitengine/purego v0.8.2
)

replace github.com/abemedia/go-webview => ./third_party/go-webview

replace github.com/ebitengine/purego => ./third_party/purego
