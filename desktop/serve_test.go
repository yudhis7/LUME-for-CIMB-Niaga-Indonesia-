package main

import (
	"io"
	"net/http"
	"os"
	"testing"
	"time"
)

func TestServe(t *testing.T) {
	addr, err := serve()
	if err != nil {
		t.Fatal(err)
	}
	res, err := http.Get("http://" + addr + "/")
	if err != nil {
		t.Fatal(err)
	}
	b, _ := io.ReadAll(res.Body)
	if res.StatusCode != 200 || len(b) != len(indexHTML) || res.Header.Get("Content-Type") != "text/html; charset=utf-8" {
		t.Fatalf("bad index: %d %d %s", res.StatusCode, len(b), res.Header.Get("Content-Type"))
	}
	if r2, _ := http.Get("http://" + addr + "/nope"); r2.StatusCode != 404 {
		t.Fatalf("expected 404, got %d", r2.StatusCode)
	}
	t.Logf("served %d bytes at %s", len(b), addr)
	if os.Getenv("LUME_HOLD") != "" {
		time.Sleep(25 * time.Second)
	}
}
