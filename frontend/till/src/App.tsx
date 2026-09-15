import { useEffect, useState } from 'react'
import { call } from './api/client'

export default function App() {
  const [status, setStatus] = useState('Connecting…')
  useEffect(() => {
    call('dev-listRestaurants').then(() => setStatus('Connected')).catch(e => setStatus(`Error: ${e.message}`))
  }, [])
  return <main><h1>Till</h1><p data-testid="status">{status}</p></main>
}
