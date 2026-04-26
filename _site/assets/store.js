import { createStore } from 'zustand'
const safeStorage = {
getItem: (key) => {
try {
return window.localStorage.getItem(key)
} catch {
return null
}
},
setItem: (key, value) => {
try {
window.localStorage.setItem(key, value)
} catch {
}
},
}
const defaultLocale = document.body?.dataset.defaultLocale || document.documentElement.lang || 'pt-BR'
const defaultTheme = document.documentElement.dataset.theme || 'dark'
const useStore = createStore((set) => ({
locale: safeStorage.getItem('site-locale') || defaultLocale,
theme: safeStorage.getItem('site-theme') || defaultTheme,
setLocale: (locale) => {
safeStorage.setItem('site-locale', locale)
document.documentElement.setAttribute('lang', locale)
set({ locale })
},
setTheme: (theme) => {
safeStorage.setItem('site-theme', theme)
document.documentElement.setAttribute('data-theme', theme)
set({ theme })
},
}))
export default useStore