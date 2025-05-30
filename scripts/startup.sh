#!/bin/bash

nft -f - << EOF
table inet nat {
        chain prerouting {
                type nat hook prerouting priority filter; policy accept;
                tcp dport { 80, 443 } dnat ip to 127.0.0.1:9999
                udp dport { 443 } dnat ip to 127.0.0.1:9999
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
