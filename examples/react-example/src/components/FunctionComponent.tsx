import { useRollbar } from "@rollbar/react"

export function FunctionComponent() {
  const rollbar = useRollbar()

  rollbar.info("Message from function component")

  return <div>I&apos;m a function component!</div>
}
