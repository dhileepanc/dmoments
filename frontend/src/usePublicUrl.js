import { useEffect, useState } from 'react'
import { api } from './api.js'

export default function usePublicUrl(path) {
  const [lanHost, setLanHost] = useState('')

  useEffect(() => {
    api('/network')
      .then((data) => setLanHost(data.addresses?.[0] || ''))
      .catch(() => {})
  }, [])

  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  const host =
    isLocal && lanHost
      ? `${lanHost}${window.location.port ? `:${window.location.port}` : ''}`
      : window.location.host
  return `${window.location.protocol}//${host}${path}`
}