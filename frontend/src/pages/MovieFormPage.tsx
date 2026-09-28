import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../api/client'
import { createMovie, getMovie, updateMovie } from '../api/movies'
import type { MovieDetail, MovieWrite } from '../api/types'
import { ErrorMessage, Spinner } from '../components/Feedback'
import { Poster } from '../components/Poster'
import { useAsync } from '../hooks/useAsync'
import { useGenres } from '../hooks/useGenres'
import { MOVIE_STATUSES, genreLabel } from '../utils/format'
import { NotFoundPage } from './NotFoundPage'

/** Estado do formulário: tudo em texto, como vem dos inputs. */
interface FormValues {
  titulo: string
  diretores: string
  ano_lancamento: string
  data_lancamento: string
  duracao_minutos: string
  status_filme: string
  generos: string[]
  sinopse: string
  url_poster: string
  url_backdrop: string
}

const EMPTY: FormValues = {
  titulo: '',
  diretores: '',
  ano_lancamento: '',
  data_lancamento: '',
  duracao_minutos: '',
  status_filme: 'Lançado',
  generos: [],
  sinopse: '',
  url_poster: '',
  url_backdrop: '',
}

function fromMovie(movie: MovieDetail): FormValues {
  return {
    titulo: movie.titulo,
    diretores: movie.diretores.join(', '),
    ano_lancamento: movie.ano_lancamento?.toString() ?? '',
    data_lancamento: movie.data_lancamento ?? '',
    duracao_minutos: movie.duracao_minutos?.toString() ?? '',
    status_filme: movie.status_filme ?? '',
    generos: movie.generos,
    sinopse: movie.sinopse ?? '',
    url_poster: movie.url_poster ?? '',
    url_backdrop: movie.url_backdrop ?? '',
  }
}

function toPayload(values: FormValues): MovieWrite {
  const text = (value: string) => value.trim() || null
  const number = (value: string) => (value.trim() ? Number(value) : null)
  return {
    titulo: values.titulo.trim(),
    diretores: values.diretores.split(',').map((name) => name.trim()).filter(Boolean),
    ano_lancamento: number(values.ano_lancamento),
    data_lancamento: text(values.data_lancamento),
    duracao_minutos: number(values.duracao_minutos),
    status_filme: text(values.status_filme),
    generos: values.generos,
    sinopse: text(values.sinopse),
    url_poster: text(values.url_poster),
    url_backdrop: text(values.url_backdrop),
  }
}

export function MovieFormPage() {
  const { id } = useParams()
  const { data: movie, error, reload } = useAsync(
    (signal) => (id ? getMovie(id, signal) : Promise.resolve(undefined)),
    [id],
  )

  if (error instanceof ApiError && error.status === 404) return <NotFoundPage />
  if (error) return <ErrorMessage error={error} onRetry={reload} />
  if (id && movie?.sk_movie_id !== id) return <Spinner />

  // A `key` recria o formulário com os valores certos ao trocar de filme.
  return <MovieForm key={id ?? 'novo'} movie={id ? movie : undefined} />
}

function MovieForm({ movie }: { movie?: MovieDetail }) {
  const navigate = useNavigate()
  const genres = useGenres()
  const [values, setValues] = useState<FormValues>(movie ? fromMovie(movie) : EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()

  const set = (field: keyof FormValues) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [field]: event.target.value }))

  function toggleGenre(name: string) {
    setValues((current) => ({
      ...current,
      generos: current.generos.includes(name)
        ? current.generos.filter((g) => g !== name)
        : [...current.generos, name],
    }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(undefined)
    try {
      const payload = toPayload(values)
      const saved = movie ? await updateMovie(movie.sk_movie_id, payload) : await createMovie(payload)
      navigate(`/filmes/${saved.sk_movie_id}`, {
        viewTransition: true,
        state: { flash: movie ? 'Alterações salvas.' : 'Filme cadastrado!' },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.')
      setSaving(false)
    }
  }

  const cancelUrl = movie ? `/filmes/${movie.sk_movie_id}` : '/catalogo'

  return (
    <div className="form-page page-enter">
      <header className="page-header">
        <div>
          <p className="eyebrow">{movie ? 'Editar filme' : 'Adicionar ao catálogo'}</p>
          <h1>{movie ? movie.titulo : 'Novo filme'}</h1>
        </div>
      </header>

      <form className="surface movie-form" onSubmit={handleSubmit}>
        <div className="movie-form__grid">
          <div className="movie-form__fields">
            <label className="field">
              <span>Título *</span>
              <input value={values.titulo} onChange={set('titulo')} maxLength={500} required autoFocus />
            </label>

            <label className="field">
              <span>Direção</span>
              <input
                value={values.diretores}
                onChange={set('diretores')}
                placeholder="Separe vários nomes por vírgula"
              />
            </label>

            <div className="field-row">
              <label className="field">
                <span>Ano</span>
                <input
                  type="number"
                  min={1870}
                  max={2100}
                  value={values.ano_lancamento}
                  onChange={set('ano_lancamento')}
                  disabled={Boolean(values.data_lancamento)}
                  title={values.data_lancamento ? 'Definido pela data de lançamento' : undefined}
                />
              </label>
              <label className="field">
                <span>Data de lançamento</span>
                <input type="date" value={values.data_lancamento} onChange={set('data_lancamento')} />
              </label>
            </div>

            <div className="field-row">
              <label className="field">
                <span>Duração (min)</span>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={values.duracao_minutos}
                  onChange={set('duracao_minutos')}
                />
              </label>
              <label className="field">
                <span>Situação</span>
                <select value={values.status_filme} onChange={set('status_filme')}>
                  <option value="">—</option>
                  {MOVIE_STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>

            <fieldset className="field">
              <legend>Gêneros</legend>
              <div className="chips">
                {genres.map((g) => {
                  const selected = values.generos.includes(g.nome_genero)
                  return (
                    <button
                      key={g.sk_genre_id}
                      type="button"
                      className={`chip chip--button ${selected ? 'is-selected' : ''}`}
                      aria-pressed={selected}
                      onClick={() => toggleGenre(g.nome_genero)}
                    >
                      {genreLabel(g.nome_genero)}
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <label className="field">
              <span>Sinopse</span>
              <textarea value={values.sinopse} onChange={set('sinopse')} rows={5} maxLength={4000} />
            </label>
          </div>

          <div className="movie-form__media">
            <Poster
              src={values.url_poster.trim() || null}
              title={values.titulo || 'Pré-visualização'}
            />
            <label className="field">
              <span>URL do pôster</span>
              <input type="url" value={values.url_poster} onChange={set('url_poster')} placeholder="https://…" />
            </label>
            <label className="field">
              <span>URL da imagem de fundo</span>
              <input
                type="url"
                value={values.url_backdrop}
                onChange={set('url_backdrop')}
                placeholder="https://…"
              />
            </label>
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="movie-form__actions">
          <Link to={cancelUrl} className="btn btn--glass" viewTransition>
            Cancelar
          </Link>
          <button type="submit" className="btn btn--accent" disabled={saving}>
            {saving ? 'Salvando…' : movie ? 'Salvar alterações' : 'Cadastrar filme'}
          </button>
        </div>
      </form>
    </div>
  )
}
