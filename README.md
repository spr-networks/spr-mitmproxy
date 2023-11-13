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

1) Add the mitmproxy network to the custom interface rules. You can verify your conatiner address in the Container tab -> 
<img width="498" alt="Screen Shot 2023-11-13 at 9 23 58 AM" src="https://github.com/spr-networks/spr-mitmproxy/assets/37549748/f1c5441f-17c4-4930-a518-7d9a2d192cb0">

2) Create PFW dnat to the container web interface :8081 
<img width="533" alt="Screen Shot 2023-11-13 at 9 24 41 AM" src="https://github.com/spr-networks/spr-mitmproxy/assets/37549748/683989c5-09de-4e48-97f2-f7ca04cfa187">

3) Create policy routing rules with PFW for traffic to intercept
<img width="493" alt="Screen Shot 2023-11-13 at 9 26 06 AM" src="https://github.com/spr-networks/spr-mitmproxy/assets/37549748/c88ee353-bfe3-44b8-93fc-9040caa9244a">


