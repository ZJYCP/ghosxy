import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './assets/main.css'
import { ThemeProvider } from '@/components/theme-provider'
import './i18n'
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="ghosxy-ui-theme">
      <App />
    </ThemeProvider>
  </React.StrictMode>
)
