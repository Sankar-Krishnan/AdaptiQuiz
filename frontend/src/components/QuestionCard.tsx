import { Card } from 'primereact/card'
import DifficultyBadge from './DifficultyBadge'

interface Props {
  question: string
  difficulty: number
  questionNumber: number
}

export default function QuestionCard({ question, difficulty, questionNumber }: Props) {
  const header = (
    <div className="flex justify-content-between align-items-center px-4 pt-3">
      <span className="text-sm text-500 font-medium">Question {questionNumber}</span>
      <DifficultyBadge difficulty={difficulty} />
    </div>
  )

  return (
    <Card header={header} className="shadow-3">
      <p className="m-0 text-2xl line-height-3 font-medium text-900">{question}</p>
    </Card>
  )
}
