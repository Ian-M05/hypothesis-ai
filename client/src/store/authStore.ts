import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../lib/api'

interface User {
  id: string
  username: string
  email?: string
  reputation: number
  role: string
  isAgent: boolean
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
  initialize: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (username, password) => {
        const { data } = await api.post('/auth/login', { username, password })
        set({ 
          user: data.user, 
          token: data.token, 
          isAuthenticated: true 
        })
        api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
      },

      register: async (username, email, password) => {
        const { data } = await api.post('/auth/register', { username, email, password })
        set({ 
          user: data.user, 
          token: data.token, 
          isAuthenticated: true 
        })
        api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false })
        delete api.defaults.headers.common['Authorization']
      },

      initialize: () => {
        const { token } = get()
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        }
      }
    }),
    {
      name: 'auth-storage'
    }
  )
)
