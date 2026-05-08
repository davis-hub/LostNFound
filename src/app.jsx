import React, { useEffect, useRef } from ‘react’
import { useAppKit, useAppKitAccount, useDisconnect } from ‘@reown/appkit/react’
import Game from ‘./Game.jsx’

export default function App() {
const { open } = useAppKit()
const { address, isConnected } = useAppKitAccount()
const { disconnect } = useDisconnect()
const prevAddress = useRef(null)

// Expose open/disconnect to the game’s connectWallet function
useEffect(() => {
window.__wcOpen = () => open()
window.__wcDisconnect = () => disconnect()
}, [open, disconnect])

// When wallet connects — fire the game’s NFT detection
useEffect(() => {
if (isConnected && address && address !== prevAddress.current) {
prevAddress.current = address

```
  // Update the connect button
  const btn = document.getElementById('walletBtn')
  if (btn) btn.textContent = address.slice(0,6) + '...' + address.slice(-4)

  // Call the game's onWalletConnected — retry until game script is ready
  let tries = 0
  const fire = () => {
    tries++
    if (typeof window.onWalletConnected === 'function') {
      window.onWalletConnected(address)
    } else if (tries < 30) {
      setTimeout(fire, 200)
    }
  }
  fire()
}

if (!isConnected && prevAddress.current) {
  prevAddress.current = null
  const btn = document.getElementById('walletBtn')
  if (btn) btn.textContent = '🔗 CONNECT'
}
```

}, [isConnected, address])

return <Game />
}
