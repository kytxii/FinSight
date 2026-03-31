import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

document.documentElement.classList.add('dark')

function applyZoom() {
  const w = window.innerWidth;
  document.documentElement.style.zoom = w >= 1024 ? w / 1920 : '';
}
applyZoom();
window.addEventListener('resize', applyZoom);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
