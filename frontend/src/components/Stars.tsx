import { useState } from 'react'

interface StarsProps {
  /** Valor de 0 a 5; aceita frações (ex.: 3.7). */
  value: number
  size?: 'sm' | 'md' | 'lg'
}

/** Exibe estrelas preenchidas proporcionalmente ao valor. */
export function Stars({ value, size = 'md' }: StarsProps) {
  const percent = Math.max(0, Math.min(5, value)) * 20
  return (
    <span className={`stars stars--${size}`} role="img" aria-label={`${value.toFixed(1)} de 5 estrelas`}>
      <span className="stars__empty" aria-hidden>
        ★★★★★
      </span>
      <span className="stars__full" style={{ width: `${percent}%` }} aria-hidden>
        ★★★★★
      </span>
    </span>
  )
}

interface StarInputProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}

const LABELS = ['', 'Péssimo', 'Ruim', 'Ok', 'Bom', 'Excelente']

/** Seletor de 1 a 5 estrelas com pré-visualização ao passar o mouse. */
export function StarInput({ value, onChange, disabled }: StarInputProps) {
  const [hover, setHover] = useState(0)
  const shown = hover || value

  return (
    <div className="star-input" onMouseLeave={() => setHover(0)}>
      <div role="radiogroup" aria-label="Nota">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
            className={star <= shown ? 'is-on' : ''}
            disabled={disabled}
            onMouseEnter={() => setHover(star)}
            onClick={() => onChange(star)}
          >
            ★
          </button>
        ))}
      </div>
      <span className="star-input__label">{LABELS[shown] ?? ''}</span>
    </div>
  )
}
