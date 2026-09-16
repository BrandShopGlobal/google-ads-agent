#!/usr/bin/env bash
set -euo pipefail

npm run start -- -H 127.0.0.1 > /tmp/brand-shop-ads-agent.log 2>&1 &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true' EXIT

for _ in $(seq 1 20); do
  if curl -fsS http://127.0.0.1:3000/api/config > /tmp/brand-shop-config.json; then
    break
  fi
  sleep 0.25
done

curl -fsS http://127.0.0.1:3000/api/accounts > /tmp/brand-shop-accounts.json
curl -fsS -X POST http://127.0.0.1:3000/api/research \
  -H 'content-type: application/json' \
  --data '{"customerId":"1234567890","company":"Sydney Flow Plumbing","description":"Licensed local plumbing services across Sydney.","url":"https://example.com","seeds":["emergency plumber"],"locationIds":["2036"],"languageId":"1000","minimumVolume":100}' \
  > /tmp/brand-shop-research.json
curl -fsS -X POST http://127.0.0.1:3000/api/creative \
  -H 'content-type: application/json' \
  --data '{"company":"Sydney Flow Plumbing","description":"Licensed local plumbing services across Sydney.","finalUrl":"https://example.com","keywords":["emergency plumber sydney"],"projectId":"demo-project"}' \
  > /tmp/brand-shop-creative.json
curl -fsS -X POST http://127.0.0.1:3000/api/campaign \
  -H 'content-type: application/json' \
  --data '{"confirmation":"CREATE PAUSED CAMPAIGN","projectId":"demo-project","campaign":{"customerId":"1234567890","campaignName":"Sydney Plumbing Search","dailyBudgetMicros":50000000,"locationIds":["2036"],"languageId":"1000","finalUrl":"https://example.com","groups":[{"name":"Emergency Plumbing","keywords":[{"text":"emergency plumber sydney","matchType":"PHRASE"}],"negativeKeywords":["plumbing jobs"],"creative":{"headlines":["Emergency Plumber Sydney","Available 24 Hours","Fast Local Plumbing"],"descriptions":["Need an emergency plumber? Get fast plumbing assistance across Sydney.","Available for blocked drains, leaks and urgent hot-water repairs."],"sitelinks":[]}}]}}' \
  > /tmp/brand-shop-campaign.json

grep -q '"demoMode":true' /tmp/brand-shop-config.json
grep -q 'Sydney Flow Plumbing' /tmp/brand-shop-accounts.json
grep -q '"projectId":"demo-project"' /tmp/brand-shop-research.json
grep -q 'emergency plumber sydney' /tmp/brand-shop-research.json
grep -q 'Emergency Plumber Sydney' /tmp/brand-shop-creative.json
grep -q '"status":"PAUSED"' /tmp/brand-shop-campaign.json
echo "Smoke test passed: full demo workflow completed with a paused campaign."
