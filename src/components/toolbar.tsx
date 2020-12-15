import * as React from "react"
import { useStateDesigner } from "@state-designer/react"
import state from "state"
import styled from "styled-components"
import * as Icons from "./icons"

const ToolbarContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  border-bottom: 1px solid #ccc;
`

const ButtonGroup = styled.div`
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
`

const IconButton = styled.button`
  background: none;
  display: flex;
  border: none;
  align-items: center;
  font-size: 32px;
  padding: 8px;
  color: #ccc;
  cursor: pointer;
  border-radius: 4px;

  &:disabled {
    opacity: 0.3;
  }

  &:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }
`

export default function Toolbar() {
  const local = useStateDesigner(state)
  const { selectedBoxIds } = local.data
  const hasTwo = selectedBoxIds.length >= 2
  const hasThree = selectedBoxIds.length >= 3

  return (
    <ToolbarContainer>
      <ButtonGroup>
        <IconButton
          disabled={!hasTwo}
          onClick={() => state.send("ALIGNED", "left")}
        >
          <Icons.Left />
        </IconButton>
        <IconButton
          disabled={!hasTwo}
          onClick={() => state.send("ALIGNED", "centerX")}
        >
          <Icons.CenterX />
        </IconButton>
        <IconButton
          disabled={!hasTwo}
          onClick={() => state.send("ALIGNED", "right")}
        >
          <Icons.Right />
        </IconButton>
        <IconButton
          disabled={!hasTwo}
          onClick={() => state.send("ALIGNED", "top")}
        >
          <Icons.Top />
        </IconButton>
        <IconButton
          disabled={!hasTwo}
          onClick={() => state.send("ALIGNED", "centerY")}
        >
          <Icons.CenterY />
        </IconButton>
        <IconButton
          disabled={!hasTwo}
          onClick={() => state.send("ALIGNED", "bottom")}
        >
          <Icons.Bottom />
        </IconButton>
      </ButtonGroup>
      <ButtonGroup>
        <IconButton
          disabled={!hasThree}
          onClick={() => state.send("DISTRIBUTED", "horizontal")}
        >
          <Icons.DistributeX />
        </IconButton>
        <IconButton
          disabled={!hasThree}
          onClick={() => state.send("DISTRIBUTED", "vertical")}
        >
          <Icons.DistributeY />
        </IconButton>
      </ButtonGroup>
    </ToolbarContainer>
  )
}
