<template>
  <div class="chat-input">
    <input 
      type="text" 
      v-model="message" 
      @keyup.enter="sendMessage"
      placeholder="Message ChatGPT"
      :disabled="loading"
    >
    <button @click="sendMessage" :disabled="loading">
      {{ loading ? 'Sending...' : 'Send' }}
    </button>
  </div>
</template>


<script setup>
import { ref } from 'vue';

const message = ref('');
const emit = defineEmits(['send-message']);

const props = defineProps({
  loading: {
    type: Boolean,
    default: false
  }
});

const sendMessage = () => {
  if (message.value.trim() && !props.loading) {
    emit('send-message', message.value);
    message.value = '';
  }
};
</script>

<style scoped>
.chat-input {
  display: flex;
  padding: 10px 0;
  background-color: white;
}

input {
  flex-grow: 1;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

button {
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  margin-left: 10px;
  cursor: pointer;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}
</style>