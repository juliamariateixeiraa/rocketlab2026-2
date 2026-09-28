import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router'

/** Mostra uma mensagem rápida (toast) sem sair da tela atual. */
export function useFlash() {
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  return useCallback(
    (flash: string) => navigate(`${pathname}${search}`, { replace: true, state: { flash } }),
    [navigate, pathname, search],
  )
}
