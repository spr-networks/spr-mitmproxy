import React from 'react'
import ReactDOM from 'react-dom/client'
import { PluginApp } from '@spr-networks/plugin-ui'
import Plugin from './Plugin.js'

// Do not wrap this in StrictMode. gluestack-style uses the first provider id
// to apply color mode, and StrictMode's development double render breaks it.
ReactDOM.createRoot(document.getElementById('root')).render(
  <PluginApp>
    <Plugin />
  </PluginApp>
)
