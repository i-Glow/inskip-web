import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './hooks/AuthProvider'
import ProtectedRoute from './components/layout/ProtectedRoute'
import AppShell from './components/layout/AppShell'
import LoginPage from './pages/LoginPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import ChallengesPage from './pages/ChallengesPage'
import IdeasPage from './pages/IdeasPage'
import IdeaDetailPage from './pages/IdeaDetailPage'
import ShortlistPage from './pages/ShortlistPage'
import { ToastProvider } from './components/ui/Toast'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route path="/challenges" element={<ChallengesPage />} />
                <Route path="/challenges/:id/ideas" element={<IdeasPage />} />
                <Route path="/challenges/:id/ideas/:ideaId" element={<IdeaDetailPage />} />
                <Route path="/challenges/:id/shortlist" element={<ShortlistPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/challenges" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}
