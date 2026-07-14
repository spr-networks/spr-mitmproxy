import {
  TRANSPARENT_CLIENT_TAG,
  TRANSPARENT_PROXY_PORT,
  TRANSPARENT_ROUTE_INTERFACE,
  matchesQuicBlockRule,
  matchesTransparentRule,
  transparentForwardingState,
  transparentQuicBlockRule,
  transparentRulesFor
} from './pfwRules.js'

const externalQuicBlock = () => ({
  ...transparentQuicBlockRule(),
  RuleName: 'Existing QUIC block'
})

const configWithBlock = (ForwardingRules) => ({
  ForwardingRules,
  BlockRules: [externalQuicBlock()]
})

describe('mitmproxy PFW rules', () => {
  test('builds separate HTTP and HTTPS rules for the transparent listener', () => {
    const rules = transparentRulesFor('172.23.0.2')

    expect(rules).toHaveLength(2)
    expect(rules.map((rule) => rule.OriginalDstPort)).toEqual(['80', '443'])
    rules.forEach((rule) => {
      expect(rule.Client).toEqual({ Tag: TRANSPARENT_CLIENT_TAG })
      expect(rule.OriginalDst.IP).toBe('0.0.0.0/0')
      expect(rule.Dst).toEqual({ IP: '172.23.0.2' })
      expect(rule.DstPort).toBe('')
      expect(rule.DstInterface).toBe(TRANSPARENT_ROUTE_INTERFACE)
    })
  })

  test('builds a UDP 443 block so QUIC falls back to intercepted TCP', () => {
    const block = transparentQuicBlockRule()

    expect(block.Client).toEqual({ Tag: TRANSPARENT_CLIENT_TAG })
    expect(block.Protocol).toBe('udp')
    expect(block.Dst).toEqual({ IP: '0.0.0.0/0' })
    expect(block.DstPort).toBe('443')
    expect(matchesQuicBlockRule(block)).toBe(true)
  })

  test('recognizes equivalent user-created rules without taking ownership', () => {
    const desired = transparentRulesFor('172.23.0.2')
    const external = desired.map((rule, index) => ({
      ...rule,
      RuleName: `My rule ${index}`,
      Time: { Start: '', End: '', CronExpr: '' }
    }))
    const state = transparentForwardingState(
      configWithBlock(external),
      '172.23.0.2'
    )

    expect(state.configured).toBe(true)
    expect(state.managedCount).toBe(0)
  })

  test('marks stale managed destinations for repair', () => {
    const stale = transparentRulesFor('172.23.0.2').map((rule) => ({
      ...rule,
      Dst: { IP: '172.23.0.3' }
    }))
    const state = transparentForwardingState(
      configWithBlock(stale),
      '172.23.0.2'
    )

    expect(state.configured).toBe(false)
    expect(state.needsRepair).toBe(true)
    expect(state.managedCount).toBe(2)
  })

  test('marks the old host DNAT rules for repair', () => {
    const legacy = transparentRulesFor('172.23.0.2').map((rule) => ({
      ...rule,
      DstPort: TRANSPARENT_PROXY_PORT,
      DstInterface: ''
    }))
    const state = transparentForwardingState(
      configWithBlock(legacy),
      '172.23.0.2'
    )

    expect(state.configured).toBe(false)
    expect(state.needsRepair).toBe(true)
    expect(state.managedCount).toBe(2)
  })

  test('marks legacy group-based managed rules for repair', () => {
    const legacy = transparentRulesFor('172.23.0.2').map((rule) => ({
      ...rule,
      Client: { Group: 'mitmweb' }
    }))
    const state = transparentForwardingState(
      configWithBlock(legacy),
      '172.23.0.2'
    )

    expect(state.configured).toBe(false)
    expect(state.needsRepair).toBe(true)
    expect(state.managedCount).toBe(2)
  })

  test('repairs stale managed rules even when equivalent external rules exist', () => {
    const desired = transparentRulesFor('172.23.0.2')
    const staleManaged = {
      ...desired[0],
      Dst: { IP: '172.23.0.99' }
    }
    const external = desired.map((rule, index) => ({
      ...rule,
      RuleName: `External ${index}`
    }))
    const state = transparentForwardingState(
      configWithBlock([staleManaged, ...external]),
      '172.23.0.2'
    )

    expect(state.configured).toBe(false)
    expect(state.needsRepair).toBe(true)
  })

  test('requires the QUIC block when managed forwarding is present', () => {
    const state = transparentForwardingState(
      { ForwardingRules: transparentRulesFor('172.23.0.2') },
      '172.23.0.2'
    )

    expect(state.configured).toBe(false)
    expect(state.needsRepair).toBe(true)
    expect(state.managedCount).toBe(2)
  })

  test('does not treat disabled or scheduled rules as active', () => {
    const [desired] = transparentRulesFor('172.23.0.2')

    expect(matchesTransparentRule({ ...desired, Disabled: true }, desired)).toBe(
      false
    )
    expect(
      matchesTransparentRule(
        { ...desired, Time: { Start: '09:00', End: '17:00' } },
        desired
      )
    ).toBe(false)
  })

  test('does not accept a rule that combines the tag with another selector', () => {
    const [desired] = transparentRulesFor('172.23.0.2')

    expect(
      matchesTransparentRule(
        {
          ...desired,
          Client: { Tag: TRANSPARENT_CLIENT_TAG, Group: 'mitmweb' }
        },
        desired
      )
    ).toBe(false)
    expect(
      matchesQuicBlockRule({
        ...transparentQuicBlockRule(),
        Client: { Tag: TRANSPARENT_CLIENT_TAG, Group: 'mitmweb' }
      })
    ).toBe(false)
  })
})
