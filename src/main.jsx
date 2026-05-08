import React from ‘react’
import ReactDOM from ‘react-dom/client’
import { createAppKit } from ‘@reown/appkit/react’
import { WagmiProvider } from ‘wagmi’
import { mainnet } from ‘@reown/appkit/networks’
import { QueryClient, QueryClientProvider } from ‘@tanstack/react-query’
import { WagmiAdapter } from ‘@reown/appkit-adapter-wagmi’
import App from ‘./App.jsx’

const PROJECT_ID = ‘f20c518c9ca19b3fe66c8f860dca07fe’
const queryClient = new QueryClient()

const networks = [mainnet]

const wagmiAdapter = new WagmiAdapter({
networks,
projectId: PROJECT_ID,
ssr: false,
})

createAppKit({
adapters: [wagmiAdapter],
networks,
projectId: PROJECT_ID,
metadata: {
name: ‘LnF0 — Lost & Found’,
description: ‘An Ocean Odyssey NFT Game’,
url: window.location.origin,
icons: []
},
themeMode: ‘dark’,
themeVariables: {
‘–w3m-color-mix’:            ‘#7c3aed’,
‘–w3m-color-mix-strength’:   30,
‘–w3m-accent’:               ‘#00e5ff’,
‘–w3m-background-color’:     ‘#020818’,
‘–w3m-border-radius-master’: ‘4px’,
},
features: {
email:   true,
socials: [‘google’, ‘apple’, ‘github’],
}
})

ReactDOM.createRoot(document.getElementById(‘root’)).render(
<WagmiProvider config={wagmiAdapter.wagmiConfig}>
<QueryClientProvider client={queryClient}>
<App />
</QueryClientProvider>
</WagmiProvider>
)
