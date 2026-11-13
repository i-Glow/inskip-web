import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Button from '../ui/Button'

export default function Header() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function onSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="flex items-center justify-between border-b border-gray-200 px-6 py-3">
      <span className="text-lg font-semibold">INSKIP</span>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">{user?.email}</span>
        <Button type="button" onClick={onSignOut} className="bg-gray-700 hover:bg-gray-600">
          Se déconnecter
        </Button>
      </div>
    </header>
  )
}
