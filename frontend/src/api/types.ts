// Tipos espelhando os schemas da API (backend/app/movies/schemas.py).

export type MovieSort = 'popularidade' | 'titulo' | 'mais_recentes' | 'mais_antigos' | 'nota'

export interface RatingSummary {
  nota_media: number | null
  qtd_avaliacoes: number
}

export interface MovieListItem extends RatingSummary {
  sk_movie_id: string
  titulo: string
  ano_lancamento: number | null
  url_poster: string | null
  url_backdrop: string | null
  generos: string[]
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface Review {
  sk_movie_review_id: string
  nome: string
  nota: number
  comentario: string
  created_at: string
}

export interface ReviewFeedItem extends Review {
  sk_movie_id: string
  titulo_filme: string
  url_poster: string | null
}

export interface CatalogStats {
  total_filmes: number
  total_avaliacoes: number
  nota_media_geral: number | null
}

export interface MovieDetail extends RatingSummary {
  sk_movie_id: string
  id_filme: string
  titulo: string
  data_lancamento: string | null
  ano_lancamento: number | null
  duracao_minutos: number | null
  status_filme: string | null
  sinopse: string | null
  url_poster: string | null
  url_backdrop: string | null
  generos: string[]
  diretores: string[]
  roteiristas: string[]
  elenco: string[]
  produtoras: string[]
  avaliacoes: Review[]
}

export interface MovieWrite {
  titulo: string
  diretores: string[]
  ano_lancamento: number | null
  generos: string[]
  sinopse: string | null
  duracao_minutos: number | null
  data_lancamento: string | null
  status_filme: string | null
  url_poster: string | null
  url_backdrop: string | null
}

export interface ReviewCreate {
  nome: string
  nota: number
  comentario: string
}

export interface Genre {
  sk_genre_id: string
  nome_genero: string
}

export interface MovieFilters {
  busca?: string
  genero?: string
  ano?: number
  min_avaliacoes?: number
  ordenar?: MovieSort
  page?: number
  page_size?: number
}
