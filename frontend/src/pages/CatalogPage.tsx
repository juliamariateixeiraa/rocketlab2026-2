import { X } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { listMovies } from '../api/movies'
import type { MovieSort } from '../api/types'
import { EmptyState, ErrorMessage, Spinner } from '../components/Feedback'
import { MovieGrid } from '../components/MovieGrid'
import { Pagination } from '../components/Pagination'
import { useAsync } from '../hooks/useAsync'
import { useFlash } from '../hooks/useFlash'
import { useGenres } from '../hooks/useGenres'
import { genreLabel, plural } from '../utils/format'

const PAGE_SIZE = 24

const SORT_OPTIONS: { value: MovieSort; label: string }[] = [
  { value: 'popularidade', label: 'Mais populares' },
  { value: 'nota', label: 'Melhor avaliados' },
  { value: 'mais_recentes', label: 'Mais recentes' },
  { value: 'mais_antigos', label: 'Mais antigos' },
  { value: 'titulo', label: 'Título (A–Z)' },
]

/** Catálogo completo. A busca por título fica na barra superior (TopBar). */
export function CatalogPage() {
  const [params, setParams] = useSearchParams()
  const flash = useFlash()
  const busca = params.get('busca') ?? ''
  const genero = params.get('genero') ?? ''
  const ordenar = (params.get('ordenar') as MovieSort | null) ?? 'popularidade'
  const page = Math.max(1, Number(params.get('page')) || 1)
  const genres = useGenres()

  /** Atualiza a URL; qualquer mudança de filtro volta para a página 1. */
  function update(changes: Record<string, string | number>) {
    setParams((current) => {
      const next = new URLSearchParams(current)
      if (!('page' in changes)) next.delete('page')
      for (const [key, value] of Object.entries(changes)) {
        if (value === '' || value === 1 || (key === 'ordenar' && value === 'popularidade')) {
          next.delete(key)
        } else {
          next.set(key, String(value))
        }
      }
      return next
    })
  }

  const { data, error, loading, reload } = useAsync(
    (signal) => listMovies({ busca, genero, ordenar, page, page_size: PAGE_SIZE }, signal),
    [busca, genero, ordenar, page],
  )

  function goToPage(next: number) {
    update({ page: next })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleDeleted(title: string) {
    flash(`"${title}" foi excluído.`)
    reload()
  }

  const hasFilters = Boolean(busca || genero)
  const title = busca ? `Resultados para “${busca}”` : genero ? genreLabel(genero) : 'Catálogo'

  return (
    <div className="page-enter">
      <header className="page-header">
        <div>
          <p className="eyebrow">Explorar filmes</p>
          <h1>{title}</h1>
          <p className="muted">
            {data ? plural(data.total, 'filme encontrado', 'filmes encontrados') : 'Carregando…'}
          </p>
        </div>

        <div className="toolbar">
          <label className="select">
            <span className="sr-only">Gênero</span>
            <select value={genero} onChange={(e) => update({ genero: e.target.value })}>
              <option value="">Todos os gêneros</option>
              {genres.map((g) => (
                <option key={g.sk_genre_id} value={g.nome_genero}>
                  {genreLabel(g.nome_genero)}
                </option>
              ))}
            </select>
          </label>
          <label className="select">
            <span className="sr-only">Ordenar por</span>
            <select value={ordenar} onChange={(e) => update({ ordenar: e.target.value })}>
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          {hasFilters && (
            <button type="button" className="btn btn--glass btn--small" onClick={() => update({ busca: '', genero: '' })}>
              <X size={16} aria-hidden /> Limpar filtros
            </button>
          )}
        </div>
      </header>

      {error && <ErrorMessage error={error} onRetry={reload} />}
      {!error && !data && loading && <Spinner />}

      {data && data.items.length === 0 && (
        <EmptyState title="Nenhum filme encontrado">
          <p className="muted">Tente outro título ou remova os filtros.</p>
        </EmptyState>
      )}

      {data && data.items.length > 0 && (
        <>
          <MovieGrid movies={data.items} loading={loading} onDeleted={handleDeleted} />
          <Pagination page={data.page} pages={data.pages} onChange={goToPage} />
        </>
      )}
    </div>
  )
}
