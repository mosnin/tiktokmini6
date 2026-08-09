import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { platform } from './tiktok.js'

platform.login() // silent login — mandatory TikTok integration, no-op in browser

const stage = document.createElement('div')
stage.id = 'stage'
document.getElementById('root').appendChild(stage)
createRoot(stage).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
