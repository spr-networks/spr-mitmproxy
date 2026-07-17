package main

import (
	"encoding/json"
	"net"
	"net/http"
)

// mitmBridgeInterface is the host-side docker bridge name (see
// docker-compose.yml driver_opts com.docker.network.bridge.name).
var mitmBridgeInterface = "kmitmproxy0"

// TopoNode / TopoEdge / Topology mirror the shapes SPR expects from plugin
// topology endpoints (same contract as spr-tailscale). The SPR host merges
// the plugin graph into the router topology at the "root" anchor node.
type TopoNode struct {
	ID       string
	Kind     string
	Name     string
	IP       string `json:",omitempty"`
	ConnType string `json:",omitempty"`
	Online   bool
}

type TopoEdge struct {
	From  string
	To    string
	Layer string
	Kind  string
}

type TopoSink struct {
	ID     string
	Name   string
	Iface  string
	IP     string `json:",omitempty"`
	Online bool
}

type Topology struct {
	Nodes []TopoNode
	Edges []TopoEdge
	Sinks []TopoSink `json:",omitempty"`
}

// containerIPv4 returns the container's routeable IPv4 on the mitm bridge:
// the "via" address for host routes that egress through this plugin. The
// container gets a DHCP-assigned address from the bridge subnet, so this is
// resolved at request time rather than fixed.
func containerIPv4() string {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return ""
	}
	for _, addr := range addrs {
		ipnet, ok := addr.(*net.IPNet)
		if !ok || ipnet.IP.IsLoopback() {
			continue
		}
		if ip4 := ipnet.IP.To4(); ip4 != nil {
			return ip4.String()
		}
	}
	return ""
}

// GET /topology — advertises the mitm interception container as a routeable
// sink. Device traffic policy-routed here hits the transparent-proxy DNAT
// (startup.sh) and is intercepted.
func handleTopology(w http.ResponseWriter, r *http.Request) {
	ip := containerIPv4()
	topo := Topology{
		Nodes: []TopoNode{{ID: "root", ConnType: "wired", Online: true}},
		Edges: []TopoEdge{},
		Sinks: []TopoSink{{
			ID:     "mitmproxy",
			Name:   "mitmproxy intercept",
			Iface:  mitmBridgeInterface,
			IP:     ip,
			Online: ip != "",
		}},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(topo)
}
