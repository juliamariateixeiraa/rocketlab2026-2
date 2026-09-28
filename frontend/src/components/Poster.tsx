import { useState } from 'react'

interface PosterProps {
  src: string | null
  title: string
  className?: string
}

/** Pôster do filme com um substituto quando a imagem falta ou não carrega. */
export function Poster({ src, title, className = '' }: PosterProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  if (!src || failedSrc === src) {
    return (
      <div className={`poster poster--empty ${className}`} aria-label={`Sem pôster: ${title}`}>
        <span aria-hidden>🎬</span>
        <span className="poster__title">{title}</span>
      </div>
    )
  }

  return (
    <img
      className={`poster ${className}`}
      src={src}
      alt={`Pôster de ${title}`}
      loading="lazy"
      onError={() => setFailedSrc(src)}
    />
  )
}
