import { listGenres } from '../api/movies'
import type { Genre } from '../api/types'
import { useAsync } from './useAsync'

// Os gêneros quase nunca mudam: busca uma vez e reaproveita entre as telas.
let cache: Promise<Genre[]> | undefined

export function useGenres(): Genre[] {
  const { data } = useAsync(() => {
    cache ??= listGenres().catch((error: unknown) => {
      cache = undefined
      throw error
    })
    return cache
  }, [])
  return data ?? []
}
