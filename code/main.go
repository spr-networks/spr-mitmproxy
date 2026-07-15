package main

import (
	"encoding/json"
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

type networkStatus struct {
	Interface string
	MTU       int
}

func containerNetworkStatus() networkStatus {
	interfaces, err := net.Interfaces()
	if err != nil {
		return networkStatus{}
	}

	for _, iface := range interfaces {
		if iface.Flags&net.FlagLoopback == 0 && iface.Flags&net.FlagUp != 0 {
			return networkStatus{Interface: iface.Name, MTU: iface.MTU}
		}
	}

	return networkStatus{}
}

func networkInfo(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(containerNetworkStatus())
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
	unix_plugin_router.HandleFunc("/webpass", webpass).Methods("GET")
	unix_plugin_router.HandleFunc("/network", networkInfo).Methods("GET")
	unix_plugin_router.HandleFunc("/topology", handleTopology).Methods("GET")
	unix_plugin_router.PathPrefix("/").Handler(spa)

	//tbd dynamic webpass.

	os.Remove(UNIX_PLUGIN_LISTENER)
	unixPluginListener, err := net.Listen("unix", UNIX_PLUGIN_LISTENER)
	if err != nil {
		panic(err)
	}

	pluginServer := http.Server{Handler: logRequest(unix_plugin_router)}

	pluginServer.Serve(unixPluginListener)
}
