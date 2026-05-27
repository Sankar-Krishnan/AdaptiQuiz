import { Message } from 'primereact/message'

interface Props {
  correct: boolean
  explanation: string
  feedback: string
}

export default function FeedbackPanel({ correct, explanation, feedback }: Props) {
  return (
    <div className="flex flex-column gap-3">
      <Message
        severity={correct ? 'success' : 'error'}
        text={correct ? `Correct! ${explanation}` : `Incorrect. ${explanation}`}
        className="w-full"
      />
      <p className="m-0 text-700 line-height-3">{feedback}</p>
    </div>
  )
}
