import axios from 'axios'
import type {
  AnswerRequest,
  AnswerResponse,
  StartQuizRequest,
  StartQuizResponse,
  SignUpRequest,
  LoginRequest,
  AuthResponse,
  InsightsData,
  FinishResponse,
} from '@/types/quiz'

const TOKEN_KEY = 'aq_token'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,   // GitHub Models may retry on rate limit — allow up to 60s
})

// Attach JWT and request timestamp on every request
api.interceptors.request.use((config) => {
  config.headers['X-Request-Time'] = new Date().toISOString()
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

// Normalise error messages so callers get a plain string
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      return Promise.reject(new Error('Could not reach the server. Please try again.'))
    }
    const detail =
      error.response.data?.detail ??
      error.response.statusText ??
      'An unexpected error occurred.'
    return Promise.reject(new Error(detail))
  },
)

// --- Auth ---

export async function signUp(payload: SignUpRequest): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/signup', payload)
  return data
}

export async function login(payload: LoginRequest): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', payload)
  return data
}

// --- Quiz ---

export async function startQuiz(payload: StartQuizRequest): Promise<StartQuizResponse> {
  const { data } = await api.post<StartQuizResponse>('/quiz/start', payload)
  return data
}

export async function submitAnswer(payload: AnswerRequest): Promise<AnswerResponse> {
  const { data } = await api.post<AnswerResponse>('/quiz/answer', payload)
  return data
}

export async function finishQuiz(session_id: string): Promise<FinishResponse> {
  const { data } = await api.post<FinishResponse>('/quiz/finish', { session_id })
  return data
}

export async function getInsights(): Promise<InsightsData[]> {
  const { data } = await api.get<InsightsData[]>('/quiz/insights')
  return data
}
