import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Always open on the Hero: don't restore the old scroll position or jump to a #section left in the address
history.scrollRestoration = 'manual'
if (location.hash) history.replaceState(null, '', location.pathname + location.search)
const toTop = () => window.scrollTo(0, 0)
toTop()
// Edge can still restore the old position once the content exists (reopened/sleeping tabs, Back button)
window.addEventListener('load', toTop)
window.addEventListener('pageshow', (e) => e.persisted && toTop())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
