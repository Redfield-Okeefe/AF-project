import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './styles/global.css'
import './styles/dashboard.css'
import './styles/tema-putih.css'
import './styles/owner-portal.css'
import './styles/owner-v7.css'
import './styles/owner-v8.css'
import './styles/theme-system.css'
import './styles/ui-refinement-2026.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)