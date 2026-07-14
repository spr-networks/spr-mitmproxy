import React, { useEffect, useMemo, useState } from 'react'
import {
  Badge,
  BadgeText,
  Box,
  Button,
  ButtonIcon,
  ButtonText,
  Card,
  EmptyState,
  Heading,
  HStack,
  Icon,
  KeyVal,
  Link,
  LinkText,
  Loading,
  SectionHeader,
  StatTile,
  StatusDot,
  Text,
  TextField,
  VStack,
  useAlert
} from '@spr-networks/plugin-ui'
import {
  AlertCircle,
  ExternalLink,
  Route,
  RotateCcw,
  Save,
  ServerCrash,
  Trash2
} from 'lucide-react-native'

import { api, firewallAPI } from './api/index.js'
import { GroupItem, PolicyItem, TagItem } from './components/TagItem.js'
import { GroupMenu, PolicyMenu, TagMenu } from './components/TagMenu.js'
import {
  TRANSPARENT_CLIENT_GROUP,
  TRANSPARENT_PROXY_PORT,
  isManagedTransparentRule,
  matchesTransparentRule,
  transparentForwardingState,
  transparentRulesFor
} from './pfwRules.js'

const MITM_INTERFACE = 'mitmweb0'
const DEFAULT_POLICIES = ['dns', 'wan']
const DEFAULT_GROUPS = ['mitmweb']
const AVAILABLE_POLICIES = [
  'wan',
  'dns',
  'lan',
  'api',
  'lan_upstream',
  'disabled'
]

const defaultRule = () => ({
  RuleName: 'mitmproxy',
  Disabled: false,
  Interface: MITM_INTERFACE,
  SrcIP: '',
  RouteDst: '',
  Policies: [...DEFAULT_POLICIES],
  Groups: [...DEFAULT_GROUPS],
  Tags: []
})

const normalizeRule = (rule) => ({
  ...defaultRule(),
  ...rule,
  Policies: rule?.Policies || [...DEFAULT_POLICIES],
  Groups: rule?.Groups || [...DEFAULT_GROUPS],
  Tags: rule?.Tags || []
})

const findMitmNetwork = (networks) =>
  (Array.isArray(networks) ? networks : []).find(
    (network) =>
      network.Options?.['com.docker.network.bridge.name'] === MITM_INTERFACE
  )

const fallbackServiceIPFor = (subnet) => {
  const parts = String(subnet || '').split('/')[0].split('.')
  if (parts.length !== 4 || parts.some((part) => !/^\d+$/.test(part))) {
    return ''
  }
  return `${parts[0]}.${parts[1]}.${parts[2]}.2`
}

const containerIPFor = (network) => {
  const containers = Object.values(network?.Containers || {})
  const container =
    containers.find((candidate) => candidate.Name === 'spr-mitmproxy') ||
    (containers.length === 1 ? containers[0] : null)
  const address = String(container?.IPv4Address || '').split('/')[0]

  return address || fallbackServiceIPFor(network?.IPAM?.Config?.[0]?.Subnet)
}

const hostIP = (address) => String(address || '').trim().replace(/\/32$/, '')

const EndpointLink = ({ href, children }) => {
  if (!href) {
    return (
      <Text size="sm" color="$muted400">
        {children}
      </Text>
    )
  }

  return (
    <Link isExternal href={href}>
      <HStack space="xs" alignItems="center">
        <LinkText size="sm" fontWeight="$semibold">
          {children}
        </LinkText>
        <Icon as={ExternalLink} size="xs" color="$primary600" />
      </HStack>
    </Link>
  )
}

const Step = ({ number, title, children }) => (
  <HStack space="md" alignItems="flex-start">
    <Box
      w={30}
      h={30}
      flexShrink={0}
      borderRadius="$full"
      alignItems="center"
      justifyContent="center"
      bg="$primary100"
      sx={{ _dark: { bg: '$primary800' } }}
    >
      <Text
        size="xs"
        fontWeight="$bold"
        color="$primary800"
        sx={{ _dark: { color: '$primary100' } }}
      >
        {number}
      </Text>
    </Box>
    <VStack space="xs" flex={1}>
      <Text
        size="sm"
        fontWeight="$semibold"
        color="$textLight900"
        sx={{ _dark: { color: '$textDark50' } }}
      >
        {title}
      </Text>
      <Text size="sm" color="$muted500" lineHeight="$sm">
        {children}
      </Text>
    </VStack>
  </HStack>
)

