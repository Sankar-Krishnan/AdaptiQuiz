import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from 'primereact/card'
import { Button } from 'primereact/button'
import { Dropdown } from 'primereact/dropdown'
import { ProgressSpinner } from 'primereact/progressspinner'
import { Toast } from 'primereact/toast'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { Tag } from 'primereact/tag'
import type { Toast as ToastType } from 'primereact/toast'
import TopicSelector from '@/components/TopicSelector'
import { startQuiz, getInsights } from '@/api/client'
import type { QuizSession, InsightsData } from '@/types/quiz'

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
  const [topicInsights, setTopicInsights] = useState<InsightsData[]>([])
  const toast = useRef<ToastType>(null)
  const navigate = useNavigate()

  useEffect(() => {
    getInsights().then(setTopicInsights).catch(() => {})
  }, [])

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

  const masteryTemplate = (row: InsightsData) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <i
          key={n}
          className={`pi ${n <= row.mastery_level ? 'pi-star-fill' : 'pi-star'} text-yellow-500`}
          style={{ fontSize: '0.85rem' }}
        />
      ))}
    </div>
  )

  const weakAreasTemplate = (row: InsightsData) => (
    <div className="flex flex-wrap gap-1">
      {row.weak_areas.slice(0, 3).map((w, i) => (
        <Tag key={i} value={w} severity="warning" style={{ fontSize: '0.7rem' }} />
      ))}
      {row.weak_areas.length > 3 && (
        <Tag value={`+${row.weak_areas.length - 3}`} severity="secondary" style={{ fontSize: '0.7rem' }} />
      )}
      {row.weak_areas.length === 0 && <span className="text-400 text-sm">—</span>}
    </div>
  )

  const focusTemplate = (row: InsightsData) => (
    <span className="text-700 text-sm">{row.recommended_focus[0] ?? '—'}</span>
  )

  return (
    <div className="flex flex-column align-items-center surface-ground min-h-screen px-3 py-5 gap-4">
      <Toast ref={toast} />

      <Card
        title="AdaptiQuiz"
        subTitle="AI-powered adaptive quizzing — pick a topic and let the agent calibrate to your level."
        className="w-full sm:w-10 md:w-6 lg:w-5 shadow-4"
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

      {topicInsights.length > 0 && (
        <Card title="Your Previous Topics" className="w-full sm:w-10 md:w-6 lg:w-5 shadow-2">
          <DataTable value={topicInsights} size="small" stripedRows>
            <Column field="topic" header="Topic" style={{ minWidth: '100px' }} />
            <Column header="Mastery" body={masteryTemplate} style={{ minWidth: '110px' }} />
            <Column header="Weak Areas" body={weakAreasTemplate} style={{ minWidth: '140px' }} />
            <Column header="Focus Next" body={focusTemplate} style={{ minWidth: '120px' }} />
          </DataTable>
        </Card>
      )}
    </div>
  )
}
