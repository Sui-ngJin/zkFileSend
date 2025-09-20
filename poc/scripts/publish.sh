#!/usr/bin/env bash
set -euo pipefail

: "${NETWORK:=testnet}"
: "${SUI_RPC:=https://fullnode.${NETWORK}.sui.io:443}"

cd "$(dirname "$0")/.."

if ! command -v sui >/dev/null 2>&1; then
  echo "[ERR] 'sui' CLI not found. Install Sui CLI and configure keypair." >&2
  exit 1
fi

pushd move/myapp >/dev/null

tmp_json="$(mktemp)"
trap 'rm -f "$tmp_json"' EXIT

echo "[INFO] Publishing Move package (network=$NETWORK)..."

sui client publish --json --gas-budget 200000000 >"$tmp_json" &
pub_pid=$!
spinner='|/-\'
spinner_len=${#spinner}
idx=0
while kill -0 "$pub_pid" 2>/dev/null; do
  printf "\r[INFO] Publishing... %s" "${spinner:idx:1}"
  idx=$(((idx + 1) % spinner_len))
  sleep 0.2
done

if ! wait "$pub_pid"; then
  printf "\r" >/dev/null
  echo "[ERR] Sui publish failed. Full response:" >&2
  cat "$tmp_json" >&2
  exit 1
fi

printf "\r[OK] Publish completed. Parsing response...\n"
RES_JSON="$(cat "$tmp_json")"

popd >/dev/null

if [ -z "$RES_JSON" ]; then
  echo "[ERR] Publish command returned empty JSON." >&2
  exit 1
fi

PKG="$(
  echo "$RES_JSON" | jq -r '
    (.objectChanges[]? | select(.type=="published") | .packageId),
    (.published?.packageId),
    (.packageId?),
    (.effects?.created[]? | select((.owner | type=="object") and (.owner | has("Shared"))) | .reference.objectId)
  ' | head -n1
)"

if [ -z "$PKG" ] || [ "$PKG" = "null" ]; then
  echo "[ERR] Failed to parse PACKAGE_ID from publish JSON. Raw JSON follows:" >&2
  echo "$RES_JSON" >&2
  exit 1
fi

echo "PACKAGE_ID=$PKG"

if [ -f .env ]; then
  if grep -q '^PACKAGE_ID=' .env; then
    sed -i.bak "s/^PACKAGE_ID=.*/PACKAGE_ID=$PKG/" .env
  else
    echo "PACKAGE_ID=$PKG" >> .env
  fi
  echo "[OK] Updated .env with PACKAGE_ID=$PKG"
fi
