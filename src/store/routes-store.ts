import { create } from 'zustand'

import type { LumioRoute } from '@/types/lumio'

type RoutesState = {
  routes: LumioRoute[]
  addRoute: (route: LumioRoute) => void
  updateRoute: (id: string, patch: Partial<Omit<LumioRoute, 'id'>>) => void
  removeRoute: (id: string) => void
}

const DEFAULT_ROUTE: LumioRoute = {
  id: 'default',
  name: 'Home',
  path: '/',
  description: 'Home page',
}

export const useRoutesStore = create<RoutesState>((set) => ({
  routes: [DEFAULT_ROUTE],

  addRoute: (route) => {
    set((state) => ({ routes: [...state.routes, { ...route }] }))
  },

  updateRoute: (id, patch) => {
    set((state) => ({
      routes: state.routes.map((route) =>
        route.id === id ? { ...route, ...patch } : route,
      ),
    }))
  },

  removeRoute: (id) => {
    if (id === 'default') return
    set((state) => ({
      routes: state.routes.filter((route) => route.id !== id),
    }))
  },
}))
