import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function urlError(): string | null {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const query = new URLSearchParams(window.location.search)
  return hash.get('error_description') ?? query.get('error_description')
}

export default function AuthCallbackPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [hasUrlError] = useState(() => urlError() !== null)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (session) navigate('/challenges', { replace: true })
  }, [session, navigate])

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 5000)
    return () => clearTimeout(t)
  }, [])

  if (hasUrlError || (timedOut && !session)) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-3 p-6">
        <p role="alert" className="text-sm text-red-700">
          Le lien de connexion est invalide ou a expiré.
        </p>
        <Link to="/login" className="text-sm text-indigo-600 underline">
          Retour à la connexion
        </Link>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <p className="text-sm text-gray-600">Connexion en cours…</p>
    </main>
  )
}
