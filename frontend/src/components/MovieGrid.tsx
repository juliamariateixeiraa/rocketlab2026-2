import type { MovieListItem } from '../api/types'
import { MovieCard } from './MovieCard'

interface MovieGridProps {
  movies: MovieListItem[]
  loading?: boolean
  onDeleted: (title: string) => void
}

export function MovieGrid({ movies, loading = false, onDeleted }: MovieGridProps) {
  return (
    <div className={`movie-grid ${loading ? 'is-loading' : ''}`} aria-busy={loading}>
      {movies.map((movie) => (
        <MovieCard key={movie.sk_movie_id} movie={movie} onDeleted={onDeleted} />
      ))}
    </div>
  )
}
