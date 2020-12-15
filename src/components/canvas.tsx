import * as React from "react"

interface CanvasProps {}

const CanvasWithRef = React.forwardRef<HTMLCanvasElement, CanvasProps>(
  function Canvas(props, ref) {
    return (
      <canvas
        ref={ref}
        style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
      />
    )
  }
)

export default CanvasWithRef
