#!/bin/bash

nft -f - << EOF
table inet nat {
        chain prerouting {
                type nat hook prerouting priority filter; policy accept;
                tcp dport { 80, 443 } dnat ip to 127.0.0.1:9999
        }
}
EOF

mitmweb -p 9999 -m transparent --web-host 0.0.0.0
