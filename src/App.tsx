import * as React from "react"
import styled from "styled-components"
import state from "./state"
import Toolbar from "./components/toolbar"
import "./styles.css"
import { useStateDesigner } from "@state-designer/react"

import Canvas from "./components/canvas"
import { getRef } from "./utils"

import useEvents from "./hooks/useEvents"

const CanvasWrapper = styled.div`
  height: 100vh;
  width: 100vw;
`

export default function App() {
  const rCanvasWrapper = React.useRef<HTMLDivElement>(null)
  const rCanvas = React.useRef<HTMLCanvasElement>(null)
  const rOverlayCanvas = React.useRef<HTMLCanvasElement>(null)

  useEvents(rCanvasWrapper)
  // const local = useStateDesigner(state)

  React.useEffect(() => {
    const canvas = getRef(rCanvas)
    const overlay = getRef(rOverlayCanvas)
    state.send("LOADED_CANVAS", { canvas, overlay })
  }, [])

  return (
    <div>
      <CanvasWrapper ref={rCanvasWrapper}>
        <Canvas ref={rCanvas} />
        <Canvas ref={rOverlayCanvas} />
      </CanvasWrapper>
      <Toolbar />
    </div>
  )
}
