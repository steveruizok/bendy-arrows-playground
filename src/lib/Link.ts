import uniqueId from "lodash/uniqueId"
import Box from "./Box"
import {
  projectPoint,
  getAngle,
  normalizeAngle,
  circleFromThreePoints,
  getSegmentRectangleIntersectionPoints,
  getCircleRectangleIntersectionPoints,
  getPointBetween,
  getDistance,
  getAngleDistance
} from "./utils"

export type ArrowOptions = {
  bow?: number
  padStart?: number
  padEnd?: number
}

function getAnchorPoint(
  x0: number,
  y0: number,
  w0: number,
  h0: number,
  x1: number,
  y1: number,
  w1: number,
  h1: number,
  options: ArrowOptions = {} as ArrowOptions
): number[] {
  const { bow = 0 } = options

  let cx0 = x0 + w0 / 2,
    cy0 = y0 + h0 / 2,
    cx1 = x1 + w1 / 2,
    cy1 = y1 + h1 / 2,
    dx = cx1 - cx0,
    dy = cy1 - cy0,
    cx = cx0 + dx / 2,
    cy = cy0 + dy / 2,
    angle = getAngle(cx0, cy0, cx1, cy1)

  // Create a anchor point based on the arc and distance
  return projectPoint(
    cx,
    cy,
    angle + (bow > 0 ? Math.PI / 2 : -Math.PI / 2),
    Math.abs(bow)
  )
}

function getCurvedBoxToBoxArrow(
  x0: number,
  y0: number,
  w0: number,
  h0: number,
  x1: number,
  y1: number,
  w1: number,
  h1: number,
  options: ArrowOptions = {} as ArrowOptions
): number[] {
  const { bow = 0, padStart = 0, padEnd = 20 } = options

  let sx: number,
    sy: number,
    sa: number,
    ex: number,
    ey: number,
    ea: number,
    s0: number[],
    s1: number[],
    e0: number[],
    e1: number[],
    cx0 = x0 + w0 / 2,
    cy0 = y0 + h0 / 2,
    cx1 = x1 + w1 / 2,
    cy1 = y1 + h1 / 2,
    angle = getAngle(cx0, cy0, cx1, cy1)

  if (bow === 0) {
    let [[sx, sy]] = getSegmentRectangleIntersectionPoints(
      cx0,
      cy0,
      cx1,
      cy1,
      x0,
      y0,
      w0,
      h0
    )
    let [[ex, ey]] = getSegmentRectangleIntersectionPoints(
      cx0,
      cy0,
      cx1,
      cy1,
      x1,
      y1,
      w1,
      h1
    )
    sa = getAngle(cx0, cy0, cx1, cy1)
    ea = sa
    ;[sx, sy] = projectPoint(sx, sy, sa, padStart)
    ;[ex, ey] = projectPoint(ex, ey, ea, -padEnd)
    const [cx, cy] = getPointBetween(cx0, cy0, cx1, cy1)

    return [sx, sy, cx, cy, 0, ex, ey, sa, ea, 0]
  }

  // Create a anchor point based on the arc and distance
  const [ax, ay] = getAnchorPoint(x0, y0, w0, h0, x1, y1, w1, h1, options)

  // Interesting — it looks better if the arrows don't touch the center, but
  // a point just a little bit offset toward the other box.
  let [px0, py0] = projectPoint(cx0, cy0, angle, Math.min(w0, h0) / 6)
  let [px1, py1] = projectPoint(cx1, cy1, angle + Math.PI, Math.min(w1, h1) / 6)

  // Calculate a circle arc that touches both centers and the anchor point
  let [cx, cy, cr] = circleFromThreePoints(px0, py0, px1, py1, ax, ay)

  // Find the intersections between the circle and the rectangles.
  ;[s0, s1] = getCircleRectangleIntersectionPoints(x0, y0, w0, h0, cx, cy, cr)
  ;[e0, e1] = getCircleRectangleIntersectionPoints(x1, y1, w1, h1, cx, cy, cr)

  // If we can't find any intersections, expand the radius until we find one.
  while (!(s1 && e1) && cr < 1000) {
    cr += 20
    ;[s0, s1] = getCircleRectangleIntersectionPoints(x0, y0, w0, h0, cx, cy, cr)
    ;[e0, e1] = getCircleRectangleIntersectionPoints(x1, y1, w1, h1, cx, cy, cr)
  }

  // Find the angles to the inner-most intersection points.
  sa =
    Math.hypot(s0[1] - ay, s0[0] - ax) < Math.hypot(s1[1] - ay, s1[0] - ax)
      ? getAngle(cx, cy, s0[0], s0[1])
      : getAngle(cx, cy, s1[0], s1[1])
  ea =
    Math.hypot(e0[1] - ay, e0[0] - ax) < Math.hypot(e1[1] - ay, e1[0] - ax)
      ? getAngle(cx, cy, e0[0], e0[1])
      : getAngle(cx, cy, e1[0], e1[1])

  // Are the points clockwise or anticlockwise?
  let acw = (bow || 1) > 0 ? 1 : -1

  // Pad out the points
  sa -= (acw * padStart) / cr
  ea += (acw * padEnd) / cr

  // Find final points
  sx = cx + cr * Math.cos(sa)
  sy = cy + cr * Math.sin(sa)
  ex = cx + cr * Math.cos(ea)
  ey = cy + cr * Math.sin(ea)

  return [sx, sy, cx, cy, cr, ex, ey, sa, ea, acw]
}

