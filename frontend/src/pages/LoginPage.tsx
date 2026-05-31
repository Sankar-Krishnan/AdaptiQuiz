import { useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Card } from 'primereact/card'
import { InputText } from 'primereact/inputtext'
import { Password } from 'primereact/password'
import { Button } from 'primereact/button'
import { Toast } from 'primereact/toast'
import type { Toast as ToastType } from 'primereact/toast'
import { login } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import type { AuthUser } from '@/types/quiz'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useRef<ToastType>(null)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleLogin() {
    if (!email.trim() || !password) {
      toast.current?.show({ severity: 'warn', summary: 'Please fill in all fields.', life: 3000 })
      return
    }
    setLoading(true)
    try {
      const res = await login({ email: email.trim(), password })
      const user: AuthUser = {
        student_id: res.student_id,
        name: res.name,
        grade_level: res.grade_level,
      }
      signIn(user, res.access_token)
      navigate('/')
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: 'Login failed',
        detail: (err as Error).message,
        life: 5000,
      })
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <div className="flex align-items-center justify-content-center min-h-screen surface-ground px-3">
      <Toast ref={toast} />
      <Card className="w-full shadow-3" style={{ maxWidth: '420px' }}>
        <div className="flex flex-column gap-4">
          <div className="text-center">
            <h2 className="m-0 text-900 font-bold text-2xl">Welcome back</h2>
            <p className="m-0 text-500 mt-2 text-sm">Sign in to continue your quiz journey</p>
          </div>

          <div className="flex flex-column gap-1">
            <label className="font-medium text-700 text-sm" htmlFor="login-email">Email</label>
            <InputText
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="you@example.com"
              className="w-full"
            />
          </div>

          <div className="flex flex-column gap-1">
            <label className="font-medium text-700 text-sm" htmlFor="login-password">Password</label>
            <Password
              inputId="login-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              feedback={false}
              toggleMask
              inputClassName="w-full"
              className="w-full"
            />
          </div>

          <Button
            label="Sign in"
            icon="pi pi-sign-in"
            className="w-full"
            loading={loading}
            onClick={handleLogin}
          />

          <p className="m-0 text-center text-sm text-500">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary font-medium no-underline">
              Sign up
            </Link>
          </p>
        </div>
      </Card>
    </div>
  )
}
