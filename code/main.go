package main

import (
	"fmt"
	"net"
	"net/http"
	"os"
	"path/filepath"
)

import (
	"github.com/gorilla/mux"
)

var UNIX_PLUGIN_LISTENER = "/state/plugins/spr-mitmproxy/socket"

// set up SPA handler. From gorilla mux's documentation
type spaHandler struct {
	staticPath string
	indexPath  string
}

func (h spaHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path, err := filepath.Abs(r.URL.Path)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	path = filepath.Join(h.staticPath, path)
	_, err = os.Stat(path)
	if os.IsNotExist(err) {
		http.ServeFile(w, r, filepath.Join(h.staticPath, h.indexPath))
		return
	} else if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	http.FileServer(http.Dir(h.staticPath)).ServeHTTP(w, r)
}

func webpass(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "/tmp/webpass")
}

func logRequest(handler http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Printf("%s %s %s\n", r.RemoteAddr, r.Method, r.URL)
		handler.ServeHTTP(w, r)
	})
}

func main() {
	unix_plugin_router := mux.NewRouter().StrictSlash(true)

	// map /ui to /ui on fs
	spa := spaHandler{staticPath: "/ui", indexPath: "index.html"}
	unix_plugin_router.PathPrefix("/").Handler(spa)
	unix_plugin_router.HandleFunc("/webpass", webpass).Methods("GET")

	//tbd dynamic webpass.

	os.Remove(UNIX_PLUGIN_LISTENER)
	unixPluginListener, err := net.Listen("unix", UNIX_PLUGIN_LISTENER)
	if err != nil {
		panic(err)
	}

	pluginServer := http.Server{Handler: logRequest(unix_plugin_router)}

	pluginServer.Serve(unixPluginListener)
}
