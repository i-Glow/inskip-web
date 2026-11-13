import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function ProtectedRoute() {
  const { session, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-600">
        Chargement…
      </div>
    )
  }
  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}
