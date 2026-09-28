import { ArrowRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { listMovies, listReviews } from '../api/movies'
import type { MovieListItem, MovieSort } from '../api/types'
import { useAmbientImage } from '../hooks/useAmbientImage'
import { ErrorMessage, Spinner } from '../components/Feedback'
import { FeaturedHero } from '../components/FeaturedHero'
import { MovieGrid } from '../components/MovieGrid'
import { PosterCarousel } from '../components/PosterCarousel'
import { ReviewFeed } from '../components/ReviewFeed'
import { StatsStrip } from '../components/StatsStrip'
import { useAsync } from '../hooks/useAsync'
import { useFlash } from '../hooks/useFlash'

const EXPLORE_TABS: { value: MovieSort; label: string }[] = [
  { value: 'popularidade', label: 'Populares' },
  { value: 'mais_recentes', label: 'Lançamentos' },
  { value: 'nota', label: 'Melhor avaliados' },
]

/** Remove filmes sem pôster e títulos repetidos (a base tem cadastros duplicados). */
function uniqueWithPoster(movies: MovieListItem[]) {
  const seen = new Set<string>()
  return movies.filter((m) => {
    const key = `${m.titulo}|${m.ano_lancamento}`
    if (!m.url_poster || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function HomePage() {
  const flash = useFlash()
  const [exploreSort, setExploreSort] = useState<MovieSort>('popularidade')
  const [featured, setFeatured] = useState<MovieListItem>()
  const [version, setVersion] = useState(0)

  useAmbientImage(featured?.url_backdrop)

  const trending = useAsync(
    (signal) => listMovies({ ordenar: 'popularidade', page_size: 15 }, signal),
    [version],
  )
  const topRated = useAsync(
    (signal) => listMovies({ ordenar: 'nota', min_avaliacoes: 3, page_size: 20 }, signal),
    [version],
  )
  const explore = useAsync(
    (signal) => listMovies({ ordenar: exploreSort, page_size: 12 }, signal),
    [exploreSort, version],
  )
  const recentReviews = useAsync((signal) => listReviews(1, 4, signal), [version])

  const heroMovies = useMemo(
    () => (trending.data?.items ?? []).filter((m) => m.url_backdrop).slice(0, 5),
    [trending.data],
  )
  const carouselMovies = useMemo(() => uniqueWithPoster(topRated.data?.items ?? []).slice(0, 9), [topRated.data])

  function handleDeleted(title: string) {
    flash(`"${title}" foi excluído.`)
    setVersion((v) => v + 1)
  }

  return (
    <div className="home page-enter">
      <header className="page-header">
        <div>
          <p className="eyebrow">Painel do catálogo</p>
          <h1>O que vamos assistir hoje?</h1>
        </div>
        <StatsStrip refreshKey={version} />
      </header>

      {trending.error ? (
        <ErrorMessage error={trending.error} onRetry={() => setVersion((v) => v + 1)} />
      ) : heroMovies.length > 0 ? (
        <FeaturedHero movies={heroMovies} onChange={setFeatured} />
      ) : (
        <div className="hero hero--placeholder">
          <Spinner />
        </div>
      )}

      <div className="home__row">
        <section className="surface">
          <div className="section-header">
            <h2>Mais bem avaliados</h2>
            <Link to="/catalogo?ordenar=nota" className="link-arrow">
              Ver ranking <ArrowRight size={16} />
            </Link>
          </div>
          {carouselMovies.length > 0 ? <PosterCarousel movies={carouselMovies} /> : <Spinner />}
        </section>

        <section className="surface">
          <div className="section-header">
            <h2>Avaliações recentes</h2>
            <Link to="/avaliacoes" className="link-arrow">
              Ver todas <ArrowRight size={16} />
            </Link>
          </div>
          {recentReviews.data ? <ReviewFeed reviews={recentReviews.data.items} compact /> : <Spinner />}
        </section>
      </div>

      <section>
        <div className="section-header">
          <h2>Explorar filmes</h2>
          <div className="tabs" role="tablist" aria-label="Ordenar filmes">
            {EXPLORE_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={exploreSort === tab.value}
                className={`pill ${exploreSort === tab.value ? 'is-active' : ''}`}
                onClick={() => setExploreSort(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        {explore.error && <ErrorMessage error={explore.error} onRetry={() => setVersion((v) => v + 1)} />}
        {explore.data ? (
          <MovieGrid movies={explore.data.items} loading={explore.loading} onDeleted={handleDeleted} />
        ) : (
          !explore.error && <Spinner />
        )}
        <div className="section-footer">
          <Link to={`/catalogo${exploreSort === 'popularidade' ? '' : `?ordenar=${exploreSort}`}`} className="btn btn--glass">
            Ver catálogo completo <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  )
}
