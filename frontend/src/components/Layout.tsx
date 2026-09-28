import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router'
import { AmbientProvider } from './Ambient'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

/** Mensagem passada entre telas via `navigate(url, { state: { flash } })`. */
function Flash() {
  const location = useLocation()
  const navigate = useNavigate()
  const [message, setMessage] = useState<string>()
  const [shownKey, setShownKey] = useState<string>()
  const incoming = (location.state as { flash?: string } | null)?.flash

  // Guarda a mensagem durante a renderização (uma vez por navegação).
  if (incoming && location.key !== shownKey) {
    setShownKey(location.key)
    setMessage(incoming)
  }

  useEffect(() => {
    if (!incoming) return
    // Limpa o state do histórico para a mensagem não voltar ao recarregar a página.
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [incoming, location.pathname, location.search, navigate])

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(undefined), 4000)
    return () => clearTimeout(timer)
  }, [message])

  if (!message) return null
  return (
    <div className="flash" role="status">
      {message}
      <button type="button" aria-label="Fechar" onClick={() => setMessage(undefined)}>
        <X size={16} />
      </button>
    </div>
  )
}

export function Layout() {
  return (
    <AmbientProvider>
      <Sidebar />
      <div className="shell">
        <div className="panel">
          <TopBar />
          <main className="panel__content">
            <Outlet />
          </main>
        </div>
        <footer className="footer">Rocket Filmes · Rocket Lab 2026</footer>
      </div>
      <Flash />
      <ScrollRestoration />
    </AmbientProvider>
  )
}
