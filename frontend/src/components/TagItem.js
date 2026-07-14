import React from 'react'
import PropTypes from 'prop-types'
import {
  Badge,
  BadgeIcon,
  BadgeText
} from '@spr-networks/plugin-ui'
import {
  ArrowLeftRight,
  ArrowUpFromDot,
  CableIcon,
  FileSearch,
  Globe2Icon,
  PowerIcon,
  RouteIcon,
  TagIcon,
  UsersIcon,
  WifiIcon
} from 'lucide-react-native'

const BadgeItem = ({ name, size, icon, tone = 'muted', ...props }) => {
  const primary = tone === 'primary'
  const bg = primary ? '$primary100' : '$muted100'
  const fg = primary ? '$primary800' : '$muted700'
  const darkBg = primary ? '$primary800' : '$muted800'
  const darkFg = primary ? '$primary100' : '$muted100'

  return (
    <Badge
      action="muted"
      variant="solid"
      bg={props.bg || bg}
      size={size || 'sm'}
      py="$1"
      px="$2"
      borderRadius="$lg"
      sx={{ _dark: { bg: props.bg || darkBg } }}
    >
      <BadgeText
        color={props.color || fg}
        sx={{ _dark: { color: props.color || darkFg } }}
      >
        {name}
      </BadgeText>
      {icon ? (
        <BadgeIcon
          as={icon}
          ml="$1"
          color={props.color || fg}
          sx={{ _dark: { color: props.color || darkFg } }}
        />
      ) : null}
    </Badge>
  )
}

const TagItem = React.memo((props) => (
  <BadgeItem {...props} icon={TagIcon} />
))

const policyIcons = {
  wan: Globe2Icon,
  dns: FileSearch,
  lan: ArrowLeftRight,
  api: RouteIcon,
  lan_upstream: ArrowUpFromDot,
  disabled: PowerIcon
}

const PolicyItem = React.memo(({ name, size }) => (
  <BadgeItem
    name={name}
    size={size}
    icon={policyIcons[name] || RouteIcon}
    tone="primary"
  />
))

const GroupItem = React.memo((props) => (
  <BadgeItem {...props} icon={UsersIcon} />
))

const InterfaceItem = React.memo(({ name, address, size, ...props }) => {
  if (!name) return null

  const isWifi = name.startsWith('wlan')
  const icon = isWifi ? WifiIcon : CableIcon
  const label = address ? `${name} ${address}` : name
  return (
    <BadgeItem
      {...props}
      name={label}
      size={size}
      icon={icon}
      tone="primary"
    />
  )
})

const ProtocolItem = ({ name, size, ...props }) => (
  <Badge action="muted" variant="outline" size={size || 'md'} {...props}>
    <BadgeText>{name}</BadgeText>
  </Badge>
)

const itemPropTypes = {
  name: PropTypes.string.isRequired,
  size: PropTypes.any
}

BadgeItem.propTypes = {
  ...itemPropTypes,
  icon: PropTypes.any,
  tone: PropTypes.oneOf(['muted', 'primary'])
}
TagItem.propTypes = itemPropTypes
GroupItem.propTypes = itemPropTypes
PolicyItem.propTypes = itemPropTypes
InterfaceItem.propTypes = itemPropTypes
ProtocolItem.propTypes = itemPropTypes

export default TagItem
export { TagItem, GroupItem, InterfaceItem, ProtocolItem, PolicyItem }
