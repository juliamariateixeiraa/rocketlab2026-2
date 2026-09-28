// Os gêneros vêm do banco em inglês; a API continua recebendo o nome original.
const GENRE_LABELS: Record<string, string> = {
  Action: 'Ação',
  Adventure: 'Aventura',
  Animation: 'Animação',
  Comedy: 'Comédia',
  Crime: 'Crime',
  Documentary: 'Documentário',
  Drama: 'Drama',
  Family: 'Família',
  Fantasy: 'Fantasia',
  History: 'História',
  Horror: 'Terror',
  Music: 'Música',
  Mystery: 'Mistério',
  Romance: 'Romance',
  'Science Fiction': 'Ficção científica',
  Thriller: 'Suspense',
  'Tv Movie': 'Filme para TV',
  War: 'Guerra',
  Western: 'Faroeste',
}

export const genreLabel = (name: string) => GENRE_LABELS[name] ?? name

export const MOVIE_STATUSES = ['Lançado', 'Pós-Produção', 'Em Produção', 'Planejado'] as const

/** Converte a nota do banco (0–10) para estrelas (0–5). */
export const toStars = (nota: number) => nota / 2

/** Converte estrelas (1–5) para a escala do banco (0–10). */
export const toNota = (stars: number) => stars * 2

export function formatRuntime(minutes: number | null): string | null {
  if (!minutes) return null
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return hours ? `${hours}h ${String(rest).padStart(2, '0')}min` : `${rest}min`
}

export function formatDate(iso: string | null): string | null {
  if (!iso) return null
  // Datas sem horário ("2023-08-18") são tratadas como locais para não "voltar um dia".
  const date = iso.length === 10 ? new Date(`${iso}T00:00:00`) : new Date(iso)
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatRelative(iso: string): string {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ]
  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit)
  }
  return 'agora mesmo'
}

export const plural = (count: number, one: string, many: string) =>
  `${count.toLocaleString('pt-BR')} ${count === 1 ? one : many}`

/** Nota do banco (0–10) exibida em estrelas com uma casa: 7.3 → "3,7". */
export const formatStars = (nota: number) =>
  toStars(nota).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