const SetupGuide = ({ hasPFW, proxyIP }) => (
  <Card>
    <SectionHeader title="Connect a device" />
    <VStack space="lg">
      <Step number="1" title="Allow the container network">
        Confirm the detected container IP below, then save the firewall access
        rule for {MITM_INTERFACE}.
      </Step>
      <Step number="2" title="Grant device access">
        Add client devices to the mitmweb group so they can reach the proxy and
        its administration interface.
      </Step>
      <Step number="3" title="Configure the HTTP proxy">
        Set the client proxy to {proxyIP ? `${proxyIP}:9998` : 'the address shown above'},
        then visit http://mitm.it on that device to install its mitmproxy CA.
      </Step>
      <Step number="4" title="Forward traffic automatically (optional)">
        {hasPFW
          ? 'PFW is available. Use the Transparent forwarding card to install both required rules automatically.'
          : 'Transparent forwarding and domain-based matching require the PLUS PFW extension.'}
      </Step>
      {!hasPFW ? (
        <Box
          px="$4"
          py="$3"
          borderRadius="$xl"
          borderWidth={1}
          borderColor="$borderColorCardLight"
          bg="$backgroundContentLight"
          sx={{
            _dark: {
              bg: '$backgroundContentDark',
              borderColor: '$borderColorCardDark'
            }
          }}
        >
          <EndpointLink href="https://www.supernetworks.org/plus.html">
            Learn more about transparent forwarding with PLUS
          </EndpointLink>
        </Box>
      ) : null}
    </VStack>
  </Card>
)

const ErrorNotice = ({ message }) =>
  message ? (
    <HStack
      role="alert"
      space="sm"
      alignItems="flex-start"
      px="$4"
      py="$3"
      borderRadius="$xl"
      borderWidth={1}
      borderColor="$error200"
      bg="$error50"
      sx={{
        _dark: {
          bg: '$backgroundCardDark',
          borderColor: '$error800'
        }
      }}
    >
      <Icon as={AlertCircle} color="$error600" mt="$0.5" />
      <Text
        size="sm"
        color="$error700"
        flex={1}
        sx={{ _dark: { color: '$error300' } }}
      >
        {message}
      </Text>
    </HStack>
  ) : null

