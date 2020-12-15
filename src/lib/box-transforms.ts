import Box from "./Box"
import { Pointer, Bounds, BoxTransform } from "types"

export const resizers = {
  edge: null as Resizer | null,
  corner: null as Resizer | null
}

export type Resizer = (
  point: Pointer,
  boxes: Box[],
  bounds: Bounds,
  aspect: boolean
) => void

export function stretchBoxesX(boxes: Box[]) {
  const [first, ...rest] = boxes
  let min = first.x
  let max = first.x + first.w
  for (let box of rest) {
    min = Math.min(min, box.x)
    max = Math.max(max, box.x + box.w)
  }
  for (let box of boxes) {
    box.x = min
    box.w = max - min
  }
}
export function stretchBoxesY(boxes: Box[]) {
  const [first, ...rest] = boxes
  let min = first.y
  let max = first.y + first.h
  for (let box of rest) {
    min = Math.min(min, box.y)
    max = Math.max(max, box.y + box.h)
  }
  for (let box of boxes) {
    box.y = min
    box.h = max - min
  }
}
export function distributeBoxesX(boxes: Box[]) {
  const [first, ...rest] = boxes
  let min = first.x
  let max = first.x + first.w
  let sum = first.w

  for (let box of rest) {
    min = Math.min(min, box.x)
    max = Math.max(max, box.x + box.w)
    sum += box.w
  }

  let t = min
  const gap = (max - min - sum) / (boxes.length - 1)
  for (let box of [...boxes].sort((a, b) => a.x - b.x)) {
    box.x = t
    t += box.w + gap
  }
}
export function distributeBoxesY(boxes: Box[]) {
  const len = boxes.length
  const sorted = [...boxes].sort((a, b) => a.y - b.y)
  let min = sorted[0].y

  sorted.sort((a, b) => a.y + a.h - b.y - b.h)
  let last = sorted[len - 1]
  let max = last.y + last.h

  let range = max - min
  let step = range / len
  let box: Box
  for (let i = 0; i < len - 1; i++) {
    box = sorted[i]
    box.y = min + step * i
  }
}
export function alignBoxesCenterX(boxes: Box[]) {
  let midX = 0
  for (let box of boxes) {
    midX += box.x + box.w / 2
  }
  midX /= boxes.length
  for (let box of boxes) box.x = midX - box.w / 2
}
export function alignBoxesCenterY(boxes: Box[]) {
  let midY = 0
  for (let box of boxes) midY += box.y + box.h / 2
  midY /= boxes.length
  for (let box of boxes) box.y = midY - box.h / 2
}

export function alignBoxesTop(boxes: Box[]) {
  const [first, ...rest] = boxes
  let y = first.y
  for (let box of rest) if (box.y < y) y = box.y
  for (let box of boxes) box.y = y
}

export function alignBoxesBottom(boxes: Box[]) {
  const [first, ...rest] = boxes
  let maxY = first.y + first.h
  for (let box of rest) if (box.y + box.h > maxY) maxY = box.y + box.h
  for (let box of boxes) box.y = maxY - box.h
}

export function alignBoxesLeft(boxes: Box[]) {
  const [first, ...rest] = boxes
  let x = first.x
  for (let box of rest) if (box.x < x) x = box.x
  for (let box of boxes) box.x = x
}

export function alignBoxesRight(boxes: Box[]) {
  const [first, ...rest] = boxes
  let maxX = first.x + first.w
  for (let box of rest) if (box.x + box.w > maxX) maxX = box.x + box.w
  for (let box of boxes) box.x = maxX - box.w
}

export function getBoundingBox(boxes: Box[]) {
  if (boxes.length === 0) {
    return {
      x: 0,
      y: 0,
      maxX: 0,
      maxY: 0,
      w: 0,
      h: 0
    }
  }

  const first = boxes[0]

  let x = first.x
  let maxX = first.x + first.w
  let y = first.y
  let maxY = first.y + first.h

  for (let box of boxes) {
    x = Math.min(x, box.x)
    maxX = Math.max(maxX, box.x + box.w)
    y = Math.min(y, box.y)
    maxY = Math.max(maxY, box.y + box.h)
  }

  return {
    x,
    y,
    maxX,
    maxY,
    w: maxX - x,
    h: maxY - y
  }
}

