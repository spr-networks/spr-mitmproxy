# spr-mitmproxy
Example mitmproxy container for SPR PLUS

## Usage

### Prepare the plugin
from the SPR directory
```bash
cd plugins
git clone https://github.com/spr-networks/spr-mitmproxy
echo [\"plugins/spr-mitmproxy/docker-compose.yml\"] > ../configs/base/custom_compose_paths.json
cd spr-mitmproxy
docker-compose build
```

### Configure SPR
1. Add mitmproxy as a plugin
-  be sure its been added to `configs/base/custom_compose_paths.json` as above
- Enable it by toggling the slider
<img width="511" alt="Screen Shot 2023-11-14 at 8 20 38 PM" src="https://github.com/spr-networks/spr-mitmproxy/assets/37549748/dcc0f1ea-724a-4ed0-856a-56444ea2569f">

2. Add the mitmproxy0 network to the custom interface rules. You can verify your container's network address in the Container tab -> 
Under `Firewall-> Custom Interface Access` Add a new rule, make sure mitmproxy has 'wan' at least to access the internet. Without this, the container network has no internet access. 

<img width="510" alt="Screen Shot 2023-11-14 at 8 22 34 PM" src="https://github.com/spr-networks/spr-mitmproxy/assets/37549748/71d4c8c9-3812-452f-86df-a7d19fb703a6">

3. Create a forwarding rule to the container web interface :8081. Pick an arbitrary IP in the subnet -- although not the same one as the container as that confuses dnat.
<img width="518" alt="Screen Shot 2023-11-14 at 8 54 12 PM" src="https://github.com/spr-networks/spr-mitmproxy/assets/37549748/ff1424c6-b6ad-48d4-8ffe-03186f61abc6">

4. Create a site forward rule with PFW for traffic to intercept
<img width="504" alt="Screen Shot 2023-11-14 at 8 56 34 PM" src="https://github.com/spr-networks/spr-mitmproxy/assets/37549748/4d5e49b4-5860-4aad-ac17-510589ee31c5">

### Using mitmproxy 
Then make a curl request from any of the LAN devices, and it should populate on the mitmweb host. This was the :8081 host that was earlier defined
<img width="1276" alt="Screen Shot 2023-11-14 at 9 20 56 PM" src="https://github.com/spr-networks/spr-mitmproxy/assets/37549748/a70a9f7e-91b9-4798-926b-2cb625f71e78">
