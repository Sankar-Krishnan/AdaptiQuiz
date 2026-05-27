import { useNavigate } from 'react-router-dom'
import { Card } from 'primereact/card'
import { Button } from 'primereact/button'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { Tag } from 'primereact/tag'
import DifficultyBadge from '@/components/DifficultyBadge'
import type { HistoryEntry, QuizSession } from '@/types/quiz'

interface Props {
  session: QuizSession | null
  onReset: () => void
}

export default function ResultsPage({ session, onReset }: Props) {
  const navigate = useNavigate()

  function handleNewQuiz() {
    onReset()
    navigate('/')
  }

  const total = session?.history.length ?? 0
  const score = session?.score ?? 0
  const pct = total > 0 ? Math.round((score / total) * 100) : 0

  const correctTemplate = (row: HistoryEntry) => (
    <Tag
      value={row.correct ? 'Correct' : 'Wrong'}
      severity={row.correct ? 'success' : 'danger'}
    />
  )

  const difficultyTemplate = (row: HistoryEntry) => (
    <DifficultyBadge difficulty={row.difficulty} />
  )

  return (
    <div className="flex justify-content-center surface-ground min-h-screen py-5 px-3">
      <div className="w-full md:w-10 lg:w-8 flex flex-column gap-4">

        {/* Summary card */}
        <Card className="shadow-3 text-center">
          <div className="flex flex-column align-items-center gap-3">
            <i className="pi pi-trophy text-yellow-500" style={{ fontSize: '3rem' }} />
            <h2 className="m-0 text-900">Quiz Complete!</h2>
            {session && (
              <p className="m-0 text-600 text-lg">
                Topic: <strong>{session.topic}</strong>
              </p>
            )}
            <div className="flex gap-5 mt-2">
              <div className="text-center">
                <p className="m-0 text-4xl font-bold text-primary">{score}/{total}</p>
                <p className="m-0 text-500 text-sm mt-1">Questions correct</p>
              </div>
              <div className="text-center">
                <p className="m-0 text-4xl font-bold text-primary">{pct}%</p>
                <p className="m-0 text-500 text-sm mt-1">Accuracy</p>
              </div>
              <div className="text-center">
                <p className="m-0 text-4xl font-bold text-primary">{session?.difficulty ?? 1}</p>
                <p className="m-0 text-500 text-sm mt-1">Final level</p>
              </div>
            </div>
            <Button
              label="Start New Quiz"
              icon="pi pi-refresh"
              className="mt-3"
              onClick={handleNewQuiz}
            />
          </div>
        </Card>

        {/* History table */}
        {total > 0 && (
          <Card title="Question History" className="shadow-2">
            <DataTable value={session?.history} stripedRows showGridlines>
              <Column
                field="question"
                header="Question"
                style={{ maxWidth: '40%' }}
                bodyStyle={{ whiteSpace: 'normal', lineHeight: '1.5' }}
              />
              <Column
                field="answer"
                header="Your Answer"
                style={{ maxWidth: '30%' }}
                bodyStyle={{ whiteSpace: 'normal', lineHeight: '1.5' }}
              />
              <Column header="Result" body={correctTemplate} style={{ width: '8rem' }} />
              <Column header="Level" body={difficultyTemplate} style={{ width: '8rem' }} />
            </DataTable>
          </Card>
        )}
      </div>
    </div>
  )
}
