import { useRef, useState } from 'react'
import { InputTextarea } from 'primereact/inputtextarea'
import { Button } from 'primereact/button'
import { Messages } from 'primereact/messages'
import type { Messages as MessagesType } from 'primereact/messages'

interface Props {
  onSubmit: (answer: string) => void
  loading: boolean
}

export default function AnswerInput({ onSubmit, loading }: Props) {
  const [value, setValue] = useState('')
  const msgs = useRef<MessagesType>(null)

  function handleSubmit() {
    if (!value.trim()) {
      msgs.current?.show({ severity: 'warn', summary: 'Please enter your answer before submitting.', life: 3000 })
      return
    }
    onSubmit(value.trim())
    setValue('')
  }

  return (
    <div className="flex flex-column gap-3">
      <Messages ref={msgs} />
      <InputTextarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        placeholder="Type your answer here…"
        className="w-full"
        disabled={loading}
        autoResize
      />
      <Button
        label="Submit Answer"
        icon="pi pi-send"
        onClick={handleSubmit}
        loading={loading}
        className="w-full"
      />
    </div>
  )
}
