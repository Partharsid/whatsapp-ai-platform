function getBaseUrl() {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api`
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('wa_token') : null
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options?.headers as Record<string, string>,
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${getBaseUrl()}${endpoint}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `HTTP ${res.status}`)
  }

  return res.json()
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      fetchApi<{ user: { id: string; email: string }; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    me: () => fetchApi<{ user: { id: string; email: string } }>('/auth/me'),
  },
  tenants: {
    list: () => fetchApi<{ tenants: any[] }>('/tenants'),
    get: (id: string) => fetchApi<{ tenant: any }>(`/tenants/${id}`),
    create: (name: string) =>
      fetchApi<{ tenant: any }>('/tenants', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    update: (id: string, data: any) =>
      fetchApi<{ tenant: any }>(`/tenants/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    getConfig: (id: string) => fetchApi<{ config: any }>(`/tenants/${id}/config`),
    updateConfig: (id: string, data: any) =>
      fetchApi<{ config: any }>(`/tenants/${id}/config`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },
  sessions: {
    list: () => fetchApi<{ sessions: any[] }>('/sessions'),
    get: (id: string) => fetchApi<{ session: any }>(`/sessions/${id}`),
    create: (tenantId: string, sessionName: string) =>
      fetchApi<{ sessionId: string }>('/sessions', {
        method: 'POST',
        body: JSON.stringify({ tenantId, sessionName }),
      }),
    disconnect: (id: string) =>
      fetchApi<{ message: string }>(`/sessions/${id}/disconnect`, {
        method: 'POST',
      }),
    listByTenant: (tenantId: string) =>
      fetchApi<{ sessions: any[] }>(`/sessions/tenant/${tenantId}`),
  },
  contacts: {
    list: (params?: { tenantId?: string; search?: string }) => {
      const query = new URLSearchParams()
      if (params?.tenantId) query.set('tenantId', params.tenantId)
      if (params?.search) query.set('search', params.search)
      return fetchApi<{ contacts: any[] }>(`/contacts?${query}`)
    },
    messages: (contactId: string) =>
      fetchApi<{ messages: any[] }>(`/contacts/${contactId}/messages`),
  },
  messages: {
    list: (params?: { tenantId?: string; contactId?: string; limit?: number }) => {
      const query = new URLSearchParams()
      if (params?.tenantId) query.set('tenantId', params.tenantId)
      if (params?.contactId) query.set('contactId', params.contactId)
      if (params?.limit) query.set('limit', String(params.limit))
      return fetchApi<{ messages: any[] }>(`/messages?${query}`)
    },
  },
}
