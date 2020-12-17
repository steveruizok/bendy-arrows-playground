import { createState } from "@state-designer/react"
import { Pointer, Keys, Bounds, JSONData } from "types"
import Box from "lib/Box"
import Link from "lib/Link"
import Painter from "lib/Painter"
import { pointInRectangle, getBoundingBox } from "lib/utils"
import {
  resizers,
  getEdgeResizer,
  getCornerResizer,
  alignBoxesLeft,
  alignBoxesCenterX,
  alignBoxesRight,
  alignBoxesTop,
  alignBoxesCenterY,
  alignBoxesBottom,
  distributeBoxesX,
  distributeBoxesY
} from "lib/box-transforms"

interface PointerPayload {
  pointer: Pointer
  keys: Keys
}

interface BoxPayload {
  x: number
  y: number
  w: number
  h: number
  id?: string
}

interface LinkPayload {
  from: string
  to: string
  bow?: number
  id?: string
}

const alignFns = {
  left: alignBoxesLeft,
  centerX: alignBoxesCenterX,
  right: alignBoxesRight,
  top: alignBoxesTop,
  centerY: alignBoxesCenterY,
  bottom: alignBoxesBottom
}

const distributeFns = {
  horizontal: distributeBoxesX,
  vertical: distributeBoxesY
}

const EDGE_PADDING = 5

