import { useState, type FormEvent } from 'react'
import { addReview } from '../api/movies'
import type { Review } from '../api/types'
import { formatRelative, toNota, toStars } from '../utils/format'
import { Stars, StarInput } from './Stars'

export function ReviewForm({ movieId, onCreated }: { movieId: string; onCreated: () => void }) {
  const [nome, setNome] = useState('')
  const [stars, setStars] = useState(0)
  const [comentario, setComentario] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!stars) {
      setError('Escolha de 1 a 5 estrelas.')
      return
    }
    setSaving(true)
    setError(undefined)
    try {
      await addReview(movieId, { nome, nota: toNota(stars), comentario })
      setNome('')
      setStars(0)
      setComentario('')
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar a avaliação.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="surface review-form" onSubmit={handleSubmit}>
      <h3>Avaliar este filme</h3>
      <StarInput value={stars} onChange={setStars} disabled={saving} />
      <label className="field">
        <span>Seu nome</span>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={120}
          required
          disabled={saving}
        />
      </label>
      <label className="field">
        <span>Resenha</span>
        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          maxLength={4000}
          rows={4}
          placeholder="O que você achou?"
          required
          disabled={saving}
        />
      </label>
      {error && <p className="form-error">{error}</p>}
      <button type="submit" className="btn btn--accent" disabled={saving}>
        {saving ? 'Enviando…' : 'Publicar avaliação'}
      </button>
    </form>
  )
}

export function ReviewList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return <p className="muted">Ninguém avaliou este filme ainda. Seja a primeira pessoa!</p>
  }

  return (
    <ul className="review-list">
      {reviews.map((review) => (
        <li key={review.sk_movie_review_id} className="review">
          <div className="review__avatar" aria-hidden>
            {review.nome.trim().charAt(0).toUpperCase()}
          </div>
          <div className="review__body">
            <div className="review__header">
              <strong>{review.nome}</strong>
              <Stars value={toStars(review.nota)} size="sm" />
              <time className="muted" dateTime={review.created_at}>
                {formatRelative(review.created_at)}
              </time>
            </div>
            <p>{review.comentario}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
