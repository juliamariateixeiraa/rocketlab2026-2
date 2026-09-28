import { Plus, Search, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { useDebounce } from '../hooks/useDebounce'
import { genreLabel } from '../utils/format'

/** Atalhos de categoria; a lista completa de gêneros fica no filtro do catálogo. */
const QUICK_GENRES = ['Action', 'Horror', 'Comedy', 'Drama', 'Animation', 'Science Fiction']

/**
 * Barra superior: a busca vale para o app inteiro. Digitar em qualquer tela
 * leva ao catálogo com o termo aplicado; no catálogo, atualiza os resultados.
 */
export function TopBar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)

  const onCatalog = pathname === '/catalogo'
  const busca = onCatalog ? (params.get('busca') ?? '') : ''
  const genero = onCatalog ? (params.get('genero') ?? '') : ''

  const [input, setInput] = useState(busca)
  const debounced = useDebounce(input)

  function search(term: string) {
    const trimmed = term.trim()
    if (trimmed === busca || (!onCatalog && !trimmed)) return
    const next = new URLSearchParams(onCatalog ? params : undefined)
    if (trimmed) next.set('busca', trimmed)
    else next.delete('busca')
    next.delete('page')
    navigate(`/catalogo${next.size ? `?${next}` : ''}`, { replace: onCatalog })
  }

  // Busca enquanto digita, depois de uma pausa.
  useEffect(() => {
    search(debounced)
    // Só reage ao texto digitado; mudanças de URL são tratadas abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  // Mantém o campo em sincronia com a URL (voltar, limpar filtros, trocar de tela),
  // sem apagar um espaço no meio da digitação.
  useEffect(() => setInput((current) => (current.trim() === busca ? current : busca)), [busca])

  // Atalho "/" para focar a busca de qualquer lugar.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const typing = (event.target as HTMLElement).closest('input, textarea, select')
      if (event.key === '/' && !typing) {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    search(input)
  }

  function genreUrl(name: string) {
    const next = new URLSearchParams(onCatalog ? params : undefined)
    if (name) next.set('genero', name)
    else next.delete('genero')
    next.delete('page')
    return `/catalogo${next.size ? `?${next}` : ''}`
  }

  return (
    <header className="topbar">
      <form className="topbar__search" role="search" onSubmit={handleSubmit}>
        <Search size={18} className="topbar__search-icon" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          placeholder="Buscar filmes pelo título…"
          aria-label="Buscar filmes pelo título"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && setInput('')}
        />
        {input ? (
          <button type="button" className="topbar__clear" aria-label="Limpar busca" onClick={() => setInput('')}>
            <X size={16} />
          </button>
        ) : (
          <kbd className="topbar__kbd" aria-hidden>
            /
          </kbd>
        )}
      </form>

      <nav className="topbar__genres" aria-label="Categorias">
        <Link to={genreUrl('')} className={`pill ${onCatalog && !genero ? 'is-active' : ''}`}>
          Todos
        </Link>
        {QUICK_GENRES.map((name) => (
          <Link key={name} to={genreUrl(name)} className={`pill ${genero === name ? 'is-active' : ''}`}>
            {genreLabel(name)}
          </Link>
        ))}
      </nav>

      <Link to="/filmes/novo" className="btn btn--light topbar__add" viewTransition>
        <Plus size={18} strokeWidth={2.2} aria-hidden />
        <span>Novo filme</span>
      </Link>
    </header>
  )
}
