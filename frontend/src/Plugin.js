import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react'

import {
Alert,
Link,
LinkText,
HStack,
Text,
View,
VStack
} from '@gluestack-ui/themed'
import { api } from './api/index.js';

import InterfaceInfo from './InterfaceInfo.js'
//import DebugEvent from './DebugEvent.js'

const Plugin = forwardRef((props, ref) => {
  const [message, setMessage] = useState(null)
  const [hasPFW, setHasPfw] = useState(false)

  useImperativeHandle(ref, () => ({
    onMessage: (event) => {
      setMessage(event.data)
    }
  }))

  useEffect(() => {
    api
      .get('/plugins/pfw/config')
      .then((pfw) => {
        setHasPfw(true)
      })
      //.catch((err) => alertContext.error('fail ' + err))
      .catch((err) => {
        setHasPfw(false)
      })
  }, []);

  return (
    <View
      h="$full"
      bg="$backgroundContentLight"
      sx={{ _dark: { bg: '$backgroundContentDark' } }}
    >
      <VStack space="lg">
        {hasPFW && (
          <Alert status="warning">
          <VStack>
          <HStack>
          <Text fontWeight="$semibold">Note:</Text><Text>PLUS is recommended for transparent forwarding and domain-name based matching</Text>
          </HStack>
          <Link isExternal href="https://www.supernetworks.org/plus.html">
            <LinkText>Learn more about PLUS</LinkText>
          </Link>
          </VStack>
          </Alert>

        )}
        {/*<DebugEvent message={message} />*/}
        <InterfaceInfo />
      </VStack>
    </View>
  )
})

export default Plugin
