import { ArrowLeft, Pencil, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../api/client'
import { deleteMovie, getMovie } from '../api/movies'
import type { MovieDetail } from '../api/types'
import { useAmbientImage } from '../hooks/useAmbientImage'
import { ErrorMessage, Spinner } from '../components/Feedback'
import { Poster } from '../components/Poster'
import { ReviewForm, ReviewList } from '../components/Reviews'
import { Stars } from '../components/Stars'
import { useAsync } from '../hooks/useAsync'
import { formatDate, formatRuntime, formatStars, genreLabel, plural, toStars } from '../utils/format'
import { NotFoundPage } from './NotFoundPage'

const CAST_PREVIEW = 12

function PeopleList({ label, names }: { label: string; names: string[] }) {
  const [expanded, setExpanded] = useState(false)
  if (names.length === 0) return null

  const shown = expanded ? names : names.slice(0, CAST_PREVIEW)
  return (
    <div className="people">
      <h3>{label}</h3>
      <ul className="chips">
        {shown.map((name) => (
          <li key={name} className="chip">
            {name}
          </li>
        ))}
        {names.length > CAST_PREVIEW && (
          <li>
            <button type="button" className="chip chip--button" onClick={() => setExpanded(!expanded)}>
              {expanded ? 'Mostrar menos' : `+${names.length - CAST_PREVIEW}`}
            </button>
          </li>
        )}
      </ul>
    </div>
  )
}

function RatingBox({ movie }: { movie: MovieDetail }) {
  if (movie.nota_media === null) {
    return (
      <div className="rating-box">
        <Star size={28} className="muted" aria-hidden />
        <span className="muted">Sem avaliações ainda</span>
      </div>
    )
  }
  return (
    <div className="rating-box">
      <span className="rating-box__value">{formatStars(movie.nota_media)}</span>
      <div>
        <Stars value={toStars(movie.nota_media)} size="lg" />
        <span className="muted">média de {plural(movie.qtd_avaliacoes, 'avaliação', 'avaliações')}</span>
      </div>
    </div>
  )
}

export function MovieDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string>()
  const { data: movie, error, loading, reload } = useAsync((signal) => getMovie(id, signal), [id])

  useAmbientImage(movie?.url_backdrop ?? movie?.url_poster)

  if (error instanceof ApiError && error.status === 404) return <NotFoundPage />
  if (error) return <ErrorMessage error={error} onRetry={reload} />
  if (!movie || (loading && movie.sk_movie_id !== id)) return <Spinner />

  const { titulo } = movie

  async function handleDelete() {
    if (!window.confirm(`Excluir "${titulo}"? As avaliações dele também serão apagadas.`)) return
    setDeleting(true)
    try {
      await deleteMovie(id)
      navigate('/catalogo', { state: { flash: `"${titulo}" foi excluído.` } })
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Erro ao excluir.')
      setDeleting(false)
    }
  }

  const facts = [
    movie.ano_lancamento,
    formatRuntime(movie.duracao_minutos),
    movie.status_filme !== 'Lançado' ? movie.status_filme : null,
  ].filter(Boolean)

  return (
    <article className="detail page-enter">
      <section className="detail__hero">
        {(movie.url_backdrop || movie.url_poster) && (
          <div
            className={`detail__hero-bg ${movie.url_backdrop ? '' : 'detail__hero-bg--blur'}`}
            style={{ backgroundImage: `url(${movie.url_backdrop ?? movie.url_poster})` }}
            aria-hidden
          />
        )}
        <button type="button" className="icon-btn icon-btn--glass detail__back" aria-label="Voltar" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>

        <div className="detail__hero-inner">
          <Poster src={movie.url_poster} title={titulo} className="detail__poster" />

          <div className="detail__heading">
            {movie.generos.length > 0 && (
              <ul className="hero__genres">
                {movie.generos.map((g) => (
                  <li key={g}>
                    <Link to={`/catalogo?genero=${encodeURIComponent(g)}`} className="glass-chip glass-chip--subtle">
                      {genreLabel(g)}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <h1 className="detail__title">{titulo}</h1>
            <p className="detail__facts">
              {facts.join(' · ')}
              {movie.diretores.length > 0 && (
                <>
                  {facts.length > 0 && ' · '}
                  Direção de <strong>{movie.diretores.join(', ')}</strong>
                </>
              )}
            </p>
            <div className="detail__actions">
              <Link to={`/filmes/${id}/editar`} className="btn btn--light" viewTransition>
                <Pencil size={16} aria-hidden /> Editar
              </Link>
              <button type="button" className="btn btn--danger" onClick={handleDelete} disabled={deleting}>
                <Trash2 size={16} aria-hidden /> {deleting ? 'Excluindo…' : 'Excluir'}
              </button>
            </div>
            {deleteError && <p className="form-error">{deleteError}</p>}
          </div>
        </div>
      </section>

      <div className="detail__body">
        <div className="detail__main">
          <section>
            <h2>Sinopse</h2>
            <p className="detail__synopsis">{movie.sinopse || 'Sem sinopse cadastrada.'}</p>
            {movie.data_lancamento && (
              <p className="muted">Lançamento: {formatDate(movie.data_lancamento)}</p>
            )}
          </section>

          <section className="detail__people">
            <PeopleList label="Elenco" names={movie.elenco} />
            <PeopleList label="Roteiro" names={movie.roteiristas} />
            <PeopleList label="Produtoras" names={movie.produtoras} />
          </section>

          <section className="detail__reviews" id="avaliacoes">
            <h2>Avaliações ({movie.qtd_avaliacoes})</h2>
            <ReviewList reviews={movie.avaliacoes} />
          </section>
        </div>

        <aside className="detail__aside">
          <RatingBox movie={movie} />
          <ReviewForm movieId={id} onCreated={reload} />
        </aside>
      </div>
    </article>
  )
}
