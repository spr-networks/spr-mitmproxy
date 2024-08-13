# spr-mitmproxy
Mitmproxy extension for SPR by [www.supernetworks.org](www.supernetworks.org)

## Usage

### Install the plugin from the UI

Copy this repository [https://github.com/spr-networks/spr-mitmproxy](https://github.com/spr-networks/spr-mitmproxy)

<img width="1433" alt="image" src="https://github.com/user-attachments/assets/6194ccd6-0ec2-44f7-b2df-92fe531ba9e6">
<img width="1256" alt="image" src="https://github.com/user-attachments/assets/c12c5909-cfd0-4f02-8e5d-a232dac6fb24">

### Configure the Plugin

<img width="1068" alt="image" src="https://github.com/user-attachments/assets/4c31342f-3ce3-404b-ad4c-546e422d07b2">

### Add your device to the mitmweb group 

<img width="1262" alt="image" src="https://github.com/user-attachments/assets/0f913482-911a-4613-aab6-d5993470914b">

### Using mitmproxy with the web proxy

Configure your device by joining it to the mitmweb group and change your device setting to use the HTTP proxy at :9998.

- Optionally visit http://mitm.it and install the mitmproxy certificate to the trust store

### PLUS users: mitmproxy with transparent forwarding

With PLUS's PFW extension, you can forward to the container without having the device join the group

<img width="1444" alt="image" src="https://github.com/user-attachments/assets/ade223fa-e124-4128-94d5-7bfd5d83f8f2">

- Optionally visit http://mitm.it and install the mitmproxy certificate to the trust store


Then navigate to :8081  on the container to gain access. Note: the device using the interface should be part of the 'mitmweb' group on SPR.

<img width="1450" alt="image" src="https://github.com/user-attachments/assets/79c6d642-f63b-4e5a-99b1-0935dd4e3ac7">
