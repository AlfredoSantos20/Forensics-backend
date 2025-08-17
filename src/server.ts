// server.ts
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.routes'

const app = express()
app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json()) // <-- REQUIRED
// app.get('/health', (_req, res) => res.send('ok'))

app.use('/auth', authRoutes)

app.use((err:any, _req:any, res:any, _next:any) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ message: 'Internal Server Error' })
})

app.listen(3000, () => console.log('API on http://localhost:3000'))
