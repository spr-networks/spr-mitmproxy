# spr-mitmproxy
Example mitmproxy container for SPR PLUS

## Usage

from the SPR directory
```bash
cd plugins
git clone https://github.com/spr-networks/spr-mitmproxy
echo ["plugins/mitmproxy/docker-compose.yml"] > ../configs/base/custom_compose_paths.json
cd mitmproxy
docker-compose build
docker-compose up -d
```
