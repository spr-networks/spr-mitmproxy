import {
  TRANSPARENT_CLIENT_GROUP,
  TRANSPARENT_PROXY_PORT,
  matchesTransparentRule,
  transparentForwardingState,
  transparentRulesFor
} from './pfwRules.js'

describe('mitmproxy PFW rules', () => {
  test('builds separate HTTP and HTTPS rules for the transparent listener', () => {
    const rules = transparentRulesFor('172.23.0.2')

    expect(rules).toHaveLength(2)
    expect(rules.map((rule) => rule.OriginalDstPort)).toEqual(['80', '443'])
    rules.forEach((rule) => {
      expect(rule.Client.Group).toBe(TRANSPARENT_CLIENT_GROUP)
      expect(rule.OriginalDst.IP).toBe('0.0.0.0/0')
      expect(rule.Dst).toEqual({ IP: '172.23.0.2' })
      expect(rule.DstPort).toBe(TRANSPARENT_PROXY_PORT)
    })
  })

  test('recognizes equivalent user-created rules without taking ownership', () => {
    const desired = transparentRulesFor('172.23.0.2')
    const external = desired.map((rule, index) => ({
      ...rule,
      RuleName: `My rule ${index}`,
      Time: { Start: '', End: '', CronExpr: '' }
    }))
    const state = transparentForwardingState(
      { ForwardingRules: external },
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
      { ForwardingRules: stale },
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
      { ForwardingRules: [staleManaged, ...external] },
      '172.23.0.2'
    )

    expect(state.configured).toBe(false)
    expect(state.needsRepair).toBe(true)
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
})
