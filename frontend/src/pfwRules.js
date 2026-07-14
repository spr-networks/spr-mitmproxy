export const TRANSPARENT_PROXY_PORT = '9999'
export const TRANSPARENT_CLIENT_TAG = 'mitmproxy'
export const TRANSPARENT_ROUTE_INTERFACE = 'mitmweb0'

const PORTS = [
  { name: 'mitmproxy: transparent HTTP', port: '80' },
  { name: 'mitmproxy: transparent HTTPS', port: '443' }
]

const hostIP = (address) => String(address || '').trim().replace(/\/32$/, '')

export const transparentRulesFor = (proxyIP) =>
  PORTS.map(({ name, port }) => ({
    RuleName: name,
    Client: { Tag: TRANSPARENT_CLIENT_TAG },
    Protocol: 'tcp',
    OriginalDst: { IP: '0.0.0.0/0' },
    OriginalDstPort: port,
    // Keep the original destination tuple intact until the packet reaches the
    // container. Its own nft rule redirects the traffic to mitmproxy locally.
    Dst: { IP: hostIP(proxyIP) },
    DstPort: '',
    DstInterface: TRANSPARENT_ROUTE_INTERFACE,
    Disabled: false,
    Condition: '',
    Expiration: 0
  }))

export const isManagedTransparentRule = (rule) =>
  PORTS.some(({ name }) => rule?.RuleName === name)

export const matchesTransparentRule = (rule, desired) => {
  const scheduled =
    rule?.Condition ||
    Number(rule?.Expiration || 0) !== 0 ||
    rule?.Time?.CronExpr ||
    rule?.Time?.Start ||
    rule?.Time?.End
  const client = rule?.Client || {}

  return (
    !rule?.Disabled &&
    !scheduled &&
    String(rule?.Protocol || '').toLowerCase() === 'tcp' &&
    client.Tag === TRANSPARENT_CLIENT_TAG &&
    !client.Group &&
    !client.Identity &&
    !client.SrcIP &&
    !client.Endpoint &&
    rule?.OriginalDst?.IP === '0.0.0.0/0' &&
    String(rule?.OriginalDstPort || '') === desired.OriginalDstPort &&
    hostIP(rule?.Dst?.IP) === hostIP(desired.Dst.IP) &&
    !rule?.DstPort &&
    rule?.DstInterface === TRANSPARENT_ROUTE_INTERFACE
  )
}

export const transparentForwardingState = (config, proxyIP) => {
  const rules = Array.isArray(config?.ForwardingRules)
    ? config.ForwardingRules
    : []
  const desired = transparentRulesFor(proxyIP)
  const matching = desired.map((expected) =>
    rules.findIndex((rule) => matchesTransparentRule(rule, expected))
  )
  const managedIndexes = rules
    .map((rule, index) => (isManagedTransparentRule(rule) ? index : -1))
    .filter((index) => index >= 0)
  const managedRulesValid = managedIndexes.every((index) =>
    desired.some((expected) => matchesTransparentRule(rules[index], expected))
  )
  const desiredRulesPresent = matching.every((index) => index >= 0)

  return {
    desired,
    matching,
    matchingCount: matching.filter((index) => index >= 0).length,
    managedIndexes,
    managedCount: managedIndexes.length,
    configured: !!proxyIP && desiredRulesPresent && managedRulesValid,
    needsRepair:
      !!proxyIP &&
      managedIndexes.length > 0 &&
      (!desiredRulesPresent || !managedRulesValid)
  }
}
