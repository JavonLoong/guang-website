import { useState, useEffect } from 'react'

export default function CountUp({ end, duration = 800 }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (end === 0) return
    let start = 0
    const step = Math.ceil(end / (duration / 50))
    const timer = setInterval(() => {
      start += step
      if (start >= end) { start = end; clearInterval(timer) }
      setCount(start)
    }, 50)
    return () => clearInterval(timer)
  }, [end, duration])

  return <>{count}</>
}
