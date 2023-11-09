FROM ubuntu
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y mitmproxy curl nftables iproute2 tcpdump && rm -rf /var/lib/apt/lists/*
ENTRYPOINT ["/scripts/startup.sh"]
