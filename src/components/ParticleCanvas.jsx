import { useRef, useEffect } from 'react'

export default function ParticleCanvas() {
  const canvasRef = useRef(null)
  const mouseRef = useRef({ x: null, y: null })
  const particlesRef = useRef([])
  const animFrameRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    function resize() {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    const handleMouseLeave = () => {
      mouseRef.current = { x: null, y: null }
    }
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseleave', handleMouseLeave)

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width
        this.y = Math.random() * canvas.height
        this.size = Math.random() * 2 + 0.5
        this.baseX = this.x
        this.baseY = this.y
        this.density = Math.random() * 30 + 1
        this.color = Math.random() > 0.5 ? 'rgba(108,92,231,0.4)' : 'rgba(0,206,201,0.4)'
        this.vx = (Math.random() - 0.5) * 0.5
        this.vy = (Math.random() - 0.5) * 0.5
      }
      update() {
        const m = mouseRef.current
        if (m.x != null) {
          let dx = m.x - this.x, dy = m.y - this.y
          let dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 100) {
            let force = (100 - dist) / 100
            this.x -= (dx / dist) * force * this.density
            this.y -= (dy / dist) * force * this.density
          } else {
            this.x -= (this.x - this.baseX) / 10
            this.y -= (this.y - this.baseY) / 10
          }
        } else {
          this.x += this.vx; this.y += this.vy
          if (this.x > canvas.width || this.x < 0) this.vx = -this.vx
          if (this.y > canvas.height || this.y < 0) this.vy = -this.vy
        }
      }
      draw() {
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fillStyle = this.color
        ctx.fill()
      }
    }

    let num = Math.min(Math.floor((canvas.width * canvas.height) / 8000), 100)
    particlesRef.current = Array.from({ length: num }, () => new Particle())

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const ps = particlesRef.current
      for (let i = 0; i < ps.length; i++) {
        ps[i].update(); ps[i].draw()
        for (let j = i + 1; j < ps.length; j++) {
          let dx = ps[i].x - ps[j].x, dy = ps[i].y - ps[j].y
          let dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 100) {
            ctx.beginPath()
            ctx.strokeStyle = `rgba(108,92,231,${0.2 - dist / 500})`
            ctx.lineWidth = 1
            ctx.moveTo(ps[i].x, ps[i].y)
            ctx.lineTo(ps[j].x, ps[j].y)
            ctx.stroke()
          }
        }
      }
      animFrameRef.current = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  return <canvas ref={canvasRef} className="hero-canvas" />
}
