import { useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Card } from 'primereact/card'
import { InputText } from 'primereact/inputtext'
import { Password } from 'primereact/password'
import { Dropdown } from 'primereact/dropdown'
import { Button } from 'primereact/button'
import { Toast } from 'primereact/toast'
import type { Toast as ToastType } from 'primereact/toast'
import { signUp } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import type { AuthUser } from '@/types/quiz'

const GRADE_OPTIONS = [
  ...Array.from({ length: 9 }, (_, i) => ({
    label: `Grade ${i + 4}`,
    value: String(i + 4),
  })),
  { label: 'Professional', value: 'professional' },
]

export default function SignUpPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [gradeLevel, setGradeLevel] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const toast = useRef<ToastType>(null)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleSignUp() {
    if (!name.trim() || !email.trim() || !password || !passwordConfirm || !gradeLevel) {
      toast.current?.show({ severity: 'warn', summary: 'Please fill in all fields.', life: 3000 })
      return
    }
    if (password !== passwordConfirm) {
      toast.current?.show({ severity: 'warn', summary: 'Passwords do not match.', life: 3000 })
      return
    }
    setLoading(true)
    try {
      const res = await signUp({
        name: name.trim(),
        email: email.trim(),
        password,
        password_confirm: passwordConfirm,
        grade_level: gradeLevel,
      })
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
        summary: 'Sign up failed',
        detail: (err as Error).message,
        life: 5000,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex align-items-center justify-content-center min-h-screen surface-ground px-3 py-5">
      <Toast ref={toast} />
      <Card className="w-full shadow-3" style={{ maxWidth: '460px' }}>
        <div className="flex flex-column gap-4">
          <div className="text-center">
            <h2 className="m-0 text-900 font-bold text-2xl">Create your account</h2>
            <p className="m-0 text-500 mt-2 text-sm">Start your personalized quiz journey</p>
          </div>

          <div className="flex flex-column gap-1">
            <label className="font-medium text-700 text-sm" htmlFor="signup-name">Full name</label>
            <InputText
              id="signup-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Smith"
              className="w-full"
            />
          </div>

          <div className="flex flex-column gap-1">
            <label className="font-medium text-700 text-sm" htmlFor="signup-email">Email</label>
            <InputText
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full"
            />
          </div>

          <div className="flex flex-column gap-1">
            <label className="font-medium text-700 text-sm" htmlFor="signup-grade">Grade level</label>
            <Dropdown
              inputId="signup-grade"
              value={gradeLevel}
              options={GRADE_OPTIONS}
              onChange={(e) => setGradeLevel(e.value as string)}
              placeholder="Select your grade"
              className="w-full"
            />
          </div>

          <div className="flex flex-column gap-1">
            <label className="font-medium text-700 text-sm" htmlFor="signup-password">Password</label>
            <Password
              inputId="signup-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              toggleMask
              inputClassName="w-full"
              className="w-full"
              promptLabel="Enter a password"
              weakLabel="Too short"
              mediumLabel="Medium strength"
              strongLabel="Strong password"
            />
          </div>

          <div className="flex flex-column gap-1">
            <label className="font-medium text-700 text-sm" htmlFor="signup-confirm">Confirm password</label>
            <Password
              inputId="signup-confirm"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              feedback={false}
              toggleMask
              inputClassName="w-full"
              className="w-full"
            />
          </div>

          <Button
            label="Create account"
            icon="pi pi-user-plus"
            className="w-full"
            loading={loading}
            onClick={handleSignUp}
          />

          <p className="m-0 text-center text-sm text-500">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium no-underline">
              Sign in
            </Link>
          </p>
        </div>
      </Card>
    </div>
  )
}
