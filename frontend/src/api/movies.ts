import { request } from './client'
import type {
  CatalogStats,
  Genre,
  MovieDetail,
  MovieFilters,
  MovieListItem,
  MovieWrite,
  Page,
  Review,
  ReviewCreate,
  ReviewFeedItem,
} from './types'

export const listMovies = (filters: MovieFilters, signal?: AbortSignal) =>
  request<Page<MovieListItem>>('/movies', { params: { ...filters }, signal })

export const getMovie = (id: string, signal?: AbortSignal) =>
  request<MovieDetail>(`/movies/${id}`, { signal })

export const createMovie = (data: MovieWrite) =>
  request<MovieDetail>('/movies', { method: 'POST', body: data })

export const updateMovie = (id: string, data: MovieWrite) =>
  request<MovieDetail>(`/movies/${id}`, { method: 'PUT', body: data })

export const deleteMovie = (id: string) => request<void>(`/movies/${id}`, { method: 'DELETE' })

export const addReview = (movieId: string, data: ReviewCreate) =>
  request<Review>(`/movies/${movieId}/reviews`, { method: 'POST', body: data })

export const listGenres = (signal?: AbortSignal) => request<Genre[]>('/genres', { signal })

export const listReviews = (page: number, pageSize: number, signal?: AbortSignal) =>
  request<Page<ReviewFeedItem>>('/reviews', { params: { page, page_size: pageSize }, signal })

export const getStats = (signal?: AbortSignal) => request<CatalogStats>('/stats', { signal })
