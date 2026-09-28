import { useSearchParams } from 'react-router'
import { listReviews } from '../api/movies'
import { EmptyState, ErrorMessage, Spinner } from '../components/Feedback'
import { Pagination } from '../components/Pagination'
import { ReviewFeed } from '../components/ReviewFeed'
import { useAsync } from '../hooks/useAsync'
import { plural } from '../utils/format'

const PAGE_SIZE = 20

/** Todas as avaliações do sistema, das mais recentes para as mais antigas. */
export function ReviewsPage() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const { data, error, loading, reload } = useAsync((signal) => listReviews(page, PAGE_SIZE, signal), [page])

  function goToPage(next: number) {
    setParams(next > 1 ? { page: String(next) } : {})
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="page-enter">
      <header className="page-header">
        <div>
          <p className="eyebrow">Moderação</p>
          <h1>Avaliações</h1>
          <p className="muted">
            {data ? plural(data.total, 'avaliação publicada', 'avaliações publicadas') : 'Carregando…'}
          </p>
        </div>
      </header>

      {error && <ErrorMessage error={error} onRetry={reload} />}
      {!error && !data && <Spinner />}
      {data && data.items.length === 0 && <EmptyState title="Nenhuma avaliação ainda" />}
      {data && data.items.length > 0 && (
        <div className={loading ? 'is-loading' : ''}>
          <ReviewFeed reviews={data.items} />
          <Pagination page={data.page} pages={data.pages} onChange={goToPage} />
        </div>
      )}
    </div>
  )
}
