# spr-mitmproxy
Mitmproxy extension for SPR by [www.supernetworks.org](https://www.supernetworks.org)

## Usage

### Install the plugin from the UI

Copy this repository [https://github.com/spr-networks/spr-mitmproxy](https://github.com/spr-networks/spr-mitmproxy)

<img width="1433" alt="image" src="https://github.com/user-attachments/assets/6194ccd6-0ec2-44f7-b2df-92fe531ba9e6">
<img width="1256" alt="image" src="https://github.com/user-attachments/assets/c12c5909-cfd0-4f02-8e5d-a232dac6fb24">

### Configure the Plugin
<img width="1485" height="1048" alt="image" src="https://github.com/user-attachments/assets/bb4fb2a1-9b46-4c8b-a00a-90ed613a6e8d" />


### Grant access to the proxy

Add devices that should reach the proxy or its administration interface to the
`mitmweb` group. Group membership alone does not transparently intercept the
device.

<img width="1262" alt="image" src="https://github.com/user-attachments/assets/0f913482-911a-4613-aab6-d5993470914b">

### Using mitmproxy with the web proxy

Configure your device by joining it to the `mitmweb` group and change your
device setting to use the HTTP proxy at `:9998`.

- Optionally visit http://mitm.it and install the mitmproxy certificate to the trust store

### PLUS users: mitmproxy with transparent forwarding

With PLUS's PFW extension, add the `mitmproxy` tag only to devices that should
be transparently intercepted. The plugin's Transparent forwarding card creates
HTTP and HTTPS policy-routing rules for that tag. PFW preserves the original
destination while routing the traffic through the mitmproxy container; the
container performs the local redirect to its transparent listener. The
`mitmweb` access group is not used as the interception selector.

Mitmproxy transparent mode is TCP-only. The managed setup also blocks UDP port
443 for tagged devices so browsers fall back from QUIC/HTTP/3 to intercepted
HTTPS over TCP. DNS continues to use the device's normal SPR DNS path.

The container terminates policy-routed traffic locally and is not an IP
forwarder. Packets that cannot be redirected to the transparent listener are
dropped in the container so they cannot loop back through the SPR host.
The plugin UI also reports a PFW conflict if any enabled forwarding rule sends
ports other than TCP 80/443 to `mitmweb0`.

The dedicated Docker bridge and the container interface use MTU 1400. This
keeps both sides of the transparent TCP proxy below common VPN/tunnel path MTUs
and avoids black-holed TLS records when path-MTU discovery is unavailable.

<img width="1444" alt="image" src="https://github.com/user-attachments/assets/ade223fa-e124-4128-94d5-7bfd5d83f8f2">

- Optionally visit http://mitm.it and install the mitmproxy certificate to the trust store


Navigate to `:8081` on the container for the transparent proxy interface. The
device opening the interface must be in the `mitmweb` access group; this is
independent of the `mitmproxy` tag, which alone opts a device into transparent
interception.

<img width="1450" alt="image" src="https://github.com/user-attachments/assets/79c6d642-f63b-4e5a-99b1-0935dd4e3ac7">
