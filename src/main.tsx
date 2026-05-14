import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

window.addEventListener('error', (e) => console.error('Global error:', e.error || e.message))
window.addEventListener('unhandledrejection', (e) => console.error('Unhandled rejection:', e.reason))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
