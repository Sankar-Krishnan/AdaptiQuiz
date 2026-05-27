import { ProgressBar } from 'primereact/progressbar'

interface Props {
  score: number    // number of correct answers
  total: number    // total questions answered
  streak: number
}

export default function ScoreBar({ score, total, streak }: Props) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0

  return (
    <div className="flex flex-column gap-2">
      <ProgressBar value={pct} showValue={false} style={{ height: '8px' }} />
      <div className="flex justify-content-between">
        <span className="text-sm text-600">
          Score: <strong>{score}/{total}</strong> ({pct}%)
        </span>
        <span className="text-sm text-600">
          Streak: <strong>{streak}</strong>
        </span>
      </div>
    </div>
  )
}
