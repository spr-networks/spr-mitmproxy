import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react-native';

import {
  Alert,
  AlertText,
  AlertIcon,
  Box,
  Button,
  ButtonText,
  Checkbox,
  CheckboxIcon,
  CheckboxIndicator,
  CheckboxLabel,
  CheckboxGroup,
  Center,
  FormControl,
  FormControlHelper,
  FormControlHelperText,
  FormControlLabel,
  FormControlLabelText,
  Heading,
  HStack,
  Input,
  InputField,
  Link,
  LinkText,
  Switch,
  Text,
  VStack
} from '@gluestack-ui/themed'

import { api, firewallAPI } from './api/index.js';
import { PolicyItem, GroupItem, TagItem } from './components/TagItem.js';
import { GroupMenu, TagMenu, PolicyMenu } from './components/TagMenu.js'
//import ProtocolRadio from 'components/Form/ProtocolRadio'
import InputSelect from './components/InputSelect'

const MitmproxySetupGuide = ({ subnetIP }) => {
  const steps = [
    {
      title: 'Configure the mitmweb0 interace below',
      description: "Follow the form below to grant the mitmproxy container network access",
    },
    {
      title: 'Configure Access to MITMProxy',
      description: "Join devices to the 'mitmweb' group for access to the mitmproxy admin interface and/or http proxy",
    },
    {
      title: 'Configure the client',
      description: `Configure your device to use the HTTP proxy at ${subnetIP}:9998, and install the CA cert by visiting http://mitm.it on the device`,
    },
    {
      title: 'Set up forwarding rule (for PFW users)',
      description: `With PLUS's PFW extension, set a forwarding rule to the transparent proxy at ${subnetIP}:9999. Ports 80/443 are automatically translated.`,
    },
  ];

  return (
    <Box  borderRadius="$lg" shadowColor="$gray300" >
      <Heading size="lg" mb="$6">Mitmproxy Setup Guide</Heading>
      <Alert status="warning">
      <VStack space="$6">
        {steps.map((step, index) => (
          <HStack key={index} space="$4" alignItems="flex-start">
            <Center w="$4" h="$4" bg="$blue500" borderRadius="$full">
              <Text color="$white" fontWeight="$bold">{index + 1}</Text>
            </Center>
            <VStack flex={2}>
              <Text fontWeight="$semibold" fontSize="$md">{step.title}</Text>
              <Text fontSize="$sm" color="$gray600">{step.description}</Text>
            </VStack>
          </HStack>
        ))}

        <HStack space="$4" alignItems="flex-start">
          <Center w="$4" h="$4" bg="$blue500" borderRadius="$full">
            <Text color="$white" fontWeight="$bold">!</Text>
          </Center>
          <VStack flex={2}>
            <Text fontWeight="$semibold" fontSize="$md">Advanced Features with PLUS</Text>
            <Text fontSize="$sm" color="$gray600">The PFW Extension lets you transparently forward traffic. You can selectively apply forwarding rules by domain name (optionally with a regular expression). </Text>
          </VStack>
        </HStack>

        <HStack py="$4">
          <Link isExternal href={`http://${subnetIP}:8082`}>
            <LinkText>Go to http://{subnetIP}:8082 for the http proxy interface</LinkText>
          </Link>
        </HStack>

        <HStack py="$1">
          <Link isExternal href={`http://${subnetIP}:8081`}>
            <LinkText>Go to http://{subnetIP}:8081 for the transparent proxy interface</LinkText>
          </Link>
        </HStack>

      </VStack>
      </Alert>
    </Box>
  );
};


