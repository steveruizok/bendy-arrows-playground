import { MutableRefObject, RefObject } from "react"
export function assert(value: boolean, message?: string): asserts value
export function assert<T>(
  value: T | null | undefined,
  message?: string
): asserts value is T
export function assert<T extends any>(value: T, message?: string): T {
  if (value === false || value === null || typeof value === "undefined") {
    throw new Error(message || "Assertion failed")
  }
  return value
}

function assertRef<T>(value: T | null | undefined): asserts value is T {
  if (value === null || typeof value === "undefined") {
    throw new Error("Ref assertion failed.")
  }
}

export function getRef<T>(ref: MutableRefObject<T> | RefObject<T>): T {
  assertRef(ref.current)
  return ref.current
}
