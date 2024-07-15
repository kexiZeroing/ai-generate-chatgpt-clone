<template>
  <div class="app">
    <Header />
    <main>
      <div class="content">
        <div class="file-upload">
          <p>Upload a document to try RAG or just type to chat</p>
          <input type="file" @change="handleFileUpload" accept=".txt" />
          <button @click="uploadFile" :disabled="!selectedFile || isUploading">
            {{ isUploading ? 'Uploading...' : 'Upload' }}
          </button>
        </div>
        <div class="chat-messages" ref="chatContainer">
          <div v-for="(msg, index) in messages" :key="index" :class="msg.type">
            <div class="message-content">
              <p v-if="msg.type === 'user-message'">{{ msg.content }}</p>
              <VueMarkdownIt v-else :source="msg.content" />
            </div>
          </div>
          <div v-if="isLoading" class="loading-message">
            <p>Loading<span class="loading-indicator">...</span></p>
          </div>
        </div>
      </div>
      <ChatInput @send-message="handleMessage" :disabled="isStreaming || isLoading" />
    </main>
    <footer>
      <p>ChatGPT clone powered by Ollama. Responses may not be accurate.</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, onUpdated, nextTick } from 'vue';
import Header from './components/Header.vue';
import ChatInput from './components/ChatInput.vue';
import { VueMarkdownIt } from '@f3ve/vue-markdown-it';
// import { useRouter } from 'vue-router'

// const router = useRouter();

const messages = ref([]);
const isStreaming = ref(false);
const chatContainer = ref(null);

const isLoading = ref(false);
const selectedFile = ref(null);
const isUploading = ref(false);

const handleFileUpload = (event) => {
  selectedFile.value = event.target.files[0];
};

const uploadFile = async () => {
  if (!selectedFile.value) return;

  const formData = new FormData();
  formData.append('file', selectedFile.value);

  isUploading.value = true;
  try {
    await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const url = new URL(window.location);
    url.searchParams.set('rag', 'true');
    window.history.replaceState({}, '', `${window.location.pathname}?${url.searchParams.toString()}`);
  } catch (error) {
    console.error('Error uploading file:', error);
  } finally {
    isUploading.value = false;
  }
};

const handleMessage = async (message) => {
  messages.value.push({ type: 'user-message', content: message });
  isLoading.value = true;

  let eventSource;

  // normal chat or rag
  const endpoint = location.href.includes('?rag') ? 'rag-chat' : 'chat-stream';

  try {
    eventSource = new EventSource(`/api/${endpoint}?message=${encodeURIComponent(message)}`);
    let aiMessage = { type: 'ai-message', content: '' };
    messages.value.push(aiMessage);

    eventSource.onmessage = (event) => {
      if (isLoading.value) isLoading.value = false;
      isStreaming.value = true;
      
      aiMessage.content += event.data;
      
      // Force a re-render
      messages.value = [...messages.value];
      
      // Scroll to bottom
      nextTick(() => {
        if (chatContainer.value) {
          chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
        }
      });
    };

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      eventSource.close();
      isStreaming.value = false;
      isLoading.value = false;
    };

    eventSource.addEventListener('close', () => {
      eventSource.close();
      isStreaming.value = false;
      isLoading.value = false;
    });
  } catch (error) {
    console.error('Error sending message:', error);
    messages.value.push({ type: 'error-message', content: 'Failed to get response. Please try again.' });
    isStreaming.value = false;
    isLoading.value = false;
  }
};

onUpdated(() => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
});
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  box-sizing: border-box;
}

main {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
}

.content {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-messages {
  flex-grow: 1;
  overflow-y: auto;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
}

.user-message, .ai-message, .error-message {
  max-width: 80%;
  padding: 10px;
  margin: 5px;
  border-radius: 10px;
  word-wrap: break-word;
}

.user-message {
  align-self: flex-end;
  background-color: #007bff;
  color: white;
}

.ai-message {
  align-self: flex-start;
  background-color: #f0f0f0;
}

.error-message {
  align-self: center;
  background-color: #ffcccc;
  color: #ff0000;
}

footer {
  text-align: center;
  padding: 10px;
  font-size: 0.8em;
  color: #888;
}

.message-content :deep(pre) {
  background-color: #f4f4f4;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
}

.message-content :deep(code) {
  font-family: 'Courier New', Courier, monospace;
}

.message-content :deep(p) {
  margin: 0 0 10px 0;
}

.message-content :deep(ul), .message-content :deep(ol) {
  margin: 0 0 10px 20px;
}
</style>