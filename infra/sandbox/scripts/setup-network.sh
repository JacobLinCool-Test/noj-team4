#!/usr/bin/env bash
# Setup Docker network for sandbox with firewall rules
# Run once during system initialization

set -euo pipefail

NETWORK_NAME="${NOJ_SANDBOX_NETWORK:-noj-sandbox-net}"
SUBNET="${NOJ_SANDBOX_SUBNET:-172.30.0.0/16}"

# Check if network already exists
if docker network inspect "${NETWORK_NAME}" >/dev/null 2>&1; then
  echo "Network ${NETWORK_NAME} already exists"
  exit 0
fi

# Create isolated bridge network
docker network create \
  --driver bridge \
  --subnet "${SUBNET}" \
  --opt com.docker.network.bridge.enable_ip_masquerade=true \
  --opt com.docker.network.bridge.enable_icc=false \
  --opt com.docker.network.bridge.name=noj-sandbox-br0 \
  "${NETWORK_NAME}"

echo "Created network ${NETWORK_NAME} with subnet ${SUBNET}"

# Get bridge interface name
BRIDGE_IF=$(docker network inspect "${NETWORK_NAME}" -f '{{range .IPAM.Config}}{{.Gateway}}{{end}}' | head -1 | xargs -I {} ip route get {} | grep -oP 'dev \K\S+')

if [[ -n "${BRIDGE_IF}" ]]; then
  echo "Bridge interface: ${BRIDGE_IF}"

  # Default: drop all outgoing traffic from sandbox containers
  # Allow only DNS and explicitly allowed destinations
  iptables -I DOCKER-USER -i "${BRIDGE_IF}" -j DROP 2>/dev/null || true

  # Allow DNS (UDP 53)
  iptables -I DOCKER-USER -i "${BRIDGE_IF}" -p udp --dport 53 -j ACCEPT 2>/dev/null || true

  # Allow established/related connections
  iptables -I DOCKER-USER -i "${BRIDGE_IF}" -m state --state ESTABLISHED,RELATED -j ACCEPT 2>/dev/null || true

  echo "Default firewall rules applied"
fi

echo "Network setup complete"
