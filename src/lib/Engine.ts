import Box from "./Box"
import Link from "./Link"
import Painter from "./Painter"
import { assert } from "../utils"

export enum ItemType {
  Box = "box",
  Link = "link"
}

enum PointerState {
  Up = "up",
  Down = "down"
}

interface JSONData {
  boxes: {
    x: number
    y: number
    w: number
    h: number
    id: string
  }[]
  links: {
    to: string
    from: string
    bow: number
    id: string
  }[]
  selected?: string
}

export default class Engine {
  canvas: HTMLCanvasElement
  pointer = { x: 0, y: 0 }
  pointerState = PointerState.Up
  boxes = new Set<Box>([])
  links = new Set<Link>([])
  painter: Painter
  _hovered?: Box | Link
  _selected?: Box | Link

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.painter = new Painter(canvas)
    window.addEventListener("resize", this.resize)
    window.addEventListener("pointermove", this.handlePointerMove)
    window.addEventListener("pointerdown", this.handlePointerDown)
    window.addEventListener("pointerup", this.handlePointerUp)
    this.load()
    this.render()
  }

  // Data

  load() {
    let data = null
    data =
      window.localStorage !== undefined
        ? localStorage.getItem("arrows_sandbox")
        : null

    if (data === null) {
      const box1 = this.createBox(200, 100, 100, 100)
      const box2 = this.createBox(400, 100, 100, 100)
      const box3 = this.createBox(100, 260, 100, 100)
      const box4 = this.createBox(500, 260, 100, 100)
      this.createLink(box1, box2)
      this.createLink(box2, box3)
      this.createLink(box3, box4, 100)
      this.createLink(box4, box2, 100)
      return
    }

    const json: JSONData = JSON.parse(data)

    const boxes = Object.fromEntries(
      json.boxes.map(({ x, y, w, h, id }) => [
        id,
        this.createBox(x, y, w, h, id)
      ])
    )

    const links = Object.fromEntries(
      json.links.map(({ to, from, bow, id }) => {
        const a = boxes[to]
        const b = boxes[from]
        assert(a)
        assert(b)

        return [id, this.createLink(b, a, bow, id)]
      })
    )

    if (json.selected) {
      this.selected = boxes[json.selected] || links[json.selected]
    }
  }

  save() {
    const boxes = Array.from(this.boxes.values()).map((box) => box.toObject())
    const links = Array.from(this.links.values()).map((link) => link.toObject())
    const jsonData: JSONData = { boxes, links, selected: this.selected?.id }
    localStorage.setItem("arrows_sandbox", JSON.stringify(jsonData))
  }

  destroy() {
    const { canvas } = this
    window.removeEventListener("resize", this.resize)
    window.removeEventListener("pointermove", this.handlePointerMove)
    window.removeEventListener("pointerdown", this.handlePointerDown)
    window.removeEventListener("pointerup", this.handlePointerUp)
  }

  // Create

  createBox(x: number, y: number, w: number, h: number, id?: string) {
    const box = new Box(x, y, w, h, id)
    this.boxes.add(box)
    return box
  }

  createLink(from: Box, to: Box, bow = 0, id?: string) {
    const link = new Link(from, to, bow, id)
    this.links.add(link)
    from.links.add(link)
    to.links.add(link)
    return link
  }

  // Update

  moveBox(box: Box, dx: number, dy: number) {
    box.x += dx
    box.y += dy
    box.links.forEach((link) => link.update())
  }

  updateLink(link: Link, from: Box, to: Box) {
    link.from.links.delete(link)
    link.to.links.delete(link)
    link.from = from
    link.to = to
    link.from.links.add(link)
    link.to.links.add(link)
  }

  resize() {
    this.painter?.setupCanvas()
    this.render()
  }

  // Destroy

  destroyBox(box: Box) {
    this.boxes.delete(box)
  }

  destroyLink(link: Link) {
    this.links.delete(link)
    this.boxes.forEach((box) => box.links.delete(link))
  }

  // Interactions

  handlePointerMove = (e: PointerEvent) => {
    const { selected } = this
    const dpr = window.devicePixelRatio || 1
    const x = e.pageX * dpr
    const y = e.pageY * dpr
    const dx = (x - this.pointer.x) / dpr
    const dy = (y - this.pointer.y) / dpr
    this.pointer = { x, y }

    const items = [...this.boxes.values(), ...this.links.values()]

    if (selected) {
      if (selected instanceof Box) {
        this.moveBox(selected, dx, dy)
      } else if (selected instanceof Link) {
        selected.moveBowControl(dx, dy, x / dpr, y / dpr)
      } else {
      }
      this.render()
      return
    }

    this.hovered = items.find((item) =>
      this.painter.ctx.isPointInPath(item.path, x, y)
    )
  }

  handlePointerDown = (e: PointerEvent) => {
    this.pointerState = PointerState.Down
    if (this.hovered) this.selected = this.hovered
    this.hovered = undefined
  }

  handlePointerUp = (e: PointerEvent) => {
    this.pointerState = PointerState.Up
    this.selected = undefined
    this.save()
  }

  // Properties

  get hovered() {
    return this._hovered
  }

  set hovered(hovered: Box | Link | undefined) {
    if (this._hovered === hovered) return
    if (this._hovered) this._hovered.hovered = false
    this._hovered = hovered
    if (this._hovered) this._hovered.hovered = true
    this.render()
  }

  get selected() {
    return this._selected
  }

  set selected(selected: Box | Link | undefined) {
    if (this._selected === selected) return
    if (this._selected) this._selected.selected = false
    this._selected = selected
    if (this._selected) {
      this._selected.selected = true
      if (this._selected instanceof Link) {
        this._selected.setOrigin()
      }
    }
    this.render()
  }

  // Render

  updateCursor() {
    document.body.style.cursor =
      this.hovered || this.selected ? "pointer" : "default"
  }

  render() {
    this.painter.clean()
    this.boxes.forEach((box) => this.painter.drawBox(box))
    this.links.forEach((link) => this.painter.drawLink(link))
    this.updateCursor()

    // this.painter.ctx.fillStyle = "rgba(255, 0, 0, .2)"
    // this.boxes.forEach((link) => this.painter.ctx.fill(link.path))
    // this.links.forEach((link) => {
    //   const [sx, sy, cx, cy, cr, ex, ey, sa, ea, acw] = link.arrow

    // if (acw === 0) {
    //   const [x0, y0] = projectPoint(sx, sy, sa - Math.PI / 2, w)
    //   const [x1, y1] = projectPoint(ex, ey, ea - Math.PI / 2, w)
    //   const [x2, y2] = projectPoint(ex, ey, ea + Math.PI / 2, w)
    //   const [x3, y3] = projectPoint(sx, sy, sa + Math.PI / 2, w)
    //   p.moveTo(x0, y0)
    //   p.lineTo(x1, y1)
    //   p.lineTo(x2, y2)
    //   p.lineTo(x3, y3)
    // } else {
    // if (acw !== 0) {
    // this.painter.ctx.beginPath()
    // this.painter.ctx.beginPath()
    // this.painter.ctx.arc(cx, cy, cr, 0, Math.PI * 2, acw === 1)
    // this.painter.ctx.strokeStyle = "rgba(0,0,0, .16)"
    // this.painter.ctx.stroke()
    // this.painter.ctx.strokeStyle = "dodgerblue"
    // this.painter.ctx.arc(cx, cy, cr - 12, ea, sa, acw !== 1)
    // this.painter.ctx.stroke()
    // this.painter.ctx.arc(cx, cy, cr + 12, 0, Math.PI * 2, acw === 1)
    // this.painter.ctx.strokeStyle = "rgba(255, 0, 0, .16)"
    // this.painter.ctx.stroke()
    // this.painter.ctx.beginPath()
    // this.painter.ctx.arc(cx, cy, cr + 12, sa, ea, acw === 1)
    // this.painter.ctx.strokeStyle = "red"
    // this.painter.ctx.stroke()
    // this.painter.ctx.beginPath()
    // this.painter.ctx.arc(cx, cy, cr - 12, 0, Math.PI * 2, acw === 1)
    // this.painter.ctx.strokeStyle = "rgba(0, 0, 255, .16)"
    // this.painter.ctx.stroke()
    // this.painter.ctx.beginPath()
    // this.painter.ctx.strokeStyle = "dodgerblue"
    // this.painter.ctx.arc(cx, cy, cr - 12, ea, sa, acw !== 1)
    // this.painter.ctx.stroke()
    // this.painter.ctx.strokeStyle = "dodgerblue"
    // this.painter.ctx.beginPath()
    // this.painter.ctx.arc(cx, cy, cr - 12, ea, sa, acw !== 1)
    // this.painter.ctx.arc(cx, cy, cr + 12, sa, ea, acw === 1)
    // this.painter.ctx.closePath()
    // this.painter.ctx.stroke()
    // }

    // this.painter.ctx.stroke(link.path)
    // })

    // this.links.forEach((link) => this.painter.ctx.fill(link.path))
  }
}
