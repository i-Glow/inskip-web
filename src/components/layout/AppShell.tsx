import { Outlet } from 'react-router-dom'
import Header from './Header'

export default function AppShell() {
  return (
    <div className="flex h-dvh flex-col">
      <Header />
      <main className="mx-auto flex min-h-0 w-full max-w-[1920px] flex-1 flex-col overflow-auto px-4 py-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}
