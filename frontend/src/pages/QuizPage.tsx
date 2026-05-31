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
import { submitAnswer, finishQuiz } from '@/api/client'
import type { AnswerResponse, QuizSession, HistoryEntry, InsightsData } from '@/types/quiz'

type Phase = 'answering' | 'loading' | 'hint' | 'feedback'

interface Props {
  session: QuizSession | null
  currentQuestion: string
  onSessionUpdate: (session: QuizSession, nextQuestion: string) => void
  onInsightsReady: (insights: InsightsData) => void
}

export default function QuizPage({ session, currentQuestion, onSessionUpdate, onInsightsReady }: Props) {
  const [phase, setPhase] = useState<Phase>('answering')
  const [lastResponse, setLastResponse] = useState<AnswerResponse | null>(null)
  const [slowLoad, setSlowLoad] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [finishing, setFinishing] = useState(false)
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
        answer,
      })
      setLastResponse(res)

      if (res.next_action === 'retry') {
        // Hint path — question stays the same, no score change, no history entry yet
        setPhase('hint')
      } else {
        // Normal path — record result, move to next question
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
      }
    } catch (err) {
      setErrorMsg((err as Error).message)
      setPhase('answering')
    }
  }

  function handleNext() {
    setPhase('answering')
    setLastResponse(null)
  }

  async function handleFinish() {
    if (!session) return
    setFinishing(true)
    try {
      const res = await finishQuiz(session.session_id)
      onInsightsReady(res.insights)
    } catch {
      // Non-fatal — navigate to results even if insights extraction fails
    } finally {
      setFinishing(false)
      navigate('/results')
    }
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

        {phase === 'hint' && lastResponse && (
          <Card>
            <div className="flex flex-column gap-3">
              <Message
                severity="warn"
                className="w-full"
                content={
                  <div className="flex flex-column gap-1">
                    <span className="font-semibold">Here's a hint</span>
                    <span>{lastResponse.hint}</span>
                  </div>
                }
              />
              <p className="m-0 text-500 text-sm">
                <i className="pi pi-info-circle mr-1" />
                You have one more attempt on this question.
              </p>
              <AnswerInput onSubmit={handleAnswer} loading={false} />
            </div>
          </Card>
        )}

        {phase === 'feedback' && lastResponse && (
          <Card>
            <div className="flex flex-column gap-4">
              <FeedbackPanel
                correct={lastResponse.correct}
                explanation={lastResponse.explanation}
                feedback={lastResponse.feedback}
              />
              <div className="flex flex-column sm:flex-row gap-3">
                <Button
                  label="Next Question"
                  icon="pi pi-arrow-right"
                  className="flex-1"
                  onClick={handleNext}
                  disabled={finishing}
                />
                <Button
                  label={finishing ? 'Saving insights...' : 'Finish Quiz'}
                  icon={finishing ? undefined : 'pi pi-flag'}
                  severity="secondary"
                  className="flex-1"
                  onClick={handleFinish}
                  loading={finishing}
                  disabled={finishing}
                />
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
