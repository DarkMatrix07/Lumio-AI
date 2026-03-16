import { create } from 'zustand'

export type PageInfo = { id: string; name: string; path: string }

type PagesState = {
  pages: PageInfo[]
  setPages: (pages: PageInfo[]) => void
}

export const usePagesStore = create<PagesState>((set) => ({
  pages: [{ id: 'default', name: 'Home', path: '/' }],
  setPages: (pages) => set({ pages }),
}))
