interface PaginationProps {
  page: number
  pages: number
  onChange: (page: number) => void
}

/** Números visíveis: primeira, última e vizinhas da atual, com "…" nos saltos. */
function visiblePages(page: number, pages: number): (number | '…')[] {
  const wanted = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages))
  const sorted = [...wanted].sort((a, b) => a - b)
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? ['…' as const, p] : [p]))
}

export function Pagination({ page, pages, onChange }: PaginationProps) {
  if (pages <= 1) return null

  return (
    <nav className="pagination" aria-label="Paginação">
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ‹ Anterior
      </button>
      <div className="pagination__pages">
        {visiblePages(page, pages).map((p, i) =>
          p === '…' ? (
            <span key={`gap-${i}`} className="pagination__gap">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={p === page ? 'is-current' : ''}
              aria-current={p === page ? 'page' : undefined}
              onClick={() => onChange(p)}
            >
              {p.toLocaleString('pt-BR')}
            </button>
          ),
        )}
      </div>
      <button type="button" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Próxima ›
      </button>
    </nav>
  )
}
