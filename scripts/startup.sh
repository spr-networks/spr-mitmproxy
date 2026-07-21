#!/bin/bash

set -euo pipefail

MITMPROXY_MTU="${MITMPROXY_MTU:-1400}"
if [[ ! "${MITMPROXY_MTU}" =~ ^[0-9]+$ ]] || (( MITMPROXY_MTU < 576 )); then
        echo "Invalid MITMPROXY_MTU: ${MITMPROXY_MTU}" >&2
        exit 1
fi

MITMPROXY_INTERFACE="${MITMPROXY_INTERFACE:-eth0}"
MITMPROXY_EXPECTED_MAC="${MITMPROXY_EXPECTED_MAC:-}"
iface_path="/sys/class/net/${MITMPROXY_INTERFACE}"

if [[ ! "${MITMPROXY_INTERFACE}" =~ ^[a-zA-Z0-9_.:-]+$ ]] || [[ ! -d "${iface_path}" ]]; then
	echo "Invalid mitmproxy interface: ${MITMPROXY_INTERFACE}" >&2
	exit 1
fi

if [[ -n "${MITMPROXY_EXPECTED_MAC}" ]]; then
	read -r actual_mac < "${iface_path}/address"
	if [[ "${actual_mac,,}" != "${MITMPROXY_EXPECTED_MAC,,}" ]]; then
		echo "Refusing transparent mode on ${MITMPROXY_INTERFACE}: expected MAC ${MITMPROXY_EXPECTED_MAC}, found ${actual_mac}" >&2
		exit 1
	fi
fi

ip link set dev "${MITMPROXY_INTERFACE}" mtu "${MITMPROXY_MTU}"
echo "Configured ${MITMPROXY_INTERFACE} MTU ${MITMPROXY_MTU}"

nft -f - << EOF
table inet mitmproxy {
        chain prerouting {
                type nat hook prerouting priority dstnat; policy accept;
                iifname "${MITMPROXY_INTERFACE}" tcp dport { 80, 443 } redirect to :9999
        }

        # This container is a transparent-proxy endpoint, never a router. If a
        # packet cannot be redirected (for example an invalid late TCP packet),
        # dropping it here prevents it from looping back through the SPR host.
        chain forward {
                type filter hook forward priority filter; policy accept;
                iifname "${MITMPROXY_INTERFACE}" drop
        }
}
EOF

echo -n $(openssl rand -hex 32) > /tmp/webpass
WEBPASS=$(cat /tmp/webpass)
# Host a transparent proxy for PFW
mitmweb -p 9999 -m transparent --set web_password=$WEBPASS --web-host 0.0.0.0 --set web_port=8081 &

# Host a regular proxy as well on port 8082
mitmweb -p 9998 --set web_password=$WEBPASS --web-host 0.0.0.0  --set web_port=8082 &

/main
