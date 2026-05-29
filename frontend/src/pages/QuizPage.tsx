import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from 'primereact/card'
import { Button } from 'primereact/button'
import { Message } from 'primereact/message'
import { ProgressSpinner } from 'primereact/progressspinner'
import QuestionCard from '@/components/QuestionCard'
import AnswerInput from '@/components/AnswerInput'
import FeedbackPanel from '@/components/FeedbackPanel'
import ScoreBar from '@/components/ScoreBar'
import { submitAnswer } from '@/api/client'
import type { AnswerResponse, QuizSession, HistoryEntry } from '@/types/quiz'

type Phase = 'answering' | 'loading' | 'feedback'

interface Props {
  session: QuizSession | null
  currentQuestion: string
  onSessionUpdate: (session: QuizSession, nextQuestion: string) => void
}

export default function QuizPage({ session, currentQuestion, onSessionUpdate }: Props) {
  const [phase, setPhase] = useState<Phase>('answering')
  const [lastResponse, setLastResponse] = useState<AnswerResponse | null>(null)
  const [slowLoad, setSlowLoad] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (phase !== 'loading') {
      setSlowLoad(false)
      return
    }
    const timer = setTimeout(() => setSlowLoad(true), 5000)
    return () => clearTimeout(timer)
  }, [phase])

  if (!session) {
    return (
      <div className="flex align-items-center justify-content-center min-h-screen">
        <Button label="Back to Home" icon="pi pi-home" onClick={() => navigate('/')} />
      </div>
    )
  }

  const questionNumber = session.history.length + 1
  const total = session.history.length

  async function handleAnswer(answer: string) {
    setErrorMsg(null)
    setPhase('loading')
    try {
      const res = await submitAnswer({
        session_id: session!.session_id,
        student_id: session!.student_id,
        answer,
      })
      setLastResponse(res)

      const entry: HistoryEntry = {
        question: currentQuestion,
        answer,
        correct: res.correct,
        difficulty: session!.difficulty,
      }
      const newScore = session!.score + (res.correct ? 1 : 0)
      const updatedSession: QuizSession = {
        ...session!,
        score: newScore,
        streak: res.streak,
        difficulty: res.difficulty,
        history: [...session!.history, entry],
      }
      onSessionUpdate(updatedSession, res.next_question)
      setPhase('feedback')
    } catch (err) {
      setErrorMsg((err as Error).message)
      setPhase('answering')
    }
  }

  function handleNext() {
    setPhase('answering')
    setLastResponse(null)
  }

  function handleFinish() {
    navigate('/results')
  }

  return (
    <div className="flex justify-content-center surface-ground min-h-screen py-5 px-3">
      <div className="w-full md:w-8 lg:w-6 flex flex-column gap-4">

        {/* Score bar — always visible */}
        <ScoreBar score={session.score} total={total} streak={session.streak} />

        {/* Question */}
        <QuestionCard
          question={currentQuestion}
          difficulty={session.difficulty}
          questionNumber={questionNumber}
        />

        {/* Answer / loading / feedback */}
        {phase === 'answering' && (
          <Card>
            {errorMsg && (
              <Message severity="warn" text={errorMsg} className="w-full mb-3" />
            )}
            <AnswerInput onSubmit={handleAnswer} loading={false} />
          </Card>
        )}

        {phase === 'loading' && (
          <div className="flex flex-column align-items-center gap-3 p-4">
            <ProgressSpinner style={{ width: '48px', height: '48px' }} />
            {slowLoad && (
              <p className="m-0 text-500 text-sm text-center">
                Taking a bit longer than usual — awaiting AI response, rate limit retry in progress...
              </p>
            )}
          </div>
        )}

        {phase === 'feedback' && lastResponse && (
          <Card>
            <div className="flex flex-column gap-4">
              <FeedbackPanel
                correct={lastResponse.correct}
                explanation={lastResponse.explanation}
                feedback={lastResponse.feedback}
              />
              <div className="flex gap-3">
                <Button
                  label="Next Question"
                  icon="pi pi-arrow-right"
                  className="flex-1"
                  onClick={handleNext}
                />
                <Button
                  label="Finish Quiz"
                  icon="pi pi-flag"
                  severity="secondary"
                  className="flex-1"
                  onClick={handleFinish}
                />
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