function getSnapshots(
  boxes: Box[],
  bounds: Bounds
): Record<string, BoxTransform> {
  const acc = {} as Record<string, BoxTransform>

  for (let box of boxes) {
    const { x, y, w, h } = box
    acc[box.id] = {
      x,
      y,
      w,
      h,
      nx: (x - bounds.x) / bounds.w,
      ny: (y - bounds.y) / bounds.h,
      nmx: 1 - (x + w - bounds.x) / bounds.w,
      nmy: 1 - (y + h - bounds.y) / bounds.h,
      nw: w / bounds.w,
      nh: h / bounds.h
    }
  }

  return acc
}

export function getEdgeResizer(
  initialBoxes: Box[],
  initialBounds: Bounds,
  edge: number
) {
  const snapshots = getSnapshots(initialBoxes, initialBounds)

  let { x: x0, y: y0, maxX: x1, maxY: y1 } = initialBounds
  let { x: mx, y: my, w: bw, h: bh } = initialBounds

  resizers.edge = (point: Pointer, boxes: Box[], bounds: Bounds) => {
    const { x, y } = point
    if (edge === 0 || edge === 2) {
      edge === 0 ? (y0 = y) : (y1 = y)
      my = y0 < y1 ? y0 : y1
      bh = Math.abs(y1 - y0)
      for (let box of boxes) {
        const { ny, nmy, nh } = snapshots[box.id]
        box.y = my + (y1 < y0 ? nmy : ny) * bh
        box.h = nh * bh
      }
    } else {
      edge === 1 ? (x1 = x) : (x0 = x)
      mx = x0 < x1 ? x0 : x1
      bw = Math.abs(x1 - x0)
      for (let box of boxes) {
        const { nx, nmx, nw } = snapshots[box.id]
        box.x = mx + (x1 < x0 ? nmx : nx) * bw
        box.w = nw * bw
      }
    }

    bounds.x = mx
    bounds.y = my
    bounds.w = bw
    bounds.h = bh
    bounds.maxX = mx + bw
    bounds.maxY = my + bh
  }

  return resizers.edge
}

/**
 * Returns a function that can be used to calculate corner resize transforms.
 * @param boxes An array of the boxes being resized.
 * @param corner A number representing the corner being dragged. Top Left: 0, Top Right: 1, Bottom Right: 2, Bottom Left: 3.
 * @example
 * const resizer = getCornerResizer(selectedBoxes, 3)
 * resizer(selectedBoxes, )
 */
export function getCornerResizer(
  initialBoxes: Box[],
  initialBounds: Bounds,
  corner: number
) {
  const snapshots = getSnapshots(initialBoxes, initialBounds)

  // TL = x0/y0  TR = x1/y0
  //          [  ]
  // BL = x0/y1  BR = x1/y1

  let { x: x0, y: y0, maxX: x1, maxY: y1 } = initialBounds
  let { x: mx, y: my, w: bw, h: bh } = initialBounds
  let ar = bw / bh
  let cr = ar

  resizers.corner = (
    point: Pointer,
    boxes: Box[],
    bounds: Bounds,
    aspect = false
  ) => {
    let { x, y } = point
    const topCorner = corner < 2
    const rightCorner = corner === 1 || corner === 2

    // Update dragging corners
    if (topCorner) y0 = y
    else y1 = y
    if (rightCorner) x1 = x
    else x0 = x

    bw = Math.abs(x1 - x0) // What's the bounds width?
    bh = Math.abs(y1 - y0) // What's the bounds height?

    if (aspect) {
      cr = bw / bh // Current ratio (pre-aspect)

      if (cr > ar) {
        bh = bw / ar
        if (topCorner) {
          y0 = y1 > y0 ? y1 - bh : y1 + bh
        } else {
          y1 = y0 > y1 ? y0 - bh : y0 + bh
        }
      } else {
        bw = bh * ar
        if (rightCorner) {
          x1 = x1 < x0 ? x0 - bw : x0 + bw
        } else {
          x0 = x0 < x1 ? x1 - bw : x1 + bw
        }
      }
    }

    my = y0 > y1 ? y1 : y0 // Which is the min x?
    mx = x0 > x1 ? x1 : x0 // Which is the min y?

    for (let box of boxes) {
      const { nx, nmx, nw, ny, nmy, nh } = snapshots[box.id]
      box.x = mx + (x1 < x0 ? nmx : nx) * bw
      box.y = my + (y1 < y0 ? nmy : ny) * bh
      box.w = nw * bw
      box.h = nh * bh
    }

    bounds.x = mx
    bounds.y = my
    bounds.w = bw
    bounds.h = bh
    bounds.maxX = mx + bw
    bounds.maxY = my + bh
  }

  return resizers.corner
}
