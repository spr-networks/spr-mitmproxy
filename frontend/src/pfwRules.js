export const TRANSPARENT_PROXY_PORT = '9999'
export const TRANSPARENT_CLIENT_TAG = 'mitmproxy'
export const TRANSPARENT_ROUTE_INTERFACE = 'mitmweb0'

const PORTS = [
  { name: 'mitmproxy: transparent HTTP', port: '80' },
  { name: 'mitmproxy: transparent HTTPS', port: '443' }
]
const QUIC_BLOCK_RULE_NAME = 'mitmproxy: block QUIC'

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

export const transparentQuicBlockRule = () => ({
  RuleName: QUIC_BLOCK_RULE_NAME,
  Client: { Tag: TRANSPARENT_CLIENT_TAG },
  Protocol: 'udp',
  Dst: { IP: '0.0.0.0/0' },
  DstPort: '443',
  Disabled: false,
  Condition: '',
  Expiration: 0
})

export const isManagedQuicBlockRule = (rule) =>
  rule?.RuleName === QUIC_BLOCK_RULE_NAME

const activeWithoutSchedule = (rule) =>
  !rule?.Disabled &&
  !rule?.Condition &&
  Number(rule?.Expiration || 0) === 0 &&
  !rule?.Time?.CronExpr &&
  !rule?.Time?.Start &&
  !rule?.Time?.End

const matchesTaggedClient = (rule) => {
  const client = rule?.Client || {}
  return (
    client.Tag === TRANSPARENT_CLIENT_TAG &&
    !client.Group &&
    !client.Identity &&
    !client.SrcIP &&
    !client.Endpoint
  )
}

export const matchesTransparentRule = (rule, desired) => {
  return (
    activeWithoutSchedule(rule) &&
    String(rule?.Protocol || '').toLowerCase() === 'tcp' &&
    matchesTaggedClient(rule) &&
    rule?.OriginalDst?.IP === '0.0.0.0/0' &&
    String(rule?.OriginalDstPort || '') === desired.OriginalDstPort &&
    hostIP(rule?.Dst?.IP) === hostIP(desired.Dst.IP) &&
    !rule?.DstPort &&
    rule?.DstInterface === TRANSPARENT_ROUTE_INTERFACE
  )
}

export const matchesQuicBlockRule = (rule) =>
  activeWithoutSchedule(rule) &&
  String(rule?.Protocol || '').toLowerCase() === 'udp' &&
  matchesTaggedClient(rule) &&
  rule?.Dst?.IP === '0.0.0.0/0' &&
  String(rule?.DstPort || '') === '443'

const isSupportedRouteToProxy = (rule) =>
  String(rule?.Protocol || '').toLowerCase() === 'tcp' &&
  ['80', '443'].includes(String(rule?.OriginalDstPort || '')) &&
  !rule?.DstPort

// mitmweb0 terminates transparent HTTP(S); it is deliberately not a general
// routed site. Any other active forwarding rule to it can black-hole traffic
// or, with older containers, create a host/container routing loop.
export const isConflictingProxyRoute = (rule) =>
  !rule?.Disabled &&
  rule?.DstInterface === TRANSPARENT_ROUTE_INTERFACE &&
  !isSupportedRouteToProxy(rule)

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
  const blockRules = Array.isArray(config?.BlockRules) ? config.BlockRules : []
  const blockMatchingIndex = blockRules.findIndex(matchesQuicBlockRule)
  const managedBlockIndexes = blockRules
    .map((rule, index) => (isManagedQuicBlockRule(rule) ? index : -1))
    .filter((index) => index >= 0)
  const managedBlockRulesValid = managedBlockIndexes.every((index) =>
    matchesQuicBlockRule(blockRules[index])
  )
  const conflictingIndexes = rules
    .map((rule, index) =>
      isConflictingProxyRoute(rule) && !isManagedTransparentRule(rule)
        ? index
        : -1
    )
    .filter((index) => index >= 0)
  const managedCount = managedIndexes.length + managedBlockIndexes.length
  const desiredConfigurationPresent =
    !!proxyIP &&
    desiredRulesPresent &&
    managedRulesValid &&
    blockMatchingIndex >= 0 &&
    managedBlockRulesValid
  const hasConflicts = conflictingIndexes.length > 0

  return {
    desired,
    matching,
    matchingCount: matching.filter((index) => index >= 0).length,
    managedIndexes,
    managedBlockIndexes,
    blockMatchingIndex,
    managedCount,
    conflictingIndexes,
    conflictingRules: conflictingIndexes.map((index) => rules[index]),
    hasConflicts,
    configured: desiredConfigurationPresent && !hasConflicts,
    needsRepair:
      !!proxyIP &&
      managedCount > 0 &&
      !desiredConfigurationPresent
  }
}
