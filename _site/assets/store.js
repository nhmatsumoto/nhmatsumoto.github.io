import { createStore } from 'zustand'
const useStore = createStore((set) => ({
locale: localStorage.getItem('site-locale') || 'pt-BR',
theme: localStorage.getItem('site-theme') || 'dark',
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
}))
export default useStore