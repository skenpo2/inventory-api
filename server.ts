import { app } from './src/app.js'

const PORT = Number(process.env.PORT ?? 4001)

app.listen(PORT, () => {
  console.log(`Inventory API running on http://localhost:${PORT}`)
})
