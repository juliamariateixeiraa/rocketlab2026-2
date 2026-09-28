import { Ellipsis, Eye, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { deleteMovie } from '../api/movies'

interface MovieActionsMenuProps {
  movieId: string
  title: string
  /** Chamado depois de excluir, para a tela recarregar a lista. */
  onDeleted: (title: string) => void
}

/** Menu "⋯" com as ações administrativas de um filme. */
export function MovieActionsMenu({ movieId, title, onDeleted }: MovieActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function close(event: MouseEvent | KeyboardEvent) {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !ref.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  async function handleDelete() {
    setOpen(false)
    if (!window.confirm(`Excluir "${title}"? As avaliações dele também serão apagadas.`)) return
    setBusy(true)
    try {
      await deleteMovie(movieId)
      onDeleted(title)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Erro ao excluir.')
      setBusy(false)
    }
  }

  return (
    <div className={`actions-menu ${open ? 'is-open' : ''}`} ref={ref}>
      <button
        type="button"
        className="actions-menu__trigger"
        aria-label={`Ações para ${title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen(!open)}
      >
        <Ellipsis size={18} />
      </button>
      {open && (
        <div className="actions-menu__list" role="menu">
          <Link role="menuitem" to={`/filmes/${movieId}`} viewTransition>
            <Eye size={16} /> Ver detalhes
          </Link>
          <Link role="menuitem" to={`/filmes/${movieId}/editar`} viewTransition>
            <Pencil size={16} /> Editar
          </Link>
          <button role="menuitem" type="button" className="is-danger" onClick={handleDelete}>
            <Trash2 size={16} /> Excluir
          </button>
        </div>
      )}
    </div>
  )
}
