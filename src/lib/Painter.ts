import Link from "./Link"
import Box from "./Box"

type InteractionState = "idle" | "selected" | "hovered"

const STROKE_COLORS: Record<InteractionState, string> = {
  selected: "royalblue",
  hovered: "dodgerblue",
  idle: "black"
}

const ANCHOR_COLORS: Record<InteractionState, string> = {
  selected: "royalblue",
  hovered: "dodgerblue",
  idle: "black"
}

type Circle = {
  x: number
  y: number
  r: number
}

// type Box = {
//   x: number
//   y: number
//   w: number
//   h: number
// }

type Point = {
  x: number
  y: number
}

export default class Painter {
  ctx: CanvasRenderingContext2D
  canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = this.setupCanvas()
    this.clean()
  }

  // Public

  clean() {
    const { canvas, ctx } = this
    this.resetTransform()
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  drawBox(box: Box, state: InteractionState = "idle") {
    const strokeColor = STROKE_COLORS[state]
    this.drawRectangle(box.x, box.y, box.w, box.h, strokeColor)
  }

  drawLink(link: Link, state: InteractionState = "idle") {
    const strokeColor = STROKE_COLORS[state]
    this.drawArrow(link.arrow, strokeColor)
  }

  // Private

  resetTransform() {
    this.ctx.resetTransform()
    var dpr = window.devicePixelRatio || 1
    this.ctx.scale(dpr, dpr)
  }

  drawDot(x: number, y: number, r = 4, color = "#000") {
    const { ctx } = this
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(x + r / 2, y)
    ctx.ellipse(x, y, r, r, 0, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.restore()
  }

  drawRectangle(x: number, y: number, w: number, h: number, color = "#000") {
    const { ctx } = this
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(x, y)

    ctx.strokeStyle = color
    ctx.strokeRect(x, y, w, h)

    ctx.restore()
  }

  fillRectangle(x: number, y: number, w: number, h: number, color = "#000") {
    const { ctx } = this
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(x, y)

    ctx.fillStyle = color
    ctx.fillRect(x, y, w, h)

    ctx.restore()
  }

  drawCircle(x: number, y: number, r: number, stroke = "#000", fill?: string) {
    const { ctx } = this
    ctx.save()
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    if (fill) {
      ctx.fillStyle = fill
      ctx.fill()
    }
    ctx.strokeStyle = stroke
    ctx.stroke()
    ctx.restore()
  }

  drawArrowhead(x: number, y: number, angle: number, color = "#000") {
    const { ctx } = this
    ctx.save()
    ctx.beginPath()
    ctx.translate(x, y)
    ctx.rotate(angle)
    ctx.moveTo(0, 0)
    ctx.lineTo(0, 0 + 6)
    ctx.lineTo(0 + 12, 0)
    ctx.lineTo(0, 0 - 6)
    ctx.lineTo(0, 0)
    ctx.fillStyle = color
    ctx.fill()
    // ctx.resetTransform()
    ctx.restore()
  }

  drawArrow(args: number[], color = "#000") {
    const { ctx } = this
    const [sx, sy, cx, cy, cr, ex, ey, sa, ea, ccw] = args

    this.drawDot(sx, sy, 4, color)

    ctx.beginPath()
    if (cr === 0) {
      ctx.moveTo(sx, sy)
      ctx.lineTo(ex, ey)
    } else {
      ctx.arc(
        cx, // x
        cy, // y
        cr, // radius
        sa, // start angle
        ea, // end angle
        ccw === 1 // anticlockwise
      )
    }

    ctx.save()
    ctx.strokeStyle = color
    ctx.stroke()
    this.drawArrowhead(ex, ey, ea - (Math.PI / 2) * ccw, color)
    ctx.restore()
  }

  drawBrush(x: number, y: number, w: number, h: number) {
    this.fillRectangle(x, y, w, h, "rgba(0,60,255,.1)")
  }

  drawBounds(x: number, y: number, w: number, h: number) {
    this.drawRectangle(x, y, w, h, "rgba(0,60,255,.5)")
  }

  setupCanvas() {
    const { canvas } = this
    // Get the device pixel ratio, falling back to 1.
    var dpr = window.devicePixelRatio || 1
    // Get the size of the canvas's parent container in CSS pixels.
    var rect = (canvas.parentElement || document.body).getBoundingClientRect()
    // Give the canvas pixel dimensions of their CSS
    // size * the device pixel ratio.
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    canvas.style.setProperty("transform-origin", `top left`)
    canvas.style.setProperty("transform", `scale(${1 / dpr})`)
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D
    ctx.lineWidth = 2
    return ctx
  }
}
