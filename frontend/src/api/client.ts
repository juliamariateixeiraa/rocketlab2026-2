// Em desenvolvimento o Vite repassa /api para o backend (ver vite.config.ts).
const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** Converte o `detail` do FastAPI (texto ou lista de erros de validação) em mensagem. */
function errorMessage(detail: unknown, status: number): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((item: { loc?: unknown[]; msg?: string }) => {
        const field = item.loc?.at(-1)
        return field ? `${String(field)}: ${item.msg}` : item.msg
      })
      .join('; ')
  }
  return `Erro ${status} ao falar com o servidor`
}

type Params = Record<string, string | number | undefined>

export async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; params?: Params; signal?: AbortSignal } = {},
): Promise<T> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(options.params ?? {})) {
    if (value !== undefined && value !== '') query.set(key, String(value))
  }
  const url = `${BASE_URL}${path}${query.size ? `?${query}` : ''}`

  let response: Response
  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'Não foi possível conectar ao servidor. O backend está rodando?')
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ApiError(response.status, errorMessage(body?.detail, response.status))
  }
  return (response.status === 204 ? undefined : await response.json()) as T
}