const state = createState({
  data: {
    canvas: null as HTMLCanvasElement | null,
    overlay: null as HTMLCanvasElement | null,
    painter: null as Painter | null,
    overlayPainter: null as Painter | null,
    boxes: {} as Record<string, Box>,
    links: {} as Record<string, Link>,
    hoveredEdge: null as number | null,
    hoveredCorner: null as number | null,
    hoveredBoxId: "",
    hoveredLinkId: "",
    selectedBoxIds: [] as string[],
    selectedLinkIds: [] as string[],
    bounds: null as Bounds | null,
    brush: {
      pointA: { x: 0, y: 0, cx: 0, cy: 0, dx: 0, dy: 0 },
      pointB: { x: 0, y: 0, cx: 0, cy: 0, dx: 0, dy: 0 },
      brushed: [] as string[],
      initial: [] as string[]
    }
  },
  on: {
    LOADED_CANVAS: ["loadCanvas", "loadSavedData", "render"],
    CREATED_BOX: ["createBox", "render"],
    CREATED_LINK: ["createLink", "render"],
    ALIGNED: {
      if: "hasTwoSelectedBoxes",
      do: ["alignBoxes", "setBounds", "render", "renderOverlay"]
    },
    DISTRIBUTED: {
      if: "hasThreeSelectedBoxes",
      do: ["distributeBoxes", "setBounds", "render", "renderOverlay"]
    }
  },
  initial: "select",
  states: {
    select: {
      initial: "idle",
      states: {
        idle: {
          on: {
            MOVED_POINTER: [
              {
                get: "hoveredBoxId",
                if: "hoveredBoxHasChanged",
                then: [
                  "setHoveredBox",
                  {
                    unless: "hoveredBoxIsSelected",
                    do: "renderOverlay"
                  }
                ]
              },
              {
                get: "hoveredLinkId",
                if: "hoveredLinkHasChanged",
                then: [
                  "setHoveredLink",
                  {
                    unless: "hoveredLinkIsSelected",
                    do: "renderOverlay"
                  }
                ]
              },
              "setHoveredBoundsEdge",
              "setHoveredBoundsCorner",
              "setCursor"
            ],
            DOWNED_POINTER: [
              {
                if: "hasHoveredEdge",
                to: "edgeResizing"
              },
              {
                if: "hasHoveredCorner",
                to: "cornerResizing"
              },
              {
                unless: "hasHoveredBox",
                if: "isHoveringBounds",
                to: "pointingBounds"
              },
              {
                if: "hasHoveredBox",
                do: "clearSelectedLinks",
                then: [
                  {
                    unless: "hoveredBoxIsSelected",
                    if: "isPressingShift",
                    do: "selectHoveredBoxToo",
                    else: {
                      if: ["hoveredBoxIsSelected", "isPressingShift"],
                      do: "deselectHoveredBox",
                      else: "selectHoveredBox"
                    }
                  },
                  {
                    do: ["setBounds", "renderOverlay"],
                    to: "pointingBounds"
                  }
                ]
              },
              {
                if: "hasHoveredLink",
                do: [
                  "clearSelectedBoxes",
                  "selectHoveredLink",
                  "renderOverlay"
                ],
                to: "draggingLinkAnchor"
              },
              {
                do: [
                  "clearSelectedBoxes",
                  "clearSelectedLinks",
                  "renderOverlay"
                ],
                to: "drawingBrush"
              }
            ]
          }
        },
        pointingBounds: {
          on: {
            MOVED_POINTER: {
              if: "pointerMovedFarEnough",
              to: "draggingSelectedBoxes"
            },
            LIFTED_POINTER: { to: "idle" }
          }
        },
        draggingLinkAnchor: {
          onEnter: ["moveSelectedLinkBowControl", "render"],
          on: {
            MOVED_POINTER: [
              "moveSelectedLinkBowControl",
              "render",
              "renderOverlay"
            ],
            LIFTED_POINTER: { do: "saveData", to: "idle" }
          }
        },
        draggingSelectedBoxes: {
          onEnter: ["dragSelectedBoxes", "render"],
          on: {
            MOVED_POINTER: ["dragSelectedBoxes", "render", "renderOverlay"],
            LIFTED_POINTER: { do: "saveData", to: "idle" }
          }
        },
        drawingBrush: {
          onEnter: "setBrush",
          on: {
            MOVED_POINTER: [
              {
                do: ["updateBrush", "updateBrushed"]
              },
              {
                if: "selectedBoxesHasChanged",
                do: ["brushSelectBoxes", "setBounds"]
              },
              "renderOverlay",
              "renderBrush"
            ],
            LIFTED_POINTER: {
              do: "renderOverlay",
              to: "idle"
            }
          }
        },
        edgeResizing: {
          onEnter: "setEdgeResizer",
          on: {
            MOVED_POINTER: ["resizeByEdge", "render", "renderOverlay"],
            LIFTED_POINTER: { do: "saveData", to: "idle" }
          }
        },
        cornerResizing: {
          onEnter: "setCornerResizer",
          on: {
            MOVED_POINTER: ["resizeByCorner", "render", "renderOverlay"],
            LIFTED_POINTER: { do: "saveData", to: "idle" }
          }
        }
      }
    },
    box: {},
    arrow: {}
  },
  results: {
    hoveredLinkId(data, payload: PointerPayload) {
      const { cx, cy } = payload.pointer
      return (
        Object.values(data.links).find((link) =>
          data.painter!.ctx.isPointInPath(link.path, cx, cy)
        )?.id || ""
      )
    },
    hoveredBoxId(data, payload: PointerPayload) {
      const { x, y } = payload.pointer

      return (
        Object.values(data.boxes).find(
          (box) => !(box.x > x || box.y > y || box.maxX < x || box.maxY < y)
        )?.id || ""
      )
    }
  },
  conditions: {
    hasTwoSelectedBoxes(data) {
      return data.selectedBoxIds.length >= 2
    },
    hasThreeSelectedBoxes(data) {
      return data.selectedBoxIds.length >= 3
    },
    isHoveringBounds(data, payload: PointerPayload) {
      if (data.bounds === null) return false
      return pointInRectangle(payload.pointer, data.bounds)
    },
    hasHoveredEdge(data) {
      return data.hoveredEdge !== null
    },
    hasHoveredCorner(data) {
      return data.hoveredCorner !== null
    },
    pointerMovedFarEnough(data, payload: PointerPayload) {
      const { tx, ty } = payload.pointer
      return Math.hypot(tx, ty) > 4
    },
    isPressingShift(data, payload: PointerPayload) {
      return payload.keys.shift
    },
    hoveredBoxIsSelected(data) {
      return data.selectedBoxIds.includes(data.hoveredBoxId)
    },
    hoveredLinkIsSelected(data) {
      return data.selectedLinkIds.includes(data.hoveredLinkId)
    },
    hasHoveredLink(data) {
      return !!data.hoveredLinkId
    },
    hasHoveredBox(data) {
      return !!data.hoveredBoxId
    },
    hoveredLinkHasChanged(data, _, result) {
      return data.hoveredLinkId !== result
    },
    hoveredBoxHasChanged(data, _, result) {
      return data.hoveredBoxId !== result
    },
    selectedBoxesHasChanged(data) {
      const {
        selectedBoxIds,
        brush: { brushed }
      } = data

      return selectedBoxIds.length !== brushed.length
    }
  },
  actions: {
    loadCanvas(data, payload) {
      const { canvas, overlay } = payload
      data.canvas = canvas
      data.painter = new Painter(canvas)
      data.overlay = overlay
      data.overlayPainter = new Painter(overlay)
    },
    // Brush
    setBrush(data, payload: PointerPayload) {
      const { pointer, keys } = payload
      data.brush = {
        pointA: { ...pointer },
        pointB: { ...pointer },
        brushed: [],
        initial: keys.shift ? data.selectedBoxIds : []
      }
    },
    updateBrush(data, payload: PointerPayload) {
      const { pointer } = payload
      data.brush.pointB = { ...pointer }
    },
    clearBrush(data) {
      data.brush = {
        pointA: { x: 0, y: 0, cx: 0, cy: 0, dx: 0, dy: 0 },
        pointB: { x: 0, y: 0, cx: 0, cy: 0, dx: 0, dy: 0 },
        brushed: [],
        initial: []
      }
      data.overlayPainter?.clean()
    },
    updateBrushed(data) {
      const {
        pointA: { x: xa, y: ya },
        pointB: { x: xb, y: yb }
      } = data.brush

      const minX = Math.min(xa, xb)
      const minY = Math.min(ya, yb)
      const maxX = Math.max(xa, xb)
      const maxY = Math.max(ya, yb)

      data.brush.brushed = Object.entries(data.boxes).reduce<string[]>(
        (acc, [id, box]) => {
          if (
            !(
              box.x > maxX ||
              box.y > maxY ||
              box.maxX < minX ||
              box.maxY < minY
            )
          ) {
            acc.push(id)
          }
          return acc
        },
        []
      )
    },
    // Selecting Links
    setHoveredLink(data, _, result) {
      data.hoveredLinkId = result
    },
    clearHoveredLink(data) {
      data.hoveredLinkId = ""
    },
    selectHoveredLink(data) {
      data.selectedLinkIds = [data.hoveredLinkId]
    },
    clearSelectedLinks(data) {
      data.selectedLinkIds = []
    },
    // Selecting Boxes
    brushSelectBoxes(data, payload) {
      data.selectedBoxIds = data.brush.brushed
    },
    setHoveredBox(data, _, result) {
      data.hoveredBoxId = result
    },
    clearHoveredBox(data) {
      data.hoveredBoxId = ""
    },
    selectHoveredBox(data) {
      if (!data.selectedBoxIds.includes(data.hoveredBoxId)) {
        data.selectedBoxIds = [data.hoveredBoxId]
      }
    },
    selectHoveredBoxToo(data) {
      if (!data.selectedBoxIds.includes(data.hoveredBoxId)) {
        data.selectedBoxIds.push(data.hoveredBoxId)
      }
    },
    deselectHoveredBox(data) {
      const index = data.selectedBoxIds.indexOf(data.hoveredBoxId)
      data.selectedBoxIds.splice(index, 1)
    },
    clearSelectedBoxes(data) {
      data.selectedBoxIds = []
      data.bounds = null
    },
    // Bounds Resizing
    setHoveredBoundsEdge(data, payload: PointerPayload) {
      const { pointer } = payload
      const { bounds } = data

      document.body.style.cursor = "default"
      data.hoveredEdge = null

      if (bounds === null) {
        return
      }

      const { x, y, w, h, maxX, maxY } = bounds
      const p = EDGE_PADDING,
        pp = EDGE_PADDING * 2

      const edgeBoxes = [
        { x: x + p, y: y - p, w: w - pp, h: pp },
        { x: maxX - p, y: y + p, w: pp, h: h - pp },
        { x: x + p, y: maxY - p, w: w - pp, h: pp },
        { x: x - p, y: y + p, w: pp, h: h - pp }
      ]

      for (let i = 0; i < edgeBoxes.length; i++) {
        if (pointInRectangle(pointer, edgeBoxes[i])) {
          data.hoveredEdge = i
          return
        }
      }
    },
    setHoveredBoundsCorner(data, payload: PointerPayload) {
      const { pointer } = payload
      const { bounds } = data

      data.hoveredCorner = null

      if (bounds === null) {
        return
      }

      const { x, y, maxX, maxY } = bounds
      const p = EDGE_PADDING,
        pp = EDGE_PADDING * 2

      const cornerBoxes = [
        { x: x - p, y: y - p, w: pp, h: pp },
        { x: maxX - p, y: y - p, w: pp, h: pp },
        { x: maxX - p, y: maxY - p, w: pp, h: pp },
        { x: x - p, y: maxY - p, w: pp, h: pp }
      ]

      for (let i = 0; i < cornerBoxes.length; i++) {
        if (pointInRectangle(pointer, cornerBoxes[i])) {
          data.hoveredCorner = i
          return
        }
      }
    },
    setCursor(data) {
      const { hoveredCorner, hoveredEdge } = data
      if (hoveredEdge !== null) {
        document.body.style.cursor =
          hoveredEdge % 2 === 0 ? "ns-resize" : "ew-resize"
      } else if (hoveredCorner !== null) {
        document.body.style.cursor =
          hoveredCorner % 2 === 0 ? "nwse-resize" : "nesw-resize"
      }
    },
    setEdgeResizer(data) {
      const { boxes, selectedBoxIds, bounds, hoveredEdge } = data
      const selectedBoxes = selectedBoxIds.map((id) => boxes[id])
      getEdgeResizer(selectedBoxes, bounds!, hoveredEdge!)
    },
    setCornerResizer(data) {
      const { boxes, selectedBoxIds, bounds, hoveredCorner } = data
      const selectedBoxes = selectedBoxIds.map((id) => boxes[id])
      getCornerResizer(selectedBoxes, bounds!, hoveredCorner!)
    },
    resizeByEdge(data, payload: PointerPayload) {
      const { boxes, selectedBoxIds, bounds } = data
      const selectedBoxes = selectedBoxIds.map((id) => boxes[id])
      const { pointer } = payload
      resizers.edge!(pointer, selectedBoxes, bounds!, payload.keys.shift)
    },
    resizeByCorner(data, payload: PointerPayload) {
      const { boxes, selectedBoxIds, bounds } = data
      const selectedBoxes = selectedBoxIds.map((id) => boxes[id])
      const { pointer } = payload
      resizers.corner!(pointer, selectedBoxes, bounds!, payload.keys.shift)
    },
    alignBoxes(data, payload: keyof typeof alignFns) {
      const { boxes, selectedBoxIds } = data
      const selectedBoxes = selectedBoxIds.map((id) => boxes[id])

      alignFns[payload](selectedBoxes)
    },
    distributeBoxes(data, payload: keyof typeof distributeFns) {
      const { boxes, selectedBoxIds } = data
      const selectedBoxes = selectedBoxIds.map((id) => boxes[id])

      distributeFns[payload](selectedBoxes)
    },
    // Moving
    dragSelectedBoxes(data, payload: PointerPayload) {
      const { boxes, selectedBoxIds, bounds } = data
      const { dx, dy } = payload.pointer

      for (let id of selectedBoxIds) {
        boxes[id].x += dx
        boxes[id].y += dy
      }
      if (bounds !== null) {
        bounds.x += dx
        bounds.y += dy
        bounds.maxX += dx
        bounds.maxY += dy
      }
    },
    // Box
    createBox(data, payload: BoxPayload) {
      const { x, y, w, h } = payload
      const box = new Box(x, y, w, h)
      data.boxes[box.id] = box
    },
    // Link
    createLink(data, payload: LinkPayload) {
      const from = data.boxes[payload.from]
      const to = data.boxes[payload.to]
      const link = new Link(from, to, payload.bow || 0)
      data.links[link.id] = link
      from.links.add(link)
      to.links.add(link)
    },
    moveSelectedLinkBowControl(data, payload: PointerPayload) {
      const { dx, dy, x, y } = payload.pointer
      const link = data.links[data.hoveredLinkId]
      link.moveBowControl(dx, dy, x, y)
    },
    setBounds(data) {
      const { selectedBoxIds, boxes } = data
      const selectedBoxes = selectedBoxIds.map((id) => boxes[id])
      if (selectedBoxes.length > 0) {
        data.bounds = getBoundingBox(selectedBoxes)
      } else {
        data.bounds = null
      }
    },
    // Render
    render(data) {
      const { boxes, links, painter } = data
      painter!.clean()
      Object.values(boxes).forEach((box) => painter!.drawBox(box))
      Object.values(links).forEach((link) => {
        link.update()
        painter!.drawLink(link)
      })
    },
    renderOverlay(data) {
      const {
        boxes,
        links,
        hoveredLinkId,
        hoveredBoxId,
        selectedBoxIds,
        selectedLinkIds,
        bounds,
        overlayPainter
      } = data
      overlayPainter!.clean()
      const hoveredBox = boxes[hoveredBoxId]
      const hoveredLink = links[hoveredLinkId]
      const selectedBoxes = selectedBoxIds.map((id) => boxes[id])
      const selectedLinks = selectedLinkIds.map((id) => links[id])

      if (hoveredBox) {
        overlayPainter!.drawBox(hoveredBox, "hovered")
      }

      if (hoveredLink) {
        overlayPainter!.drawLink(hoveredLink, "hovered")
      }

      for (let box of selectedBoxes) {
        overlayPainter!.drawBox(box, "selected")
      }
      for (let link of selectedLinks) {
        overlayPainter!.drawLink(link, "selected")
      }

      if (bounds) {
        const { x, y, w, h } = bounds
        overlayPainter!.drawBounds(x, y, w, h)
      }
    },
    renderBrush(data) {
      const { brush, overlayPainter } = data

      const {
        pointA: { x: xa, y: ya },
        pointB: { x: xb, y: yb }
      } = brush

      const minX = Math.min(xa, xb)
      const minY = Math.min(ya, yb)
      const maxX = Math.max(xa, xb)
      const maxY = Math.max(ya, yb)

      overlayPainter!.drawBrush(minX, minY, maxX - minX, maxY - minY)
    },
    // Data
    saveData(data) {
      const boxes = Object.values(data.boxes).map((box) => box.toObject())
      const links = Object.values(data.links).map((link) => link.toObject())
      const jsonData: JSONData = {
        boxes,
        links,
        selectedBoxIds: data.selectedBoxIds
      }
      localStorage.setItem("arrows_sandbox", JSON.stringify(jsonData))
    },
    loadSavedData(data) {
      let saved = null

      if (window.localStorage !== undefined) {
        saved = localStorage.getItem("arrows_sandbox")
      }

      if (saved === null) {
        saved = `{"boxes":[{"id":"1","x":299.80224609375,"y":123.03662109375,"w":100,"h":100,"links":["5"]},{"id":"2","x":28.5496826171875,"y":129.468994140625,"w":100,"h":100,"links":["5","6"]},{"id":"3","x":95.631591796875,"y":259.562255859375,"w":100,"h":100,"links":["6","7","8"]},{"id":"4","x":251.0421142578125,"y":258.43572998046875,"w":100,"h":100,"links":["7","8"]}],"links":[{"id":"5","from":"1","to":"2","bow":111.20855420493976},{"id":"6","from":"2","to":"3","bow":65.16539966520948},{"id":"7","from":"3","to":"4","bow":98.99353466963093},{"id":"8","from":"4","to":"3","bow":0}],"selectedBoxIds":["3"]}`
      }

      const json: JSONData = JSON.parse(saved)

      for (let { x, y, w, h, id } of json.boxes) {
        const box = new Box(x, y, w, h, id)
        data.boxes[box.id] = box
      }

      for (let { to, from, bow, id } of json.links) {
        const f = data.boxes[from]
        const t = data.boxes[to]
        const link = new Link(f, t, bow, id)
        data.links[id] = link
        f.links.add(link)
        t.links.add(link)
      }

      data.selectedBoxIds = json.selectedBoxIds
    },
    updateCanvases(data) {
      const { painter, overlayPainter } = data
      painter!.setupCanvas()
      overlayPainter!.setupCanvas()
    }
  }
})

// state.onUpdate((d) => console.log(d.active))

export default state
