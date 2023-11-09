FROM ubuntu:23.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends mitmproxy curl nftables iproute2 tcpdump && rm -rf /var/lib/apt/lists/*
COPY scripts /scripts
ENTRYPOINT ["/scripts/startup.sh"]
