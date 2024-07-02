<template>
  <div class="suggestion-box" @click="$emit('click')">
    <span class="icon">{{ suggestion.icon }}</span>
    <p>{{ suggestion.text }}</p>
  </div>
</template>

<script setup>
defineProps({
  suggestion: {
    type: Object,
    required: true
  }
});

defineEmits(['click']);
</script>

<style scoped>
.suggestion-box {
  background-color: #f0f0f0;
  border-radius: 8px;
  padding: 15px;
  text-align: center;
  width: 22%;
  cursor: pointer;
  transition: background-color 0.3s;
}

.suggestion-box:hover {
  background-color: #e0e0e0;
}

.icon {
  font-size: 24px;
  margin-bottom: 10px;
}

p {
  margin: 0;
  font-size: 14px;
}
</style>