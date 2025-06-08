"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface AnimatedHeightProps {
  children: React.ReactNode
  className?: string
  duration?: number
}

export default function AnimatedHeight({ children, className, duration = 300 }: AnimatedHeightProps) {
  const [height, setHeight] = useState<number | "auto">("auto")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setHeight(entry.contentRect.height)
      }
    })

    resizeObserver.observe(ref.current)
    return () => resizeObserver.disconnect()
  }, [])

  return (
    <div
      className={cn("overflow-hidden transition-all ease-in-out", className)}
      style={{
        height: height === "auto" ? "auto" : `${height}px`,
        transitionDuration: `${duration}ms`,
      }}
    >
      <div ref={ref}>{children}</div>
    </div>
  )
}
