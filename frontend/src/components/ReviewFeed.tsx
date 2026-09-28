import { Link } from 'react-router'
import type { ReviewFeedItem } from '../api/types'
import { formatRelative, toStars } from '../utils/format'
import { Poster } from './Poster'
import { Stars } from './Stars'

/** Avaliações de vários filmes, cada uma com o pôster e o link do filme. */
export function ReviewFeed({ reviews, compact = false }: { reviews: ReviewFeedItem[]; compact?: boolean }) {
  return (
    <ul className={`review-feed ${compact ? 'review-feed--compact' : ''}`}>
      {reviews.map((review) => (
        <li key={review.sk_movie_review_id}>
          <Link to={`/filmes/${review.sk_movie_id}`} className="review-feed__item" viewTransition>
            <Poster src={review.url_poster} title={review.titulo_filme} className="review-feed__poster" />
            <div className="review-feed__body">
              <strong className="review-feed__movie">{review.titulo_filme}</strong>
              <div className="review-feed__meta">
                <Stars value={toStars(review.nota)} size="sm" />
                <span>{review.nome}</span>
                {!compact && <time dateTime={review.created_at}>{formatRelative(review.created_at)}</time>}
              </div>
              <p className="review-feed__text">{review.comentario}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
