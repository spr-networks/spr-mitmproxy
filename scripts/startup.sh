#!/bin/bash

set -euo pipefail

MITMPROXY_MTU="${MITMPROXY_MTU:-1400}"
if [[ ! "${MITMPROXY_MTU}" =~ ^[0-9]+$ ]] || (( MITMPROXY_MTU < 576 )); then
        echo "Invalid MITMPROXY_MTU: ${MITMPROXY_MTU}" >&2
        exit 1
fi

for iface_path in /sys/class/net/*; do
	iface="${iface_path##*/}"
	operstate=""
	if [[ -f "${iface_path}/operstate" ]]; then
		read -r operstate < "${iface_path}/operstate"
	fi
	if [[ "${iface}" != "lo" && "${operstate}" == "up" && -f "${iface_path}/mtu" ]]; then
		ip link set dev "${iface}" mtu "${MITMPROXY_MTU}"
		echo "Configured ${iface} MTU ${MITMPROXY_MTU}"
	fi
done

nft -f - << EOF
table inet mitmproxy {
        chain prerouting {
                type nat hook prerouting priority dstnat; policy accept;
                tcp dport { 80, 443 } redirect to :9999
        }

        # This container is a transparent-proxy endpoint, never a router. If a
        # packet cannot be redirected (for example an invalid late TCP packet),
        # dropping it here prevents it from looping back through the SPR host.
        chain forward {
                type filter hook forward priority filter; policy drop;
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
