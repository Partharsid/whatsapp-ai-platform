'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface WebSocketMessage {
  type: 'qr' | 'status' | 'connected'
  sessionId: string
  qr?: string
  status?: string
}

export function useWebSocket(sessionId: string | null) {
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  const connect = useCallback(() => {
    if (!sessionId) return

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
    const ws = new WebSocket(`${wsUrl}?sessionId=${sessionId}`)

    ws.onopen = () => {
      setConnected(true)
    }

    ws.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data)

        switch (data.type) {
          case 'qr':
            setQrCode(data.qr || null)
            break
          case 'status':
            setStatus(data.status || null)
            if (data.status === 'CONNECTED') {
              setQrCode(null)
            }
            break
          case 'connected':
            setConnected(true)
            break
        }
      } catch (error) {
        console.error('WebSocket message parse error:', error)
      }
    }

    ws.onclose = () => {
      setConnected(false)
      setQrCode(null)
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    wsRef.current = ws
  }, [sessionId])

  useEffect(() => {
    connect()
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setQrCode(null)
    setConnected(false)
    setStatus(null)
  }, [])

  return { qrCode, status, connected, disconnect }
}
