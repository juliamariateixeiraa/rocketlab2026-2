import { Link } from 'react-router'
import { EmptyState } from '../components/Feedback'

export function NotFoundPage() {
  return (
    <EmptyState title="Página não encontrada">
      <p className="muted">O filme pode ter sido excluído ou o endereço está errado.</p>
      <Link to="/catalogo" className="btn btn--light">
        Voltar ao catálogo
      </Link>
    </EmptyState>
  )
}
