import { createStore } from 'zustand'

const useStore = createStore((set) => ({
  // State
  locale: localStorage.getItem('site-locale') || 'pt-BR',
  theme: localStorage.getItem('site-theme') || 'dark',
  panelOpen: false,
  panelData: null,
  visMode: 'atomo', // atomo | arvore

  // Actions
  setLocale: (locale) => {
    localStorage.setItem('site-locale', locale)
    document.documentElement.setAttribute('lang', locale)
    set({ locale })
  },
  
  setTheme: (theme) => {
    localStorage.setItem('site-theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
    set({ theme })
  },

  togglePanel: (open, data = null) => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    set({ panelOpen: open, panelData: data })
  },

  setVisMode: (mode) => {
    set({ visMode: mode })
  }
}))

export default useStore
