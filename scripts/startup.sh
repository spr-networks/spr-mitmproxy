#!/bin/bash

# make sure forwarding is on
sysctl -w net.ipv4.ip_forward=1
# and so is dnat
sysctl -w net.ipv4.conf.all.route_localnet=1

nft -f - << EOF
table inet nat {
        chain prerouting {
                type nat hook prerouting priority filter; policy accept;
                tcp dport { 80, 443 } dnat ip to 127.0.0.1:9999
        }
}
EOF

mitmweb -p 9999 -m transparent --web-host 0.0.0.0
