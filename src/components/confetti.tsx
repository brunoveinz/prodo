'use client'

import { useEffect, useRef } from 'react'

interface ConfettiProps {
  color?: string
  onDone?: () => void
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  rotation: number
  rotationSpeed: number
  opacity: number
}

const COLORS = ['#f43f5e', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4']

export default function Confetti({ color, onDone }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const palette = color ? [color, ...COLORS] : COLORS
    const particles: Particle[] = []

    // Create particles from multiple burst points
    for (let burst = 0; burst < 5; burst++) {
      const cx = canvas.width * (0.2 + Math.random() * 0.6)
      const cy = canvas.height * (0.3 + Math.random() * 0.3)

      for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 4 + Math.random() * 10
        particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 4,
          size: 4 + Math.random() * 6,
          color: palette[Math.floor(Math.random() * palette.length)],
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.3,
          opacity: 1,
        })
      }
    }

    let frame = 0
    const maxFrames = 120

    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
      frame++

      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.25 // gravity
        p.vx *= 0.99
        p.rotation += p.rotationSpeed
        p.opacity = Math.max(0, 1 - frame / maxFrames)

        ctx!.save()
        ctx!.translate(p.x, p.y)
        ctx!.rotate(p.rotation)
        ctx!.globalAlpha = p.opacity
        ctx!.fillStyle = p.color
        ctx!.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
        ctx!.restore()
      }

      if (frame < maxFrames) {
        requestAnimationFrame(draw)
      } else {
        onDone?.()
      }
    }

    requestAnimationFrame(draw)
  }, [color, onDone])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[100] pointer-events-none"
    />
  )
}
