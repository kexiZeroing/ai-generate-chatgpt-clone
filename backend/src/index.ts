import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { Ollama } from 'ollama'
import { stream } from 'hono/streaming'

const app = new Hono()
const ollama = new Ollama()

app.use(cors())

app.get('/', (c) => {
  return c.json({ message: 'Hello from Hono backend!' })
})

app.post('/chat', async (c) => {
  return stream(c, async (stream) => {
    try {
      const { message } = await c.req.json()
      
      const response = await ollama.chat({
        model: "gemma:2b",
        messages: [{ role: 'user', content: message }],
        stream: true,
      })

      for await (const chunk of response) {
        await stream.write(chunk.message.content)
      }
    } catch (error) {
      console.error('Error processing chat request:', error)
      await stream.write(JSON.stringify({ error: 'An error occurred while processing your request' }))
    } finally {
      stream.close()
    }
  })
})

const port = 3000
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})