const InterfaceInfo = () => {
  const mitmName = 'mitmweb0'
  const defaultRuleName = 'mitmproxy'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [interfaceList, setInterfaceList] = useState([])
  const [subnet, setSubnet] = useState('')
  const [subnetIP, setSubnetIP] = useState('')

  const defaultMitmPolicies = ["dns", "wan"]
  const defaultMitmGroups = ["mitmweb"]
  const [interfaceInfo, setInterfaceInfo] = useState({
     RuleName: "mitmproxy",
     Disabled: false,
     Interface: mitmName,
     SrcIP: "", //172.18.0.0/16",
     RouteDst:"",
     Policies: defaultMitmPolicies,
     Groups: defaultMitmGroups,
     Tags:[]}
  )

  const [previousInterfaceInfo, setPreviousInterfaceInfo] = useState(null)

  const fetchConfig = () => {
    firewallAPI.config().then((c) => {
      let found = false
      if (c.CustomInterfaceRules) {
        for(let x of c.CustomInterfaceRules) {
          if (x.Interface === mitmName) {
            setInterfaceInfo(x)
            setPreviousInterfaceInfo(x)
            found = true
          }
        }
      }

      if (found === false) {
        setError("Please configure the mitmweb0 interface")
      }
      setLoading(false)
    }).catch(err => {
      setError("oops")
    })
  }

  useEffect(() => {
    fetchConfig()

    api
      .get('/info/dockernetworks')
      .then((docker) => {
        let networked = docker.filter(
          (n) => n.Options && n.Options['com.docker.network.bridge.name']
        )

        let s = []
        let blocks = []
        for (let n of networked) {
          let iface = n.Options['com.docker.network.bridge.name']
          s.push(iface)
          if (n.IPAM?.Config?.[0]?.Subnet) {
            let subnet = n.IPAM.Config[0].Subnet
            if (iface == mitmName) {
              setSubnet(subnet)
              if (subnet.includes('/')) {
                let x = subnet.split('/')[0]
                let y = subnet.split('.')
                setSubnetIP(y[0] + '.' + y[1] + '.' + y[2] + '.' + '2')
              }
            }
          }
        }
        setLoading(false)
      })
      //.catch((err) => alertContext.error('fail ' + err))
      .catch((err) => {})
  }, []);


  if (loading) return <Text>Loading...</Text>;
  if (!interfaceInfo && error) return <Text color="$error500">{error}</Text>;
  if (!interfaceInfo) return <Text>No information available for {mitmName} interface.</Text>;

  let defaultPolicies = ['wan', 'dns', 'lan', 'api', 'lan_upstream', 'disabled']
  let defaultGroups = defaultMitmGroups
  let defaultTags = []

  const handleChange = (name, value) => {
    setInterfaceInfo(prevState => ({
      ...prevState,
      [name]: value
    }));
  }

  const handlePolicies = (policies) => {
    handleChange('Policies', policies)
  }

  const handleGroups = (groups) => {
    handleChange('Groups', groups)
  }

  const handleTags = (tags) => {
    handleChange('Tags', tags)
  }

  const setRecommended = (event) => {
    event.preventDefault()
    let newInterfaceInfo = interfaceInfo
    setInterfaceInfo(prevState => ({
      ...prevState,
      SrcIP: subnet,
      Policies: defaultMitmPolicies,
      Groups: defaultMitmGroups,
      Tags: []
    }));
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (interfaceInfo.SrcIP == '') {
      setError("Need a SrcIP for the container")
      return
    }

    const save = () => {
      setError('')

      firewallAPI
        .addCustomInterfaceRule(interfaceInfo)
        .then((x) => {
          setPreviousInterfaceInfo(interfaceInfo)
        })
        .catch((err) => {
          err.response.text().then(t => {
            setError(t)
          }).catch(
            setError("Firewall API Failure")
          )
        })
    }

    if (previousInterfaceInfo) {
      firewallAPI
        .deleteCustomInterfaceRule(previousInterfaceInfo)
        .then(() => {
            save()
        })
        .catch((err) => {
          save()
        })
    } else {
      save()
    }

  }


  return (
    <VStack space="md">

      <MitmproxySetupGuide subnetIP={subnetIP} />

      <FormControl>
        <FormControlLabel>
          <FormControlLabelText>Mitmproxy container network on {mitmName}</FormControlLabelText>
        </FormControlLabel>
      </FormControl>

      <FormControl>
        <FormControlLabel>
          <FormControlLabelText>Docker's Address Range</FormControlLabelText>
        </FormControlLabel>
        <FormControlHelper>
          <FormControlHelperText>
            {subnet}
          </FormControlHelperText>
        </FormControlHelper>
      </FormControl>

      <FormControl isRequired>
        <FormControlLabel>
          <FormControlLabelText>Configured Source Range</FormControlLabelText>
        </FormControlLabel>
        <FormControlHelper>
          <Input size="md" variant="underlined">
            <InputField
              variant="underlined"
              value={interfaceInfo.SrcIP}
              onChangeText={(value) => handleChange('SrcIP', value)}
            />
          </Input>
        </FormControlHelper>
      </FormControl>

      <FormControl>
        <FormControlLabel>
          <FormControlLabelText>Network Policies, Groups, & Tags</FormControlLabelText>
        </FormControlLabel>
        <FormControlHelper>
          <FormControlHelperText>
            Network policies and groups control network access for the {mitmName} interface
          </FormControlHelperText>
        </FormControlHelper>
        <HStack flexWrap="wrap" w="$full" space="md">
          <HStack space="md" flexWrap="wrap" alignItems="center">
            {interfaceInfo.Policies.map((policy) => (
              <PolicyItem key={policy} name={policy} size="sm" />
            ))}
          </HStack>
          <HStack space="md" flexWrap="wrap" alignItems="center">
            {interfaceInfo.Groups.map((group) => (
              <GroupItem key={group} name={group} size="sm" />
            ))}
          </HStack>
          <HStack space="md" flexWrap="wrap" alignItems="center">
            {interfaceInfo.Tags.map((tag) => (
              <TagItem key={tag} name={tag} size="sm" />
            ))}
          </HStack>
        </HStack>
        <HStack space="md" flexWrap="wrap" alignItems="center">
          <PolicyMenu
            items={[
              ...new Set(defaultPolicies)
            ]}
            selectedKeys={interfaceInfo.Policies}
            onSelectionChange={handlePolicies}
          />

          <GroupMenu
            items={[
              ...new Set(defaultGroups)
            ]}
            selectedKeys={interfaceInfo.Groups}
            onSelectionChange={handleGroups}
          />

          <TagMenu
            items={[
              ...new Set(defaultTags)
            ]}
            selectedKeys={interfaceInfo.Tags}
            onSelectionChange={handleTags}
          />
        </HStack>

      </FormControl>

      <Button action="secondary" size="md" onPress={setRecommended}>
        <ButtonText>Set Recommended</ButtonText>
      </Button>
      <Button action="primary" size="md" onPress={handleSubmit}>
        <ButtonText>Save</ButtonText>
      </Button>
      <Text color="$error500">{error}</Text>
    </VStack>
  );
};

export default InterfaceInfo;
