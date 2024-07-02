<template>
  <div class="app">
    <Header />
    <main>
      <div class="content">
        <div class="suggestion-boxes" v-if="messages.length === 0">
          <SuggestionBox 
            v-for="suggestion in suggestions" 
            :key="suggestion.id" 
            :suggestion="suggestion"
            @click="handleSuggestion(suggestion.text)"
          />
        </div>
        <div class="chat-messages" ref="chatContainer">
          <div v-for="(msg, index) in messages" :key="index" :class="msg.type">
            <div class="message-content">
              <p v-if="msg.type === 'user-message'">{{ msg.content }}</p>
              <VueMarkdownIt v-else :source="msg.content" />
            </div>
          </div>
          <div v-if="loading" class="loading-message">
            <p>AI is thinking...</p>
          </div>
        </div>
      </div>
      <ChatInput @send-message="handleMessage" :loading="loading" />
    </main>
    <footer>
      <p>ChatGPT clone powered by Ollama. Responses may not be accurate.</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, onUpdated, nextTick } from 'vue';
import Header from './components/Header.vue';
import SuggestionBox from './components/SuggestionBox.vue';
import ChatInput from './components/ChatInput.vue';
import { VueMarkdownIt } from '@f3ve/vue-markdown-it';

const suggestions = ref([
  { id: 1, icon: '💡', text: 'What to do with kids\' art' },
  { id: 2, icon: '🗺️', text: 'Experience Seoul like a local' },
  { id: 3, icon: '🦈', text: 'Superhero shark story' },
  { id: 4, icon: '🌐', text: 'Make me a personal webpage' },
]);

const messages = ref([]);
const loading = ref(false);
const chatContainer = ref(null);

const handleMessage = async (message) => {
  messages.value.push({ type: 'user-message', content: message });
  loading.value = true;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    messages.value.push({ type: 'ai-message', content: data.reply });
  } catch (error) {
    console.error('Error sending message:', error);
    messages.value.push({ type: 'error-message', content: 'Failed to get response. Please try again.' });
  } finally {
    loading.value = false;
  }
};

const handleSuggestion = (text) => {
  handleMessage(text);
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

.suggestion-boxes {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
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

.loading-message {
  align-self: center;
  color: #888;
  font-style: italic;
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