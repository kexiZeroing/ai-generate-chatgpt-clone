import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { Ollama } from 'ollama'

const app = new Hono()
const ollama = new Ollama()

app.use(cors())

app.get('/', (c) => {
  return c.json({ message: 'Hello from Hono backend!' })
})

app.post('/chat', async (c) => {
  try {
    const { message } = await c.req.json()
    
    const response = await ollama.chat({
      model: "gemma:2b",
      messages: [{ role: 'user', content: message }],
    })

    return c.json({ reply: response.message.content })
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