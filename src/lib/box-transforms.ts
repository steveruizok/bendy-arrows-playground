import Box from "./Box"
import { Pointer, Bounds } from "types"

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

function getBoxNormals(boxes: Box[], bounds: Bounds) {
  const boxNormals: Record<string, Bounds> = {}

  for (let box of boxes) {
    boxNormals[box.id] = {
      x: (box.x - bounds.x) / bounds.w,
      y: (box.y - bounds.y) / bounds.h,
      maxX: (box.maxX - bounds.x) / bounds.w,
      maxY: (box.maxY - bounds.y) / bounds.h,
      w: box.w / bounds.w,
      h: box.h / bounds.h
    }
  }

  return boxNormals
}

export function getEdgeResizer(
  initialBoxes: Box[],
  initialBounds: Bounds,
  edge: number
) {
  const normalizedBoxes = getBoxNormals(initialBoxes, initialBounds)

  // Save these
  const { x: bx, y: by, w: bw, h: bh } = initialBounds
  const midX = bx + bw / 2
  const midY = by + bh / 2
  const aspectRatio = bw / bh

  // Mutate these
  let { x: minX, y: minY, maxX, maxY } = initialBounds,
    flipX: boolean,
    flipY: boolean

  resizers.edge = (
    point: Pointer,
    boxes: Box[],
    bounds: Bounds,
    lockAspect: boolean
  ) => {
    const { x, y } = point

    if (edge % 2 === 0) {
      // T0 or B2 edge
      if (edge === 0) minY = y
      else maxY = y

      flipY = maxY < minY

      bounds.y = flipY ? maxY : minY
      bounds.h = Math.abs(maxY - minY)

      if (lockAspect) {
        bounds.w = bounds.h * aspectRatio
        if (edge === 1) maxX = flipX ? minX - bounds.w : minX + bounds.w
        else minX = flipX ? maxX + bounds.w : maxX - bounds.w
        bounds.x = flipX ? maxX : minX
        bounds.x -= bounds.x + bounds.w / 2 - midX
      } else {
        bounds.x = bx
        bounds.w = bw
      }
    } else {
      // L3 or R1 Edge
      if (edge === 1) maxX = x
      else minX = x

      flipX = maxX < minX

      bounds.x = flipX ? maxX : minX
      bounds.w = Math.abs(maxX - minX)

      if (lockAspect) {
        bounds.h = bounds.w / aspectRatio
        if (edge === 0) minY = flipY ? maxY + bounds.h : maxY - bounds.h
        else maxY = flipY ? minY - bounds.h : minY + bounds.h
        bounds.y = flipY ? maxY : minY
        bounds.y -= bounds.y + bounds.h / 2 - midY
      } else {
        bounds.y = by
        bounds.h = bh
      }
    }

    bounds.maxX = bounds.x + bounds.w
    bounds.maxY = bounds.y + bounds.h

    for (let box of boxes) {
      const nBox = normalizedBoxes[box.id]
      box.y = bounds.y + (flipY ? 1 - nBox.maxY : nBox.y) * bounds.h
      box.h = nBox.h * bounds.h
      box.x = bounds.x + (flipX ? 1 - nBox.maxX : nBox.x) * bounds.w
      box.w = nBox.w * bounds.w
    }
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
  const normalizedBoxes = getBoxNormals(initialBoxes, initialBounds)

  // Save these
  const aspectRatio = initialBounds.w / initialBounds.h

  // Mutate these
  let { x: minX, y: minY, maxX, maxY } = initialBounds,
    flipX: boolean,
    flipY: boolean,
    isTopCorner: boolean,
    isRightCorner: boolean

  resizers.corner = (
    point: Pointer,
    boxes: Box[],
    bounds: Bounds,
    lockAspect = false
  ) => {
    isTopCorner = corner < 2 // 0TL or 1TR
    isRightCorner = corner % 3 > 0 // 1TR or 2BR

    // Update dragging corners
    if (isTopCorner) minY = point.y
    else maxY = point.y

    if (isRightCorner) maxX = point.x
    else minX = point.x

    // Are we flipped?
    flipX = maxX < minX
    flipY = maxY < minY

    bounds.w = Math.abs(maxX - minX)
    bounds.h = Math.abs(maxY - minY)

    if (lockAspect) {
      if (bounds.w / bounds.h > aspectRatio) {
        // Scale bounds height by aspect ratio
        // and move points to fit new height
        bounds.h = bounds.w / aspectRatio
        if (isTopCorner) minY = flipY ? maxY + bounds.h : maxY - bounds.h
        else maxY = flipY ? minY - bounds.h : minY + bounds.h
      } else {
        // Scale bounds width by aspect ratio
        // and move points to fit new width
        bounds.w = bounds.h * aspectRatio
        if (isRightCorner) maxX = flipX ? minX - bounds.w : minX + bounds.w
        else minX = flipX ? maxX + bounds.w : maxX - bounds.w
      }
    }

    bounds.x = flipX ? maxX : minX
    bounds.y = flipY ? maxY : minY
    bounds.maxX = bounds.x + bounds.w
    bounds.maxY = bounds.y + bounds.h

    for (let box of boxes) {
      // Use the box's initial size normals to calculate
      // its size in the new bounds.
      const nBox = normalizedBoxes[box.id]
      box.x = bounds.x + (flipX ? 1 - nBox.maxX : nBox.x) * bounds.w
      box.y = bounds.y + (flipY ? 1 - nBox.maxY : nBox.y) * bounds.h
      box.w = nBox.w * bounds.w
      box.h = nBox.h * bounds.h
    }

    return boxes
  }

  return resizers.corner
}
