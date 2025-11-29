'use client'

import { useEffect, useState, useRef } from 'react'

interface AnimatedNumberProps {
  value: number
  duration?: number
  className?: string
  decimals?: number
  prefix?: string
  suffix?: string
}

export function AnimatedNumber({ 
  value, 
  duration = 1000, 
  className = '',
  decimals = 0,
  prefix = '',
  suffix = ''
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const animationFrameRef = useRef<number>()
  const startValueRef = useRef(0)
  const displayValueRef = useRef(0)

  // Keep ref in sync with displayValue state
  useEffect(() => {
    displayValueRef.current = displayValue
  }, [displayValue])

  useEffect(() => {
    // Cancel any ongoing animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    const startValue = displayValueRef.current
    startValueRef.current = startValue
    const endValue = value
    const difference = endValue - startValue

    if (difference === 0) {
      return
    }

    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function (ease-out cubic)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = startValueRef.current + (difference * eased)
      
      setDisplayValue(current)

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        setDisplayValue(endValue)
      }
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [value, duration])

  const formattedValue = decimals > 0 
    ? displayValue.toFixed(decimals)
    : Math.round(displayValue)

  return (
    <span className={className}>
      {prefix}{formattedValue}{suffix}
    </span>
  )
}

// Alias para mantener compatibilidad
export const AnimatedNumberSimple = AnimatedNumber

