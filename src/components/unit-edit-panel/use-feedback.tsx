// Campaign TOW — Feedback message hook + component

import { useEffect, useRef, useState } from 'react'

export function useFeedback() {
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function show(text: string, isError: boolean) {
    if (timerRef.current) clearTimeout(timerRef.current)
    setMessage({ text, isError })
    timerRef.current = setTimeout(() => setMessage(null), 3000)
  }

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  return { message, show }
}

export function FeedbackMsg({ message }: { message: { text: string; isError: boolean } | null }) {
  if (!message || !message.text) return null
  return (
    <p className={`text-xs mt-2 ${message.isError ? 'text-[var(--color-malus)]' : 'text-[var(--color-bonus)]'}`}>
      {message.text}
    </p>
  )
}
