import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { Ollama } from 'ollama'
import { streamSSE } from 'hono/streaming'

const app = new Hono()
const ollama = new Ollama()

app.use(cors())

app.get('/', (c) => {
  return c.json({ message: 'Hello from Hono backend!' })
})

app.get('/chat-stream', async (c) => {
  const message = c.req.query('message');
  if (!message) {
    return c.json({ error: 'Message is required' }, 400);
  }
  
  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');

  return streamSSE(c, async (stream) => {
    try {
      const response = await ollama.chat({
        model: "gemma:2b",
        messages: [{ role: 'user', content: message }],
        stream: true,
      });

      for await (const chunk of response) {
        await stream.writeSSE({ data: chunk.message.content });
      }
    } catch (error) {
      console.error('Error processing chat request:', error);
      await stream.writeSSE({ data: JSON.stringify({ error: 'An error occurred while processing your request' }) });
    } finally {
      stream.close();
    }
  });
});

const port = 3000
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})