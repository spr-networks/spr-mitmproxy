#!/bin/bash

nft -f - << EOF
table inet nat {
        chain prerouting {
                type nat hook prerouting priority filter; policy accept;
                tcp dport { 80, 443 } dnat ip to 127.0.0.1:9999
        }
}
EOF

socat UNIX-LISTEN:/state/plugins/spr-mitmproxy/socket,reuseaddr,fork TCP:localhost:8081 &
mitmweb -p 9999 -m transparent --web-host 127.0.0.1
