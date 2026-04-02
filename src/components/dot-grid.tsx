'use client'

import { useEffect, useRef } from 'react'

interface DotGridProps {
  color?: string
}

export default function DotGrid({ color = '#ffffff' }: DotGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: -1000, y: -1000 })
  const animFrameRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const GAP = 28
    const BASE_RADIUS = 1.8
    const MOUSE_RADIUS = 150
    const MAX_PUSH = 18
    const BASE_OPACITY = 0.4
    const HOVER_OPACITY = 0.9

    function resize() {
      canvas!.width = window.innerWidth
      canvas!.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    function handleMouseMove(e: MouseEvent) {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', handleMouseMove)

    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)

      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      const cols = Math.ceil(canvas!.width / GAP) + 1
      const rows = Math.ceil(canvas!.height / GAP) + 1
      const offsetX = (canvas!.width - (cols - 1) * GAP) / 2
      const offsetY = (canvas!.height - (rows - 1) * GAP) / 2

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const baseX = offsetX + c * GAP
          const baseY = offsetY + r * GAP

          const dx = baseX - mx
          const dy = baseY - my
          const dist = Math.sqrt(dx * dx + dy * dy)

          let drawX = baseX
          let drawY = baseY
          let radius = BASE_RADIUS
          let opacity = BASE_OPACITY

          if (dist < MOUSE_RADIUS) {
            const t = 1 - dist / MOUSE_RADIUS
            const ease = t * t * t
            const push = ease * MAX_PUSH
            const angle = Math.atan2(dy, dx)
            drawX = baseX + Math.cos(angle) * push
            drawY = baseY + Math.sin(angle) * push
            radius = BASE_RADIUS + ease * 1.2
            opacity = BASE_OPACITY + (HOVER_OPACITY - BASE_OPACITY) * ease
          }

          ctx!.beginPath()
          ctx!.arc(drawX, drawY, radius, 0, Math.PI * 2)
          ctx!.fillStyle = color
          ctx!.globalAlpha = opacity
          ctx!.fill()
        }
      }

      ctx!.globalAlpha = 1
      animFrameRef.current = requestAnimationFrame(draw)
    }

    animFrameRef.current = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [color])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
    />
  )
}
