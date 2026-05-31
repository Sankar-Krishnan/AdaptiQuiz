import { useNavigate } from 'react-router-dom'
import { Toolbar } from 'primereact/toolbar'
import { Button } from 'primereact/button'
import { useAuth } from '@/context/AuthContext'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  function handleSignOut() {
    signOut()
    navigate('/login')
  }

  const start = (
    <span
      className="font-bold text-xl text-primary cursor-pointer select-none"
      onClick={() => navigate('/')}
    >
      AdaptiQuiz
    </span>
  )

  const end = user ? (
    <div className="flex align-items-center gap-3">
      <span className="text-sm text-600 hidden md:inline">
        {user.name}
        {' · '}
        {user.grade_level === 'professional' ? 'Professional' : `Grade ${user.grade_level}`}
      </span>
      <Button
        label="Sign out"
        icon="pi pi-sign-out"
        severity="secondary"
        size="small"
        onClick={handleSignOut}
      />
    </div>
  ) : null

  return (
    <Toolbar
      start={start}
      end={end}
      className="sticky top-0 z-5 border-noround border-bottom-1 border-200 px-3 py-2"
      style={{ borderRadius: 0 }}
    />
  )
}
