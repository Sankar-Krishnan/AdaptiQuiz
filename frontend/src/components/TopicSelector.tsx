import { useState } from 'react'
import { InputText } from 'primereact/inputtext'
import { Dropdown } from 'primereact/dropdown'

const SUGGESTED_TOPICS = [
  'Mathematics',
  'Science',
  'History',
  'Geography',
  'General Knowledge',
]

interface Props {
  onChange: (topic: string) => void
}

export default function TopicSelector({ onChange }: Props) {
  const [topic, setTopic] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  function handleDropdownChange(value: string) {
    setSelected(value)
    setTopic(value)
    onChange(value)
  }

  function handleTextChange(value: string) {
    setTopic(value)
    setSelected(null)  // clear dropdown highlight when user types custom topic
    onChange(value)
  }

  return (
    <div className="flex flex-column gap-3">
      <div className="flex flex-column gap-1">
        <label className="font-medium text-700" htmlFor="topic-input">Topic</label>
        <InputText
          id="topic-input"
          value={topic}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Enter any topic or pick one below…"
          className="w-full"
        />
      </div>

      <div className="flex flex-column gap-1">
        <label className="font-medium text-700" htmlFor="topic-dropdown">Or choose a suggestion</label>
        <Dropdown
          inputId="topic-dropdown"
          value={selected}
          options={SUGGESTED_TOPICS}
          onChange={(e) => handleDropdownChange(e.value as string)}
          placeholder="Suggested topics"
          className="w-full"
        />
      </div>
    </div>
  )
}
