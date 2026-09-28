import { useState, type ReactNode } from 'react'
import { AmbientContext } from '../hooks/useAmbientImage'

/**
 * Imagem de ambientação: o fundo da página mostra, bem desfocada e escura,
 * a arte do filme em destaque na tela atual.
 */
export function AmbientProvider({ children }: { children: ReactNode }) {
  const [url, setUrl] = useState<string | null>(null)

  return (
    <AmbientContext.Provider value={setUrl}>
      <div className="ambient" aria-hidden>
        {/* A `key` recria a camada para a troca de imagem fazer fade-in. */}
        {url && <div key={url} className="ambient__image" style={{ backgroundImage: `url(${url})` }} />}
      </div>
      {children}
    </AmbientContext.Provider>
  )
}