export default class Link {
  id: string
  type = "link"
  from: Box
  to: Box
  _bow = 0
  options?: ArrowOptions
  hovered = false
  selected = false
  startPoint = { x: 0, y: 0 }
  endPoint = { x: 0, y: 0 }
  midPoint = { x: 0, y: 0 }
  origin = { x: 0, y: 0 }
  _arrow: number[]
  _path: Path2D

  constructor(from: Box, to: Box, bow = 0, id = uniqueId()) {
    this.id = id
    this.from = from
    this.to = to
    this.bow = bow
    ;[this._arrow, this._path] = this.update()
  }

  toObject() {
    const { id, from, to, bow } = this
    return { id, from: from.id, to: to.id, bow }
  }

  update() {
    const { from: a, to: b } = this
    const arrow = getCurvedBoxToBoxArrow(
      a.x,
      a.y,
      a.w,
      a.h,
      b.x,
      b.y,
      b.w,
      b.h,
      {
        bow: this.bow,
        padStart: 10,
        padEnd: 20
      }
    )

    const [mpx, mpy] = getPointBetween(
      a.x + a.w / 2,
      a.y + a.h / 2,
      b.x + b.w / 2,
      b.y + b.h / 2
    )

    this.startPoint = { x: arrow[0], y: arrow[1] }
    this.endPoint = { x: arrow[5], y: arrow[6] }
    this.midPoint = { x: mpx, y: mpy }
    this._arrow = arrow

    const w = 12
    const [sx, sy, cx, cy, cr, ex, ey, sa, ea, acw] = arrow

    const p = new Path2D()
    if (acw === 0) {
      const [x0, y0] = projectPoint(sx, sy, sa - Math.PI / 2, w)
      const [x1, y1] = projectPoint(ex, ey, ea - Math.PI / 2, w)
      const [x2, y2] = projectPoint(ex, ey, ea + Math.PI / 2, w)
      const [x3, y3] = projectPoint(sx, sy, sa + Math.PI / 2, w)
      p.moveTo(x0, y0)
      p.lineTo(x1, y1)
      p.lineTo(x2, y2)
      p.lineTo(x3, y3)
    } else {
      p.arc(cx, cy, cr + w, sa, ea, acw === 1)
      p.arc(cx, cy, cr - w, ea, sa, acw !== 1)
    }

    p.closePath()
    this._path = p

    return [arrow, p] as const
  }

  setOrigin() {
    this.origin = { x: this.arrow[2], y: this.arrow[3] }
  }

  moveBowControl(dx: number, dy: number, x: number, y: number) {
    const { x: mpx, y: mpy } = this.midPoint
    const l = Math.hypot(dx, dy)
    const a = getAngle(mpx, mpy, x, y)
    const d0 = getDistance(mpx, mpy, x, y)
    const d1 = getDistance(mpx, mpy, x + dx, y + dy)
    const direction = d0 < d1 ? 1 : -1
    const flip = normalizeAngle(this.angle - a) - Math.PI > 0 ? 1 : -1
    this._bow += l * direction * flip

    this.update()
  }

  set bow(bow: number) {
    this._bow = bow
  }

  get bow() {
    return Math.abs(this._bow) < 12 ? 0 : this._bow
  }

  get arrow() {
    return this._arrow
  }

  get path() {
    return this._path
  }

  get angle() {
    const { from: a, to: b } = this
    return getAngle(a.x + a.w / 2, a.y + a.h / 2, b.x + b.w / 2, b.y + b.h / 2)
  }

  get distance() {
    const { from: a, to: b } = this
    return Math.hypot(
      b.y + b.h / 2 - a.y + a.h / 2,
      b.x + b.w / 2 - a.x + a.w / 2
    )
  }

  get anchorPath() {
    const [ax, ay] = this.anchorPoint
    const path = new Path2D()
    path.moveTo(ax, ay)
    path.ellipse(ax, ay, 16, 16, 0, 0, Math.PI * 2)
    return path
  }

  get anchorPoint() {
    const { from: a, to: b } = this
    return getAnchorPoint(a.x, a.y, a.w, a.h, b.x, b.y, b.w, b.h, {
      bow: this.bow,
      padStart: 10,
      padEnd: 20
    })
  }
}
