import { ArrowRight, ChevronLeft, ChevronRight, Flame, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getMovie } from '../api/movies'
import type { MovieListItem } from '../api/types'
import { useAsync } from '../hooks/useAsync'
import { formatStars, genreLabel } from '../utils/format'

const ROTATE_MS = 8000

interface FeaturedHeroProps {
  movies: MovieListItem[]
  /** Avisa qual filme está em destaque (usado para o fundo da página). */
  onChange?: (movie: MovieListItem) => void
}

/** Filme em destaque, com troca automática entre os mais populares. */
export function FeaturedHero({ movies, onChange }: FeaturedHeroProps) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const movie = movies[index]

  // O item da lista não traz direção nem sinopse; busca o detalhe do destaque atual.
  const { data: detail } = useAsync((signal) => getMovie(movie.sk_movie_id, signal), [movie.sk_movie_id])
  const current = detail?.sk_movie_id === movie.sk_movie_id ? detail : undefined

  useEffect(() => onChange?.(movie), [movie, onChange])

  useEffect(() => {
    if (paused || movies.length < 2) return
    const timer = setTimeout(() => setIndex((i) => (i + 1) % movies.length), ROTATE_MS)
    return () => clearTimeout(timer)
  }, [index, paused, movies.length])

  const go = (step: number) => setIndex((i) => (i + step + movies.length) % movies.length)
  const genres = movie.generos.slice(0, 2)

  return (
    <section
      className="hero"
      aria-roledescription="carrossel"
      aria-label="Filmes em destaque"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {movies.map((m, i) => (
        <div
          key={m.sk_movie_id}
          className={`hero__image ${i === index ? 'is-active' : ''}`}
          style={{ backgroundImage: `url(${m.url_backdrop})` }}
          aria-hidden
        />
      ))}

      <div className="hero__content" key={movie.sk_movie_id}>
        <span className="glass-chip">
          <Flame size={14} aria-hidden /> Em alta
        </span>

        {genres.length > 0 && (
          <ul className="hero__genres">
            {genres.map((g) => (
              <li key={g} className="glass-chip glass-chip--subtle">
                {genreLabel(g)}
              </li>
            ))}
          </ul>
        )}

        <h2 className="hero__title">{movie.titulo}</h2>

        <p className="hero__meta">
          {movie.ano_lancamento && <span>{movie.ano_lancamento}</span>}
          {current && current.diretores.length > 0 && <span>Direção de {current.diretores[0]}</span>}
          {movie.nota_media !== null && (
            <span className="hero__rating">
              <Star size={14} fill="currentColor" strokeWidth={0} aria-hidden />
              {formatStars(movie.nota_media)}
              <small>({movie.qtd_avaliacoes})</small>
            </span>
          )}
        </p>

        <p className="hero__synopsis">{current?.sinopse ?? ' '}</p>

        <Link to={`/filmes/${movie.sk_movie_id}`} className="btn btn--light" viewTransition>
          Ver detalhes <ArrowRight size={18} aria-hidden />
        </Link>
      </div>

      {movies.length > 1 && (
        <div className="hero__controls">
          <div className="hero__dots" role="tablist" aria-label="Escolher destaque">
            {movies.map((m, i) => (
              <button
                key={m.sk_movie_id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={m.titulo}
                className={i === index ? 'is-active' : ''}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
          <button type="button" className="icon-btn icon-btn--glass" aria-label="Destaque anterior" onClick={() => go(-1)}>
            <ChevronLeft size={20} />
          </button>
          <button type="button" className="icon-btn icon-btn--glass" aria-label="Próximo destaque" onClick={() => go(1)}>
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </section>
  )
}
