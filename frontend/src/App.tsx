import { createBrowserRouter, RouterProvider } from 'react-router'
import { Layout } from './components/Layout'
import { CatalogPage } from './pages/CatalogPage'
import { HomePage } from './pages/HomePage'
import { MovieDetailPage } from './pages/MovieDetailPage'
import { MovieFormPage } from './pages/MovieFormPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ReviewsPage } from './pages/ReviewsPage'

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/catalogo', element: <CatalogPage /> },
      { path: '/avaliacoes', element: <ReviewsPage /> },
      { path: '/filmes/novo', element: <MovieFormPage /> },
      { path: '/filmes/:id', element: <MovieDetailPage /> },
      { path: '/filmes/:id/editar', element: <MovieFormPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
