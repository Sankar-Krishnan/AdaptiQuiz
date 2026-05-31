import { useNavigate } from 'react-router-dom'
import { Card } from 'primereact/card'
import { Button } from 'primereact/button'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { Tag } from 'primereact/tag'
import DifficultyBadge from '@/components/DifficultyBadge'
import type { HistoryEntry, QuizSession, InsightsData } from '@/types/quiz'

interface Props {
  session: QuizSession | null
  insights: InsightsData | null
  onReset: () => void
}

export default function ResultsPage({ session, insights, onReset }: Props) {
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
            <div className="flex flex-wrap justify-content-center gap-4 mt-2">
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

        {/* Insights card */}
        {insights && (
          <Card title="Your Learning Insights" className="shadow-2">
            <div className="flex flex-column gap-4">

              {/* Mastery level */}
              <div className="flex align-items-center gap-3">
                <span className="font-medium text-700 w-8rem">Mastery Level</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <i
                      key={n}
                      className={`pi ${n <= insights.mastery_level ? 'pi-star-fill' : 'pi-star'} text-yellow-500`}
                      style={{ fontSize: '1.1rem' }}
                    />
                  ))}
                </div>
                <span className="text-500 text-sm">({insights.mastery_level}/5)</span>
              </div>

              {/* Summary */}
              {insights.overall_summary && (
                <p className="m-0 text-700 line-height-3">{insights.overall_summary}</p>
              )}

              {/* Strengths */}
              {insights.strengths.length > 0 && (
                <div>
                  <p className="m-0 mb-2 font-medium text-700">Strengths</p>
                  <div className="flex flex-wrap gap-2">
                    {insights.strengths.map((s, i) => (
                      <Tag key={i} value={s} severity="success" />
                    ))}
                  </div>
                </div>
              )}

              {/* Weak areas */}
              {insights.weak_areas.length > 0 && (
                <div>
                  <p className="m-0 mb-2 font-medium text-700">Areas to Improve</p>
                  <div className="flex flex-wrap gap-2">
                    {insights.weak_areas.map((w, i) => (
                      <Tag key={i} value={w} severity="warning" />
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended focus */}
              {insights.recommended_focus.length > 0 && (
                <div>
                  <p className="m-0 mb-2 font-medium text-700">Recommended Focus</p>
                  <ul className="m-0 pl-4">
                    {insights.recommended_focus.map((r, i) => (
                      <li key={i} className="text-700 line-height-3 mb-1">{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="m-0 text-400 text-xs">
                Based on {insights.sessions_analyzed} session{insights.sessions_analyzed !== 1 ? 's' : ''} on this topic.
              </p>
            </div>
          </Card>
        )}

        {/* History table */}
        {total > 0 && (
          <Card title="Question History" className="shadow-2">
            <DataTable
              value={session?.history}
              stripedRows
              showGridlines
              scrollable
              scrollHeight="400px"
              className="text-sm"
            >
              <Column
                field="question"
                header="Question"
                style={{ minWidth: '160px' }}
                bodyStyle={{ whiteSpace: 'normal', lineHeight: '1.5' }}
              />
              <Column
                field="answer"
                header="Your Answer"
                style={{ minWidth: '120px' }}
                bodyStyle={{ whiteSpace: 'normal', lineHeight: '1.5' }}
              />
              <Column header="Result" body={correctTemplate} style={{ minWidth: '80px' }} />
              <Column header="Level" body={difficultyTemplate} style={{ minWidth: '80px' }} />
            </DataTable>
          </Card>
        )}
      </div>
    </div>
  )
}
