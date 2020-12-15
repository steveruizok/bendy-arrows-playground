import uniqueId from "lodash/uniqueId"
import Link from "./Link"

export default class Box {
  id = uniqueId()
  type = "box"
  x: number
  y: number
  w: number
  h: number
  links = new Set<Link>([])
  hovered = false
  selected = false

  constructor(x: number, y: number, w: number, h: number, id?: string) {
    if (id) {
      this.id = id
    }
    this.x = x
    this.y = y
    this.w = w
    this.h = h
  }

  get cx() {
    return this.x + this.w / 2
  }

  get cy() {
    return this.y + this.h / 2
  }

  get maxX() {
    return this.x + this.w
  }

  get maxY() {
    return this.y + this.h
  }

  get path() {
    const { x, y, w, h } = this
    const p = new Path2D()
    p.rect(x, y, w, h)
    return p
  }

  toObject() {
    const { id, x, y, w, h } = this
    const links = Array.from(this.links.values()).map((link) => link.id)
    return { id, x, y, w, h, links }
  }
}
