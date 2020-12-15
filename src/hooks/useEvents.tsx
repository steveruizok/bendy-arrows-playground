import * as React from "react"
import { Pointer, Keys } from "types"
import state from "../state"

export default function useEvents(ref: React.RefObject<HTMLDivElement>) {
  React.useEffect(() => {
    let pointer: Pointer = {
      x: 0,
      y: 0,
      cx: 0,
      cy: 0,
      dx: 0,
      dy: 0,
      tx: 0,
      ty: 0
    }

    let keys: Keys = {
      shift: false,
      meta: false,
      alt: false
    }

    const dpr = window.devicePixelRatio || 1

    function handlePointerMove(e: PointerEvent) {
      const x = e.pageX
      const y = e.pageY
      const cx = x * dpr
      const cy = y * dpr
      const dx = x - pointer.x
      const dy = y - pointer.y

      pointer.x = x
      pointer.y = y
      pointer.cx = cx
      pointer.cy = cy
      pointer.dx = dx
      pointer.dy = dy
      pointer.tx += dx
      pointer.ty += dy
      keys.shift = e.shiftKey
      keys.meta = e.metaKey
      keys.alt = e.altKey

      state.send("MOVED_POINTER", { pointer, keys })
    }

    function handlePointerDown(e: PointerEvent) {
      keys.shift = e.shiftKey
      keys.meta = e.metaKey
      keys.alt = e.altKey
      pointer.tx = 0
      pointer.ty = 0
      state.send("DOWNED_POINTER", { pointer, keys })
    }

    function handlePointerUp(e: PointerEvent) {
      keys.shift = e.shiftKey
      keys.meta = e.metaKey
      keys.alt = e.altKey
      state.send("LIFTED_POINTER", { pointer, keys })
    }

    function handleKeydown(e: KeyboardEvent) {
      keys.shift = e.shiftKey
      keys.meta = e.metaKey
      keys.alt = e.altKey
    }

    function handleKeyup(e: KeyboardEvent) {
      keys.shift = e.shiftKey
      keys.meta = e.metaKey
      keys.alt = e.altKey
    }

    window.addEventListener("pointermove", handlePointerMove)
    ref.current!.addEventListener("pointerdown", handlePointerDown)
    ref.current!.addEventListener("pointerup", handlePointerUp)
    window.addEventListener("keydown", handleKeydown)
    window.addEventListener("keyup", handleKeyup)

    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      ref.current!.removeEventListener("pointerdown", handlePointerDown)
      ref.current!.removeEventListener("pointerup", handlePointerUp)
      window.removeEventListener("keydown", handleKeydown)
      window.removeEventListener("keyup", handleKeyup)
    }
  }, [])
}
