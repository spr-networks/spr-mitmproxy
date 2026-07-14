import React, { useEffect, useState } from 'react'
import { ListHeader, Page } from '@spr-networks/plugin-ui'

import { api } from './api/index.js'
import InterfaceInfo from './InterfaceInfo.js'

export default function Plugin() {
  const [hasPFW, setHasPFW] = useState(null)

  useEffect(() => {
    let active = true

    api
      .get('/plugins/pfw/config')
      .then(() => active && setHasPFW(true))
      .catch(() => active && setHasPFW(false))

    return () => {
      active = false
    }
  }, [])

  const status =
    hasPFW === null
      ? 'Checking features'
      : hasPFW
        ? 'Transparent proxy ready'
        : 'HTTP proxy ready'

  return (
    <Page testID="mitmproxy-page">
      <ListHeader
        title="mitmproxy"
        description="Inspect and debug device traffic through an isolated proxy network"
        mark="mp"
        status={status}
        statusAction={hasPFW ? 'success' : 'muted'}
      />
      <InterfaceInfo hasPFW={hasPFW === true} />
    </Page>
  )
}
