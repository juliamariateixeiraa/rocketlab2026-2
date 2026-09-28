import { Star } from 'lucide-react'
import { Link } from 'react-router'
import type { MovieListItem } from '../api/types'
import { formatStars, genreLabel } from '../utils/format'
import { MovieActionsMenu } from './MovieActionsMenu'
import { Poster } from './Poster'

interface MovieCardProps {
  movie: MovieListItem
  onDeleted: (title: string) => void
}

export function MovieCard({ movie, onDeleted }: MovieCardProps) {
  const genre = movie.generos[0]
  const meta = [movie.ano_lancamento, genre && genreLabel(genre)].filter(Boolean).join(' · ')

  return (
    <article className="movie-card">
      <div className="movie-card__media">
        <Poster src={movie.url_poster} title={movie.titulo} />
      </div>

      <div className="movie-card__overlay">
        {movie.nota_media !== null && (
          <span className="rating-badge" title={`${movie.qtd_avaliacoes} avaliações`}>
            <Star size={12} fill="currentColor" strokeWidth={0} aria-hidden />
            {formatStars(movie.nota_media)}
          </span>
        )}
        <h3 className="movie-card__title">
          {/* O link cobre o card todo; o menu fica por cima dele. */}
          <Link to={`/filmes/${movie.sk_movie_id}`} className="movie-card__link" viewTransition>
            {movie.titulo}
          </Link>
        </h3>
        <p className="movie-card__meta">{meta || '—'}</p>
      </div>

      <MovieActionsMenu movieId={movie.sk_movie_id} title={movie.titulo} onDeleted={onDeleted} />
    </article>
  )
}
