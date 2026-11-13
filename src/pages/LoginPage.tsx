import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

type Status = 'idle' | 'sending' | 'sent' | 'error'

export default function LoginPage() {
  const { session, loading, signInWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [sentTo, setSentTo] = useState('')

  if (!loading && session) return <Navigate to="/challenges" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('sending')
    try {
      await signInWithEmail(email.trim())
      setSentTo(email.trim())
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">INSKIP</h1>
      <p className="text-sm text-gray-600">Connectez-vous avec votre adresse e-mail.</p>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label htmlFor="email" className="text-sm font-medium">
          Adresse e-mail
        </label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          placeholder="vous@exemple.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" disabled={status === 'sending' || !email}>
          {status === 'sending' ? 'Envoi en cours…' : 'Recevoir un lien de connexion'}
        </Button>
      </form>
      {status === 'sent' && (
        <p role="status" className="text-sm text-green-700">
          Un lien de connexion a été envoyé à {sentTo}.
        </p>
      )}
      {status === 'error' && (
        <p role="alert" className="text-sm text-red-700">
          Impossible d’envoyer le lien de connexion. Veuillez réessayer.
        </p>
      )}
    </main>
  )
}