const TransparentForwarding = ({ hasPFW, proxyIP }) => {
  const alert = useAlert()
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    if (!hasPFW) return

    setLoading(true)
    setError('')
    try {
      setConfig(await api.get('/plugins/pfw/config'))
    } catch (err) {
      setError('PFW is installed, but its forwarding rules could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    if (!hasPFW) {
      setConfig(null)
      return () => {
        active = false
      }
    }

    setLoading(true)
    setError('')
    api
      .get('/plugins/pfw/config')
      .then((result) => active && setConfig(result))
      .catch(
        () =>
          active &&
          setError('PFW is installed, but its forwarding rules could not be loaded.')
      )
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [hasPFW])

  const state = useMemo(
    () => transparentForwardingState(config, proxyIP),
    [config, proxyIP]
  )

  if (!hasPFW) return null

  const readableError = async (err) => {
    try {
      const responseText = await err?.response?.text()
      if (responseText) return responseText
    } catch (_) {
      // Use the normalized message below.
    }
    return err?.message
      ? `PFW API failure: ${err.message}`
      : 'PFW API failure'
  }

  const enable = async () => {
    if (!proxyIP) {
      setError('The mitmproxy container IP must be detected first.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const current = await api.get('/plugins/pfw/config')
      const existing = Array.isArray(current?.ForwardingRules)
        ? current.ForwardingRules
        : []

      for (const desired of transparentRulesFor(proxyIP)) {
        const managedIndexes = existing
          .map((rule, index) =>
            rule?.RuleName === desired.RuleName ? index : -1
          )
          .filter((index) => index >= 0)

        if (managedIndexes.length > 0) {
          for (const index of managedIndexes) {
            if (!matchesTransparentRule(existing[index], desired)) {
              await api.put(`/plugins/pfw/forward/${index}`, desired)
            }
          }
          continue
        }

        if (!existing.some((rule) => matchesTransparentRule(rule, desired))) {
          await api.put('/plugins/pfw/forward', desired)
        }
      }

      await load()
      alert.success('Transparent forwarding enabled')
    } catch (err) {
      const message = await readableError(err)
      setError(message)
      alert.error('Failed to configure transparent forwarding', err)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    setSaving(true)
    setError('')
    try {
      const current = await api.get('/plugins/pfw/config')
      const managedIndexes = (current?.ForwardingRules || [])
        .map((rule, index) => (isManagedTransparentRule(rule) ? index : -1))
        .filter((index) => index >= 0)
        .sort((a, b) => b - a)

      for (const index of managedIndexes) {
        await api.delete(`/plugins/pfw/forward/${index}`, {})
      }

      await load()
      alert.success('Managed transparent forwarding removed')
    } catch (err) {
      const message = await readableError(err)
      setError(message)
      alert.error('Failed to remove transparent forwarding', err)
    } finally {
      setSaving(false)
    }
  }

  const status = !proxyIP
    ? 'Proxy unavailable'
    : state.configured
      ? 'Configured'
      : state.needsRepair
        ? 'Repair required'
        : 'Not configured'
  const statusAction =
    !proxyIP || state.needsRepair
      ? 'error'
      : state.configured
        ? 'success'
        : 'muted'

  return (
    <Card>
      <SectionHeader
        title="Transparent forwarding"
        right={
          <Badge
            action={statusAction}
            variant="outline"
            borderRadius="$full"
          >
            <BadgeText>{status}</BadgeText>
          </Badge>
        }
      />
      {loading && !config ? (
        <Loading text="Checking PFW forwarding rules..." />
      ) : (
        <VStack space="lg">
          <ErrorNotice message={error} />

          <Text size="sm" color="$muted500">
            One click sends web traffic from devices in the {TRANSPARENT_CLIENT_GROUP}{' '}
            group through mitmproxy. Other devices and non-web ports are unchanged.
          </Text>

          <VStack space="sm">
            {['80', '443'].map((port) => (
              <HStack
                key={port}
                px="$4"
                py="$3"
                borderRadius="$xl"
                borderWidth={1}
                borderColor="$borderColorCardLight"
                bg="$backgroundContentLight"
                alignItems="center"
                justifyContent="space-between"
                flexWrap="wrap"
                gap="$2"
                sx={{
                  _dark: {
                    bg: '$backgroundContentDark',
                    borderColor: '$borderColorCardDark'
                  }
                }}
              >
                <HStack space="sm" alignItems="center">
                  <Icon as={Route} size="sm" color="$primary600" />
                  <Text size="sm" fontWeight="$semibold">
                    {TRANSPARENT_CLIENT_GROUP} - TCP port {port}
                  </Text>
                </HStack>
                <Text size="sm" color="$muted500" fontFamily="$mono">
                  {proxyIP || 'proxy'}:{TRANSPARENT_PROXY_PORT}
                </Text>
              </HStack>
            ))}
          </VStack>

          {state.configured && state.managedCount === 0 ? (
            <Text size="xs" color="$muted500">
              Equivalent PFW rules already exist. They were left under their
              existing names and will not be removed by this plugin.
            </Text>
          ) : null}

          <HStack justifyContent="flex-end" space="sm" flexWrap="wrap">
            {state.managedCount > 0 ? (
              <Button
                action="secondary"
                variant="outline"
                size="sm"
                isDisabled={saving}
                onPress={remove}
              >
                <ButtonIcon as={Trash2} mr="$2" />
                <ButtonText>Remove managed rules</ButtonText>
              </Button>
            ) : null}
            <Button
              action="primary"
              size="sm"
              isDisabled={saving || !proxyIP || state.configured}
              onPress={enable}
            >
              <ButtonIcon as={state.needsRepair ? RotateCcw : Route} mr="$2" />
              <ButtonText>
                {saving
                  ? 'Saving...'
                  : state.needsRepair
                    ? 'Repair PFW rules'
                    : state.configured
                      ? 'Transparent forwarding enabled'
                      : 'Enable transparent forwarding'}
              </ButtonText>
            </Button>
          </HStack>
        </VStack>
      )}
    </Card>
  )
}

export default function InterfaceInfo({ hasPFW }) {
  const alert = useAlert()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [subnet, setSubnet] = useState('')
  const [proxyIP, setProxyIP] = useState('')
  const [webpass, setWebpass] = useState('')
  const [interfaceInfo, setInterfaceInfo] = useState(defaultRule)
  const [previousInterfaceInfo, setPreviousInterfaceInfo] = useState(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      const [firewallResult, webpassResult, networksResult] =
        await Promise.allSettled([
          firewallAPI.config(),
          api.get('/plugins/spr-mitmproxy/webpass'),
          api.get('/info/dockernetworks')
        ])

      if (!active) return

      const errors = []
      let rule = defaultRule()

      if (firewallResult.status === 'fulfilled') {
        const configuredRule = firewallResult.value.CustomInterfaceRules?.find(
          (candidate) => candidate.Interface === MITM_INTERFACE
        )
        if (configuredRule) {
          rule = normalizeRule(configuredRule)
          setPreviousInterfaceInfo(rule)
        }
      } else {
        errors.push('Unable to load the firewall configuration.')
      }

      if (webpassResult.status === 'fulfilled') {
        setWebpass(String(webpassResult.value || ''))
      }

      if (networksResult.status === 'fulfilled') {
        const network = findMitmNetwork(networksResult.value)
        const detectedSubnet = network?.IPAM?.Config?.[0]?.Subnet || ''
        const detectedProxyIP = containerIPFor(network)
        setSubnet(detectedSubnet)
        setProxyIP(detectedProxyIP)
        rule = normalizeRule({
          ...rule,
          SrcIP: rule.SrcIP || detectedProxyIP
        })
      } else {
        errors.push('Unable to detect the mitmproxy Docker network.')
      }

      setInterfaceInfo(rule)
      setError(errors.join(' '))
      setLoading(false)
    }

    load()
    return () => {
      active = false
    }
  }, [])

  const dirty = useMemo(
    () =>
      !previousInterfaceInfo ||
      JSON.stringify(interfaceInfo) !== JSON.stringify(previousInterfaceInfo),
    [interfaceInfo, previousInterfaceInfo]
  )

  const update = (name, value) => {
    setInterfaceInfo((current) => ({ ...current, [name]: value }))
  }

  const setRecommended = () => {
    setInterfaceInfo((current) => ({
      ...current,
      SrcIP: proxyIP || current.SrcIP,
      Policies: [...DEFAULT_POLICIES],
      Groups: [...DEFAULT_GROUPS],
      Tags: []
    }))
  }

  const readableError = async (err) => {
    try {
      const responseText = await err?.response?.text()
      if (responseText) return responseText
    } catch (_) {
      // Fall through to the normalized API error below.
    }
    return err?.message
      ? `Firewall API failure: ${err.message}`
      : 'Firewall API failure'
  }

  const save = async () => {
    if (!interfaceInfo.SrcIP.trim()) {
      setError('Container Source IP is required.')
      return
    }

    if (proxyIP && hostIP(interfaceInfo.SrcIP) !== proxyIP) {
      setError(`Container Source IP must match the detected address ${proxyIP}.`)
      return
    }

    setSaving(true)
    setError('')
    try {
      if (previousInterfaceInfo) {
        try {
          await firewallAPI.deleteCustomInterfaceRule(previousInterfaceInfo)
        } catch (_) {
          // PUT is authoritative and also repairs stale local rule state.
        }
      }

      await firewallAPI.addCustomInterfaceRule(interfaceInfo)
      const savedRule = normalizeRule(interfaceInfo)
      setPreviousInterfaceInfo(savedRule)
      setInterfaceInfo(savedRule)
      alert.success('Firewall access saved')
    } catch (err) {
      const message = await readableError(err)
      setError(message)
      alert.error('Failed to save firewall access', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <Loading text="Loading proxy and firewall configuration..." />
      </Card>
    )
  }

  if (!interfaceInfo) {
    return (
      <Card>
        <EmptyState
          icon={ServerCrash}
          title="Configuration unavailable"
          description={`No information is available for ${MITM_INTERFACE}.`}
        />
      </Card>
    )
  }

  const tokenQuery = webpass ? `?token=${encodeURIComponent(webpass)}` : ''
  const adminURL = proxyIP ? `http://${proxyIP}:8082${tokenQuery}` : ''
  const transparentURL = proxyIP
    ? `http://${proxyIP}:8081${tokenQuery}`
    : ''
  const configured = !!previousInterfaceInfo
  const sourceMismatch =
    !!proxyIP && !!interfaceInfo.SrcIP && hostIP(interfaceInfo.SrcIP) !== proxyIP
  const ruleStatus = !interfaceInfo.SrcIP
    ? 'Source IP required'
    : sourceMismatch
      ? 'Update required'
      : dirty
        ? configured
          ? 'Unsaved changes'
          : 'Ready to save'
        : 'Configured'

  return (
    <>
      <Card>
        <SectionHeader
          title="Proxy access"
          right={<StatusDot online={!!proxyIP} warn={!proxyIP} />}
        />
        <VStack space="md">
          <HStack flexWrap="wrap" gap="$2">
            <StatTile
              label="Container network"
              value={subnet || 'Not detected'}
              mono
            />
            <StatTile
              label="HTTP proxy"
              value={proxyIP ? `${proxyIP}:9998` : 'Unavailable'}
              mono
            />
            <StatTile
              label="Transparent proxy"
              value={proxyIP ? `${proxyIP}:9999` : 'Unavailable'}
              mono
            />
          </HStack>
          <HStack space="lg" flexWrap="wrap" alignItems="center">
            <EndpointLink href={adminURL}>Open HTTP proxy interface</EndpointLink>
            <EndpointLink href={transparentURL}>
              Open transparent proxy interface
            </EndpointLink>
          </HStack>
        </VStack>
      </Card>

      <Card>
        <SectionHeader
          title="Firewall access"
          right={
            <Badge
              action={
                !interfaceInfo.SrcIP || sourceMismatch
                  ? 'error'
                  : dirty
                    ? 'warning'
                    : 'success'
              }
              variant="outline"
              borderRadius="$full"
            >
              <BadgeText>{ruleStatus}</BadgeText>
            </Badge>
          }
        />
        <VStack space="lg">
          <ErrorNotice message={error} />

          <TextField
            label="Container Source IP"
            value={interfaceInfo.SrcIP}
            onChangeText={(value) => update('SrcIP', value)}
            placeholder="172.23.0.2"
            helper={`SPR uses this address to identify the mitmproxy container on ${MITM_INTERFACE}.`}
            error={
              !interfaceInfo.SrcIP
                ? 'Enter the mitmproxy container IP.'
                : sourceMismatch
                  ? `This does not match the detected container IP ${proxyIP}.`
                  : ''
            }
          />

          <VStack space="xs">
            <KeyVal
              label="Detected container IP"
              value={proxyIP || 'Not detected'}
              mono
            />
            <KeyVal
              label="Docker address range"
              value={subnet || 'Not detected'}
              mono
            />
            <KeyVal label="Bridge interface" value={MITM_INTERFACE} mono />
          </VStack>

          <Box
            pt="$4"
            borderTopWidth={1}
            borderColor="$borderColorCardLight"
            sx={{ _dark: { borderColor: '$borderColorCardDark' } }}
          >
            <VStack space="md">
              <VStack space="xs">
                <Heading
                  size="sm"
                  color="$textLight900"
                  sx={{ _dark: { color: '$textDark50' } }}
                >
                  Network policies, groups, and tags
                </Heading>
                <Text size="sm" color="$muted500">
                  These controls define what the proxy network can reach and which
                  clients can connect to it.
                </Text>
              </VStack>

              <HStack flexWrap="wrap" gap="$2" alignItems="center">
                {interfaceInfo.Policies.map((policy) => (
                  <PolicyItem key={policy} name={policy} size="sm" />
                ))}
                {interfaceInfo.Groups.map((group) => (
                  <GroupItem key={group} name={group} size="sm" />
                ))}
                {interfaceInfo.Tags.map((tag) => (
                  <TagItem key={tag} name={tag} size="sm" />
                ))}
              </HStack>

              <HStack space="sm" flexWrap="wrap" alignItems="center">
                <PolicyMenu
                  items={[...new Set(AVAILABLE_POLICIES)]}
                  selectedKeys={interfaceInfo.Policies}
                  onSelectionChange={(value) => update('Policies', value)}
                />
                <GroupMenu
                  items={[...new Set(DEFAULT_GROUPS)]}
                  selectedKeys={interfaceInfo.Groups}
                  onSelectionChange={(value) => update('Groups', value)}
                />
                <TagMenu
                  items={[]}
                  selectedKeys={interfaceInfo.Tags}
                  onSelectionChange={(value) => update('Tags', value)}
                />
              </HStack>
            </VStack>
          </Box>

          <HStack justifyContent="flex-end" space="sm" flexWrap="wrap">
            <Button
              action="secondary"
              variant="outline"
              size="sm"
              isDisabled={saving}
              onPress={setRecommended}
            >
              <ButtonIcon as={RotateCcw} mr="$2" />
              <ButtonText>Use detected IP</ButtonText>
            </Button>
            <Button
              action="primary"
              size="sm"
              isDisabled={
                saving || !dirty || !interfaceInfo.SrcIP || sourceMismatch
              }
              onPress={save}
            >
              <ButtonIcon as={Save} mr="$2" />
              <ButtonText>{saving ? 'Saving...' : 'Save firewall access'}</ButtonText>
            </Button>
          </HStack>
        </VStack>
      </Card>

      <TransparentForwarding hasPFW={hasPFW} proxyIP={proxyIP} />

      <SetupGuide hasPFW={hasPFW} proxyIP={proxyIP} />
    </>
  )
}
