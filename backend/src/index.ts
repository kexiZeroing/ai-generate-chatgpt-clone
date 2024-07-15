import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { Ollama } from 'ollama'
import { streamSSE } from 'hono/streaming'
import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { MemoryVectorStore } from "langchain/vectorstores/memory"
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama"
import { ChatOllama } from "@langchain/community/chat_models/ollama"
import { StringOutputParser } from "@langchain/core/output_parsers"
import * as hub from "langchain/hub"
import { RunnableSequence } from "@langchain/core/runnables"
import { formatDocumentsAsString } from "langchain/util/document"

import fs from "node:fs/promises"
import path from "node:path"

const app = new Hono()
const ollama = new Ollama()

app.use(cors())

// Initialize RAG components
let vectorStore
let ragChain: any

async function initializeRAG(filePath = "abramov.txt") {
  console.log("RAG initializing")

  // 1. Load
  const loader = new TextLoader(filePath)
  const docs = await loader.load()

  // 2. Split
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  })
  const allSplits = await textSplitter.splitDocuments(docs)

  // 3. Store
  vectorStore = await MemoryVectorStore.fromDocuments(
    allSplits,
    new OllamaEmbeddings({
      model: "nomic-embed-text",
      baseUrl: "http://localhost:11434",
    })
  )

  // 4. Retrieval
  const retriever = vectorStore.asRetriever({ k: 6, searchType: "similarity" })

  // const retrievedDocs = await retriever.invoke(
  //   "What did the author do in college?"
  // );
  // console.log(retrievedDocs.length);
  // console.log(retrievedDocs[0].pageContent);

  // 5. Generate
  const llm = new ChatOllama({
    baseUrl: "http://localhost:11434",
    model: "gemma:2b",
  })
  // https://smith.langchain.com/hub/rlm/rag-prompt
  const prompt = await hub.pull("rlm/rag-prompt")

  ragChain = RunnableSequence.from([
    {
      context: retriever.pipe(formatDocumentsAsString),
      question: (input: any) => input.question,
    },
    prompt,
    llm,
    new StringOutputParser(),
  ])
}

// Initialize RAG on server start
// initializeRAG().then(async () => {
//   console.log("RAG initialized")
// })

app.get('/', (c) => {
  return c.json({ message: 'Hello from Hono backend!' })
})

app.get('/chat-stream', async (c) => {
  const message = c.req.query('message')
  if (!message) {
    return c.json({ error: 'Message is required' }, 400)
  }
  
  c.header('Content-Type', 'text/event-stream')
  c.header('Cache-Control', 'no-cache')
  c.header('Connection', 'keep-alive')

  return streamSSE(c, async (stream) => {
    try {
      const response = await ollama.chat({
        model: "gemma:2b",
        messages: [{ role: 'user', content: message }],
        stream: true,
      })

      for await (const chunk of response) {
        await stream.writeSSE({ data: chunk.message.content })
      }
    } catch (error) {
      console.error('Error processing chat request:', error)
      await stream.writeSSE({ data: JSON.stringify({ error: 'An error occurred while processing your request' }) })
    } finally {
      stream.close()
    }
  })
})

app.get('/rag-chat', async (c) => {
  const message = c.req.query('message')
  if (!message) {
    return c.json({ error: 'Message is required' }, 400)
  }

  c.header('Content-Type', 'text/event-stream')
  c.header('Cache-Control', 'no-cache')
  c.header('Connection', 'keep-alive')

  return streamSSE(c, async (stream) => {
    try {
      const ragStream = await ragChain.stream(message)

      for await (const chunk of ragStream) {
        await stream.writeSSE({ data: chunk })
      }
    } catch (error) {
      console.error('Error processing RAG chat request:', error)
      await stream.writeSSE({ data: JSON.stringify({ error: 'An error occurred while processing your request' }) })
    } finally {
      stream.close()
    }
  })
})

// accept rag txt file upload
app.post('/upload', async (c) => {
  const file = await c.req.formData()
  const uploadedFile = file.get('file') as File

  if (!uploadedFile) {
    return c.json({ error: 'No file uploaded' }, 400)
  }

  const filePath = path.join(__dirname, '../uploads', uploadedFile.name)
  
  try {
    // Save the file
    const arrayBuffer = await uploadedFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    await fs.writeFile(filePath, buffer)

    // Initialize RAG with the uploaded file
    await initializeRAG(filePath).then(async () => {
      console.log("RAG initialized")
    })

    return c.json({ message: 'File uploaded and processed successfully' })
  } catch (error) {
    console.error('Error processing upload:', error)
    return c.json({ error: 'Failed to process uploaded file' }, 500)
  }
})

const port = 3000
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})