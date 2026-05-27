import { Tag } from 'primereact/tag'

interface Props {
  difficulty: number
}

function getDifficultyMeta(difficulty: number): { label: string; severity: 'success' | 'warning' | 'danger' } {
  if (difficulty <= 2) return { label: `Easy (${difficulty})`, severity: 'success' }
  if (difficulty === 3) return { label: `Medium (${difficulty})`, severity: 'warning' }
  return { label: `Hard (${difficulty})`, severity: 'danger' }
}

export default function DifficultyBadge({ difficulty }: Props) {
  const { label, severity } = getDifficultyMeta(difficulty)
  return <Tag value={label} severity={severity} />
}
