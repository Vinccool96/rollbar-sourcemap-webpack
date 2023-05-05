import { Provider } from "@rollbar/react"

import { config } from "./rollbarConfig"

import { ClassComponent } from "./components/ClassComponent"
import { FunctionComponent } from "./components/FunctionComponent"

import "./App.css"

function App() {
  return (
    <Provider config={config}>
      <div className="App">
        <ClassComponent />
        <FunctionComponent />
      </div>
    </Provider>
  )
}

export default App
