import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { useEffect, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router'
import type { MovieListItem } from '../api/types'
import { formatStars, plural } from '../utils/format'
import { Poster } from './Poster'

const ROTATE_MS = 5000
const VISIBLE_SIDE = 2

interface PosterCarouselProps {
  movies: MovieListItem[]
}

/**
 * Carrossel em perspectiva: o filme selecionado fica no centro, maior, e os
 * vizinhos aparecem parcialmente atrás dele.
 */
export function PosterCarousel({ movies }: PosterCarouselProps) {
  const navigate = useNavigate()
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = movies.length
  const current = movies[active]

  useEffect(() => {
    if (paused || count < 2) return
    const timer = setTimeout(() => setActive((i) => (i + 1) % count), ROTATE_MS)
    return () => clearTimeout(timer)
  }, [active, paused, count])

  const go = (step: number) => setActive((i) => (i + step + count) % count)

  function handleKey(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft') go(-1)
    if (event.key === 'ArrowRight') go(1)
  }

  if (!current) return null

  return (
    <div
      className="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onKeyDown={handleKey}
    >
      {/* Fundo desfocado com o pôster em foco, como uma luz ambiente. */}
      <div className="carousel__glow" style={{ backgroundImage: `url(${current.url_poster})` }} aria-hidden />

      <div className="carousel__stage">
        {movies.map((movie, i) => {
          // Distância circular até o item ativo (-2, -1, 0, 1, 2…).
          let offset = i - active
          if (offset > count / 2) offset -= count
          if (offset < -count / 2) offset += count
          const distance = Math.abs(offset)
          const hidden = distance > VISIBLE_SIDE

          return (
            <button
              key={movie.sk_movie_id}
              type="button"
              className={`carousel__item ${offset === 0 ? 'is-active' : ''}`}
              style={{
                transform: `translateX(${offset * 58}%) scale(${1 - distance * 0.16})`,
                zIndex: 10 - distance,
                opacity: hidden ? 0 : 1 - distance * 0.18,
                filter: offset === 0 ? undefined : `brightness(${0.75 - distance * 0.12})`,
              }}
              tabIndex={hidden ? -1 : 0}
              aria-hidden={hidden}
              aria-label={offset === 0 ? `Abrir ${movie.titulo}` : `Mostrar ${movie.titulo}`}
              onClick={() => (offset === 0 ? navigate(`/filmes/${movie.sk_movie_id}`, { viewTransition: true }) : setActive(i))}
            >
              <Poster src={movie.url_poster} title={movie.titulo} />
            </button>
          )
        })}
      </div>

      <div className="carousel__caption" key={current.sk_movie_id} aria-live="polite">
        <strong>{current.titulo}</strong>
        <span>
          {current.ano_lancamento}
          {current.nota_media !== null && (
            <>
              {' · '}
              <Star size={13} fill="currentColor" strokeWidth={0} aria-hidden className="accent" />{' '}
              {formatStars(current.nota_media)} · {plural(current.qtd_avaliacoes, 'avaliação', 'avaliações')}
            </>
          )}
        </span>
      </div>

      <div className="carousel__nav">
        <button type="button" className="icon-btn icon-btn--glass" aria-label="Anterior" onClick={() => go(-1)}>
          <ChevronLeft size={20} />
        </button>
        <button type="button" className="icon-btn icon-btn--glass" aria-label="Próximo" onClick={() => go(1)}>
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  )
}
