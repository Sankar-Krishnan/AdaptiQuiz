import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import HomePage from '@/pages/HomePage'
import QuizPage from '@/pages/QuizPage'
import ResultsPage from '@/pages/ResultsPage'
import type { QuizSession } from '@/types/quiz'

export default function App() {
  const [session, setSession] = useState<QuizSession | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState('')

  function handleSessionStart(newSession: QuizSession, firstQuestion: string) {
    setSession(newSession)
    setCurrentQuestion(firstQuestion)
  }

  function handleSessionUpdate(updatedSession: QuizSession, nextQuestion: string) {
    setSession(updatedSession)
    setCurrentQuestion(nextQuestion)
  }

  function handleReset() {
    setSession(null)
    setCurrentQuestion('')
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<HomePage onSessionStart={handleSessionStart} />}
        />
        <Route
          path="/quiz"
          element={
            session ? (
              <QuizPage
                session={session}
                currentQuestion={currentQuestion}
                onSessionUpdate={handleSessionUpdate}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/results"
          element={<ResultsPage session={session} onReset={handleReset} />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
