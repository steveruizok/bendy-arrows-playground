export interface Keys {
  shift: boolean
  meta: boolean
  alt: boolean
}

export interface Point {
  x: number
  y: number
}

export interface Pointer extends Point {
  cx: number
  cy: number
  dx: number
  dy: number
  tx: number
  ty: number
}

export interface BoxTransform {
  x: number
  y: number
  w: number
  h: number
  maxX: number
  maxY: number
}

export interface Bounds {
  x: number
  y: number
  w: number
  h: number
  maxX: number
  maxY: number
}

export interface BoxData {
  x: number
  y: number
  w: number
  h: number
  id: string
}

export interface LinkData {
  to: string
  from: string
  bow: number
  id: string
}

export interface JSONData {
  boxes: BoxData[]
  links: LinkData[]
  selectedBoxIds: string[]
}
