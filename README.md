# Vue3 AI Chatbot Setup & Configuration

## 🚀 Setup

### 1. Create a Vue Application

```bash
npm create vue@latest

```

### 2. Install Package

```bash
npm install vue3-ai-chatbot

```

You can use blank Vue project option and follow instructions given by Vite.

### 3. Register the Plugin

In your `main.js`, initialize Quasar first, then register the Chatbot plugin.

```javascript
import { createApp } from "vue";
import { Quasar } from "quasar";
import App from "./App.vue";

// Import Quasar CSS (Required for UI components)
import "quasar/dist/quasar.css";
import "@quasar/extras/material-icons/material-icons.css";

// Import the Chatbot
import VueAiChatbot from "vue3-ai-chatbot";

const app = createApp(App);

app.use(Quasar, { config: {} });
app.use(VueAiChatbot);

app.mount("#app");
```

## 🛠 Basic Usage Example

```vue
<template>
  <div>
    <button class="btn-top-left" @click="toggleChatbot">
      {{ showChatbot ? "Hide Chatbot" : "Show Chatbot" }}
    </button>

    <VueAiChatbot v-if="showChatbot" />
  </div>
</template>

<script setup>
import { ref } from "vue";

const showChatbot = ref(false);

const toggleChatbot = () => {
  showChatbot.value = !showChatbot.value;
};
</script>
```

---

## ⚙️ Props Configuration

You can customize the chatbot behavior by passing the following props to the `<VueAiChatbot />` component:

| Prop            | Type   | Default                           | Description                                                  |
| --------------- | ------ | --------------------------------- | ------------------------------------------------------------ |
| `apiUrl`        | String | `http://localhost:11434/api/chat` | The endpoint for your Ollama or OpenAI-compatible API.       |
| `model`         | String | `llama3`                          | The specific AI model ID to call.                            |
| `botName`       | String | `Ollama AI`                       | The name displayed in the chat header and assistant bubbles. |
| `systemPrompt`  | String | `You are a helpful assistant.`    | The initial instructions provided to the AI.                 |
| `placeholder`   | String | `Ask me anything...`              | The text shown in the empty input field.                     |
| `temperature`   | Number | `0.7`                             | Controls randomness (0.0 is deterministic, 2.0 is creative). |
| `maxTokens`     | Number | `2048`                            | The maximum number of tokens to generate in a response.      |
| `initialWidth`  | Number | `550`                             | Initial width of the chat window in pixels.                  |
| `initialHeight` | Number | `700`                             | Initial height of the chat window in pixels.                 |

---
