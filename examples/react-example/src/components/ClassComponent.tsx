import { Component } from "react"
import Rollbar from "rollbar"
import { Context, getRollbarFromContext } from "@rollbar/react"

export class ClassComponent extends Component {
  static contextType = Context
  rollbar: Rollbar | undefined

  componentDidMount(): void {
    this.rollbar = getRollbarFromContext(this.context as typeof Context)

    this.rollbar.info("Message from class component during mount")
  }

  render() {
    // Rollbar is also available during render.
    const rollbar = getRollbarFromContext(this.context as typeof Context)

    rollbar.info("Message from class component during render")

    return <div>I&apos;m a class component!</div>
  }
}
