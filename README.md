# spr-mitmproxy
Example mitmproxy container for SPR PLUS

## Usage

### Prepare the plugin
from the SPR directory
```bash
cd plugins
git clone https://github.com/spr-networks/spr-mitmproxy
echo ["plugins/mitmproxy/docker-compose.yml"] > ../configs/base/custom_compose_paths.json
cd mitmproxy
docker-compose build
docker-compose up -d
```

### Configure SPR

1) Add the mitmproxy network to the custom interface rules -> 

2) Create PFW dnat to the container web interface :8081 

3) Create policy routing rules with PFW for traffic to intercept


