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
the HTTP and HTTPS PFW rules for that tag. The `mitmweb` access group is not
used as the interception selector.

<img width="1444" alt="image" src="https://github.com/user-attachments/assets/ade223fa-e124-4128-94d5-7bfd5d83f8f2">

- Optionally visit http://mitm.it and install the mitmproxy certificate to the trust store


Navigate to `:8081` on the container for the transparent proxy interface. The
device opening the interface must be in the `mitmweb` access group; this is
independent of the `mitmproxy` tag, which alone opts a device into transparent
interception.

<img width="1450" alt="image" src="https://github.com/user-attachments/assets/79c6d642-f63b-4e5a-99b1-0935dd4e3ac7">
