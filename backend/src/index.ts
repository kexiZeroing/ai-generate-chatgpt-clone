import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

app.use(cors())

app.get('/', (c) => {
  return c.json({ message: 'Hello from Hono backend!' })
})

app.post('/chat', async (c) => {
  try {
    const { message } = await c.req.json()
    // Here you would typically process the message and generate a response
    // For now, we'll just echo the message back
    return c.json({ reply: `You said: ${message}` })
  } catch (error) {
    console.error('Error processing chat request:', error)
    return c.json({ error: 'An error occurred while processing your request' }, 500)
  }
})
const port = 3000
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})