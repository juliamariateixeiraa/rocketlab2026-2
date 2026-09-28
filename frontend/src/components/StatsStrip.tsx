import { Clapperboard, MessageSquareText, Star } from 'lucide-react'
import { getStats } from '../api/movies'
import { useAsync } from '../hooks/useAsync'
import { formatStars } from '../utils/format'

/** Indicadores do catálogo em formato compacto, integrados ao cabeçalho. */
export function StatsStrip({ refreshKey = 0 }: { refreshKey?: number }) {
  const { data } = useAsync((signal) => getStats(signal), [refreshKey])

  const items = [
    { icon: Clapperboard, value: data?.total_filmes.toLocaleString('pt-BR'), label: 'filmes' },
    { icon: MessageSquareText, value: data?.total_avaliacoes.toLocaleString('pt-BR'), label: 'avaliações' },
    {
      icon: Star,
      value: data?.nota_media_geral != null ? formatStars(data.nota_media_geral) : '—',
      label: 'média geral',
    },
  ]

  return (
    <dl className="stats">
      {items.map(({ icon: Icon, value, label }) => (
        <div key={label} className="stats__item">
          <Icon size={16} aria-hidden />
          <dd>{value ?? '…'}</dd>
          <dt>{label}</dt>
        </div>
      ))}
    </dl>
  )
}
