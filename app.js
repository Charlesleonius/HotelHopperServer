const express = require('express')
const app = express()
const port = process.env.PORT || 3000

app.listen(port, () => console.log(`Example app listening on port ${port}!`))

app.get('/', (req, res) => res.send('Hello World!'))

app.get('/favicon.ico', (req, res) => res.send('Hello World!'))