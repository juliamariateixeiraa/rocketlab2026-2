import { Clapperboard, House, MessageSquareText, Plus, Star } from 'lucide-react'
import { Link, NavLink } from 'react-router'

const ITEMS = [
  { to: '/', label: 'Início', icon: House, end: true },
  { to: '/catalogo', label: 'Catálogo', icon: Clapperboard, end: false },
  { to: '/avaliacoes', label: 'Avaliações', icon: MessageSquareText, end: false },
]

/** Navegação principal em cápsula: vertical no desktop, dock inferior no celular. */
export function Sidebar() {
  return (
    <nav className="sidebar" aria-label="Navegação principal">
      <Link to="/" className="sidebar__logo" aria-label="Rocket Filmes — início">
        <Star size={18} fill="currentColor" strokeWidth={0} />
      </Link>

      <ul className="sidebar__items">
        {ITEMS.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink to={to} end={end} className="sidebar__item" data-tooltip={label} viewTransition>
              <Icon size={20} strokeWidth={1.8} aria-hidden />
              <span className="sr-only">{label}</span>
            </NavLink>
          </li>
        ))}
        <li>
          <NavLink
            to="/filmes/novo"
            className="sidebar__item sidebar__item--add"
            data-tooltip="Novo filme"
            viewTransition
          >
            <Plus size={20} strokeWidth={2.2} aria-hidden />
            <span className="sr-only">Novo filme</span>
          </NavLink>
        </li>
      </ul>
    </nav>
  )
}
