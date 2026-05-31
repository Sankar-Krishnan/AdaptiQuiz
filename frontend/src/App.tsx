import { type JSX, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import Navbar from '@/components/Navbar'
import HomePage from '@/pages/HomePage'
import QuizPage from '@/pages/QuizPage'
import ResultsPage from '@/pages/ResultsPage'
import LoginPage from '@/pages/LoginPage'
import SignUpPage from '@/pages/SignUpPage'
import type { QuizSession, InsightsData } from '@/types/quiz'

// Inner component so useAuth() can access the AuthProvider
function AppRoutes() {
  const { user } = useAuth()
  const [session, setSession] = useState<QuizSession | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [insights, setInsights] = useState<InsightsData | null>(null)

  function handleSessionStart(newSession: QuizSession, firstQuestion: string) {
    setSession(newSession)
    setCurrentQuestion(firstQuestion)
  }

  function handleSessionUpdate(updatedSession: QuizSession, nextQuestion: string) {
    setSession(updatedSession)
    setCurrentQuestion(nextQuestion)
  }

  function handleInsightsReady(data: InsightsData) {
    setInsights(data)
  }

  function handleReset() {
    setSession(null)
    setCurrentQuestion('')
    setInsights(null)
  }

  const requireAuth = (element: JSX.Element) =>
    user ? element : <Navigate to="/login" replace />

  return (
    <>
      <Navbar />
      <Routes>
        {/* Public — redirect to / if already authenticated */}
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/signup" element={user ? <Navigate to="/" replace /> : <SignUpPage />} />

        {/* Protected */}
        <Route
          path="/"
          element={requireAuth(<HomePage onSessionStart={handleSessionStart} />)}
        />
        <Route
          path="/quiz"
          element={requireAuth(
            session ? (
              <QuizPage
                session={session}
                currentQuestion={currentQuestion}
                onSessionUpdate={handleSessionUpdate}
                onInsightsReady={handleInsightsReady}
              />
            ) : (
              <Navigate to="/" replace />
            ),
          )}
        />
        <Route
          path="/results"
          element={requireAuth(<ResultsPage session={session} insights={insights} onReset={handleReset} />)}
        />
        <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
