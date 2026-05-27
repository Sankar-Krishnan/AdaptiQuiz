import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from 'primereact/card'
import { Button } from 'primereact/button'
import { Dropdown } from 'primereact/dropdown'
import { ProgressSpinner } from 'primereact/progressspinner'
import { Toast } from 'primereact/toast'
import type { Toast as ToastType } from 'primereact/toast'
import TopicSelector from '@/components/TopicSelector'
import { startQuiz } from '@/api/client'
import type { QuizSession } from '@/types/quiz'

const DIFFICULTY_OPTIONS = [
  { label: 'Level 1 — Easy', value: 1 },
  { label: 'Level 2 — Moderate', value: 2 },
  { label: 'Level 3 — Challenging', value: 3 },
  { label: 'Level 4 — Hard', value: 4 },
  { label: 'Level 5 — Expert', value: 5 },
]

interface Props {
  onSessionStart: (session: QuizSession, firstQuestion: string) => void
}

export default function HomePage({ onSessionStart }: Props) {
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState<number>(1)
  const [loading, setLoading] = useState(false)
  const toast = useRef<ToastType>(null)
  const navigate = useNavigate()

  async function handleStart() {
    if (!topic.trim()) {
      toast.current?.show({ severity: 'warn', summary: 'Please enter a topic.', life: 3000 })
      return
    }

    setLoading(true)
    try {
      const res = await startQuiz({ topic: topic.trim(), difficulty })
      const session: QuizSession = {
        session_id: res.session_id,
        student_id: res.student_id,
        topic: topic.trim(),
        score: 0,
        streak: 0,
        difficulty: res.difficulty,
        history: [],
      }
      onSessionStart(session, res.question)
      navigate('/quiz')
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: (err as Error).message,
        life: 5000,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex align-items-center justify-content-center min-h-screen surface-ground">
      <Toast ref={toast} />

      <Card
        title="AdaptiQuiz"
        subTitle="AI-powered adaptive quizzing — pick a topic and let the agent calibrate to your level."
        className="w-full md:w-6 lg:w-5 shadow-4"
      >
        <div className="flex flex-column gap-4">
          <TopicSelector onChange={setTopic} />

          <div className="flex flex-column gap-1">
            <label className="font-medium text-700" htmlFor="difficulty-select">Starting difficulty</label>
            <Dropdown
              inputId="difficulty-select"
              value={difficulty}
              options={DIFFICULTY_OPTIONS}
              onChange={(e) => setDifficulty(e.value as number)}
              className="w-full"
            />
          </div>

          {loading ? (
            <div className="flex justify-content-center p-3">
              <ProgressSpinner style={{ width: '48px', height: '48px' }} />
            </div>
          ) : (
            <Button
              label="Start Quiz"
              icon="pi pi-play"
              className="w-full"
              onClick={handleStart}
            />
          )}
        </div>
      </Card>
    </div>
  )
}
