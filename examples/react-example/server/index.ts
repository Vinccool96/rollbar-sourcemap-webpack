import express from "express"
import path from "path"
const app = express() //Line 2
const port = process.env.PORT || 5000 //Line 3

// This displays message that the server running and listening to specified port
app.listen(port, () => console.log(`Listening on port ${port}`))

const index = path.join(__dirname, "../dist/index.html")
app.use((req, res) => res.sendFile(index))

// create a GET route
app.get("/express_backend", (req, res) => {
  //Line 9
  res.send({ express: "YOUR EXPRESS BACKEND IS CONNECTED TO REACT" }) //Line 10
})
