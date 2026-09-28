import { useCallback, useEffect, useState } from 'react'

interface AsyncState<T> {
  /** Último resultado recebido; continua disponível enquanto a próxima requisição carrega. */
  data: T | undefined
  error: Error | undefined
  loading: boolean
  /** Refaz a requisição mantendo os dados atuais na tela até a resposta chegar. */
  reload: () => void
}

interface Result<T> {
  key: string
  data?: T
  error?: Error
}

/**
 * Executa uma função assíncrona sempre que `deps` mudam, cancelando a
 * requisição anterior para que respostas antigas não sobrescrevam as novas.
 */
export function useAsync<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[],
): AsyncState<T> {
  const [version, setVersion] = useState(0)
  const [result, setResult] = useState<Result<T>>({ key: '' })
  const key = JSON.stringify([...deps, version])

  useEffect(() => {
    const controller = new AbortController()
    fn(controller.signal)
      .then((data) => setResult({ key, data }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setResult((previous) => ({
          key,
          data: previous.data,
          error: err instanceof Error ? err : new Error(String(err)),
        }))
      })
    return () => controller.abort()
    // `fn` é recriada a cada render; quem chama decide, via `deps`, quando refazer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  const current = result.key === key
  return { data: result.data, error: current ? result.error : undefined, loading: !current, reload }
}
