import { createContext, useContext, useEffect } from 'react'

/** Define a imagem de fundo da página (ver components/Ambient.tsx). */
export const AmbientContext = createContext<(url: string | null) => void>(() => {})

/** Usa a imagem como fundo desfocado enquanto a tela estiver montada. */
export function useAmbientImage(url: string | null | undefined) {
  const setUrl = useContext(AmbientContext)
  useEffect(() => {
    setUrl(url ?? null)
  }, [url, setUrl])
  useEffect(() => () => setUrl(null), [setUrl])
}
