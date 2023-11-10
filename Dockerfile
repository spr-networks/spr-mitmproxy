FROM mitmproxy/mitmproxy
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends curl nftables iproute2 procps && rm -rf /var/lib/apt/lists/*
COPY scripts /scripts
ENTRYPOINT ["/scripts/startup.sh"]
