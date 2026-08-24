package main

import "testing"

func TestPluginSocketPath(t *testing.T) {
	t.Setenv("SPR_KRUN_PLUGIN_SOCKET", "")
	if got := pluginSocketPath(); got != UNIX_PLUGIN_LISTENER {
		t.Fatalf("default socket = %q, want %q", got, UNIX_PLUGIN_LISTENER)
	}
	t.Setenv("SPR_KRUN_PLUGIN_SOCKET", "/run/spr-krun-plugin/test.sock")
	if got := pluginSocketPath(); got != "/run/spr-krun-plugin/test.sock" {
		t.Fatalf("KVM socket = %q", got)
	}
}
