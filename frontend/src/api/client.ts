import axios from 'axios'
import type { AnswerRequest, AnswerResponse, StartQuizRequest, StartQuizResponse } from '@/types/quiz'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,   // Groq can take a moment on the free tier
})

// Attach request timestamp for debugging
api.interceptors.request.use((config) => {
  config.headers['X-Request-Time'] = new Date().toISOString()
  return config
})

// Normalise error messages so callers get a plain string
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      return Promise.reject(new Error('Could not reach the server. Please try again.'))
    }
    const detail = error.response.data?.detail ?? error.response.statusText ?? 'An unexpected error occurred.'
    return Promise.reject(new Error(detail))
  },
)

export async function startQuiz(payload: StartQuizRequest): Promise<StartQuizResponse> {
  // Backend expects student_id; generate a simple one client-side if not provided
  const body = {
    ...payload,
    student_id: payload.student_id ?? `student_${Date.now()}`,
  }
  const { data } = await api.post<StartQuizResponse>('/quiz/start', body)
  // Backend doesn't echo student_id back, so attach it from the request
  return { ...data, student_id: body.student_id }
}

export async function submitAnswer(payload: AnswerRequest): Promise<AnswerResponse> {
  const { data } = await api.post<AnswerResponse>('/quiz/answer', payload)
  return data
}
