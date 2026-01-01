<template>
  <div
    ref="windowRef"
    class="ollama-chat-package shadow-10 rounded-borders overflow-hidden flex flex-column"
    :style="windowStyle"
    :class="isDarkMode ? 'bg-dark border-grey-9' : 'bg-white'"
  >
    <q-toolbar
      @mousedown="startDragging"
      class="cursor-move noselect"
      :class="isDarkMode ? 'bg-black text-white' : 'bg-primary text-white'"
    >
      <q-btn
        flat
        round
        dense
        icon="history"
        @click="showHistory = !showHistory"
        size="sm"
        class="q-mr-sm"
      >
        <q-tooltip>Chat History</q-tooltip>
      </q-btn>

      <q-toolbar-title class="text-weight-bold text-subtitle2">
        {{
          currentChatTitle === "New Conversation" ? botName : currentChatTitle
        }}
      </q-toolbar-title>

      <q-btn
        flat
        round
        dense
        icon="settings"
        @click="showSettings = !showSettings"
        size="sm"
        class="q-mr-xs"
      >
        <q-tooltip>Settings</q-tooltip>
      </q-btn>

      <q-btn
        flat
        round
        dense
        icon="add"
        @click="createNewChat"
        size="sm"
        class="q-mr-xs"
      >
        <q-tooltip>New Chat</q-tooltip>
      </q-btn>

      <q-btn
        v-if="isLoading"
        flat
        round
        dense
        color="red-4"
        icon="stop_circle"
        @click="stopGeneration"
        size="sm"
      />

      <q-btn
        flat
        round
        dense
        :icon="isDarkMode ? 'light_mode' : 'dark_mode'"
        @click="$q.dark.toggle()"
        size="sm"
        class="q-ml-xs"
      />
    </q-toolbar>

    <div
      class="row full-height no-wrap relative-position"
      style="flex: 1; overflow: hidden"
    >
      <transition name="slide">
        <div
          v-if="showHistory"
          class="history-sidebar border-right"
          :class="isDarkMode ? 'bg-grey-9' : 'bg-grey-2'"
        >
          <q-list dense padding>
            <q-item-label header class="text-overline"
              >Recent Chats</q-item-label
            >
            <q-item
              v-for="chat in chatHistory"
              :key="chat.id"
              clickable
              v-ripple
              :active="currentChatId === chat.id"
              @click="loadChat(chat)"
              class="history-item"
            >
              <q-item-section no-wrap>
                <q-item-label lines="1" class="text-caption">{{
                  chat.title
                }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn
                  flat
                  round
                  dense
                  icon="delete"
                  size="xs"
                  color="grey-6"
                  @click.stop="deleteHistory(chat.id)"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </div>
      </transition>

      <div
        class="col flex flex-column full-height relative-position"
        style="display: flex; flex-direction: column"
      >
        <transition name="fade">
          <div
            v-if="showSettings"
            class="settings-overlay q-pa-md"
            :class="isDarkMode ? 'bg-grey-10' : 'bg-grey-1'"
          >
            <div class="row items-center q-mb-md">
              <div class="text-h6">Settings</div>
              <q-space />
              <q-btn
                icon="close"
                flat
                round
                dense
                @click="showSettings = false"
              />
            </div>

            <q-input
              v-model="config.apiUrl"
              label="API Endpoint"
              dense
              outlined
              class="q-mb-sm"
              :dark="isDarkMode"
            />
            <q-input
              v-model="config.apiKey"
              label="API Key (Optional)"
              dense
              outlined
              type="password"
              class="q-mb-sm"
              :dark="isDarkMode"
            />
            <q-input
              v-model="config.model"
              label="Model Name"
              dense
              outlined
              class="q-mb-md"
              :dark="isDarkMode"
            />

            <div class="text-caption q-mb-xs">Parameters</div>
            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-input
                  v-model.number="config.temperature"
                  label="Temp"
                  type="number"
                  step="0.1"
                  dense
                  outlined
                  :dark="isDarkMode"
                />
              </div>
              <div class="col-6">
                <q-input
                  v-model.number="config.maxTokens"
                  label="Max Tokens"
                  type="number"
                  dense
                  outlined
                  :dark="isDarkMode"
                />
              </div>
            </div>

            <q-btn
              color="primary"
              label="Save & Close"
              class="full-width q-mt-lg"
              @click="saveSettings"
            />
          </div>
        </transition>

        <q-scroll-area class="chat-area q-pa-md col" ref="chatScroll">
          <div v-for="(msg, index) in messages" :key="index" class="q-mb-md">
            <q-chat-message
              v-if="msg.role !== 'system'"
              :name="msg.role === 'user' ? 'Me' : botName"
              :sent="msg.role === 'user'"
              :bg-color="
                msg.role === 'user'
                  ? 'blue-7'
                  : isDarkMode
                  ? 'grey-9'
                  : 'grey-3'
              "
              :text-color="
                msg.role === 'user' || isDarkMode ? 'white' : 'black'
              "
            >
              <template v-slot:avatar>
                <q-avatar
                  size="32px"
                  :class="msg.role === 'user' ? 'q-ml-sm' : 'q-mr-sm'"
                >
                  <q-icon
                    :name="msg.role === 'user' ? 'person' : 'smart_toy'"
                    :color="msg.role === 'user' ? 'blue-7' : 'grey-6'"
                  />
                </q-avatar>
              </template>
              <div
                class="markdown-body-wrapper"
                v-html="renderMarkdown(msg.displayContent)"
                @click="handleContentClick"
                :class="{ 'dark-mode': isDarkMode }"
              ></div>
            </q-chat-message>
          </div>
          <q-chat-message
            v-if="isLoading && currentBotText === ''"
            :name="botName"
            :bg-color="isDarkMode ? 'grey-9' : 'grey-3'"
          >
            <template v-slot:avatar
              ><q-avatar size="32px"
                ><q-icon name="smart_toy" color="grey-6" /></q-avatar
            ></template>
            <q-spinner-dots size="1.5rem" />
          </q-chat-message>
        </q-scroll-area>

        <div
          class="q-pa-sm border-top"
          :class="isDarkMode ? 'bg-black' : 'bg-white'"
        >
          <q-input
            ref="chatInput"
            v-model="userInput"
            @keyup.enter="sendMessage"
            :placeholder="placeholder"
            outlined
            rounded
            dense
            :dark="isDarkMode"
            :disable="isLoading"
          >
            <template v-slot:after>
              <q-btn
                v-if="!isLoading"
                round
                flat
                icon="send"
                color="primary"
                @click="sendMessage"
                dense
              />
              <q-btn
                v-else
                round
                flat
                icon="stop"
                color="negative"
                @click="stopGeneration"
                dense
              />
            </template>
          </q-input>
        </div>
      </div>
    </div>
    <div class="resize-handle" @mousedown="startResizing"></div>
  </div>
</template>

<script setup>
import {
  ref,
  reactive,
  computed,
  nextTick,
  onMounted,
  defineProps,
  defineEmits,
} from "vue";
import { copyToClipboard, useQuasar } from "quasar";
import MarkdownIt from "markdown-it";

const props = defineProps({
  apiUrl: {
    type: String,
    default: "http://localhost:11434/v1/chat/completions",
  },
  apiKey: { type: String, default: "" },
  model: { type: String, default: "gemma3:4b" },
  botName: { type: String, default: "Ollama AI" },
  systemPrompt: { type: String, default: "You are a helpful assistant." },
  temperature: { type: Number, default: 0.7 },
  maxTokens: { type: Number, default: 2048 },
  initialWidth: { type: Number, default: 550 },
  initialHeight: { type: Number, default: 700 },
  placeholder: { type: String, default: "Ask me anything..." },
});

const emit = defineEmits(["message-sent", "message-received", "error"]);
const $q = useQuasar();

// --- Reactive Config ---
const config = reactive({
  apiUrl: props.apiUrl,
  apiKey: props.apiKey,
  model: props.model,
  temperature: props.temperature,
  maxTokens: props.maxTokens,
});

const showSettings = ref(false);
const isDarkMode = computed(() => $q?.dark?.isActive ?? false);
const userInput = ref("");
const isLoading = ref(false);
const chatScroll = ref(null);
const chatInput = ref(null);
const abortController = ref(null);
const currentBotText = ref("");
const showHistory = ref(false);
const messages = ref([]);
const chatHistory = ref([]);
const currentChatId = ref(null);

const currentChatTitle = computed(() => {
  const active = chatHistory.value.find((c) => c.id === currentChatId.value);
  return active ? active.title : "New Conversation";
});

// Window State
const windowPos = reactive({
  x: 0,
  y: 0,
  w: props.initialWidth,
  h: props.initialHeight,
});
const windowStyle = computed(() => ({
  transform: `translate(${windowPos.x}px, ${windowPos.y}px)`,
  width: `${windowPos.w}px`,
  height: `${windowPos.h}px`,
  position: "absolute",
  zIndex: 1000,
}));

// --- Markdown ---
const md = new MarkdownIt({ html: true, linkify: true });
md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const code = token.content.trim();
  return `<div class="code-wrapper"><div class="code-header"><span>${
    token.info || "code"
  }</span><button class="copy-btn" data-code="${encodeURIComponent(
    code
  )}">COPY</button></div>${md.renderer.rules.fence.default(
    tokens,
    idx,
    options,
    env,
    self
  )}</div>`;
};
const renderMarkdown = (content) => md.render(content || "");

// --- Methods ---
const saveSettings = () => {
  localStorage.setItem("ollama_chat_config", JSON.stringify(config));
  showSettings.value = false;
  $q.notify({ message: "Settings Saved", color: "positive", timeout: 1000 });
};

onMounted(() => {
  const savedConfig = localStorage.getItem("ollama_chat_config");
  if (savedConfig) Object.assign(config, JSON.parse(savedConfig));

  const storageKey = `history_${props.botName.replace(/\s/g, "_")}`;
  const savedHistory = localStorage.getItem(storageKey);
  if (savedHistory) {
    chatHistory.value = JSON.parse(savedHistory);
    chatHistory.value.length > 0
      ? loadChat(chatHistory.value[0])
      : createNewChat();
  } else {
    createNewChat();
  }
});

const sendMessage = async () => {
  if (!userInput.value.trim() || isLoading.value) return;
  const text = userInput.value;
  messages.value.push({ role: "user", content: text, displayContent: text });
  userInput.value = "";
  const botIdx = messages.value.length;
  messages.value.push({ role: "assistant", content: "", displayContent: "" });

  isLoading.value = true;
  currentBotText.value = "";
  abortController.value = new AbortController();
  scrollToBottom(true);

  const headers = { "Content-Type": "application/json" };
  if (config.apiKey) headers["Authorization"] = `Bearer ${config.apiKey}`;

  try {
    const res = await fetch(config.apiUrl, {
      method: "POST",
      headers: headers,
      signal: abortController.value.signal,
      body: JSON.stringify({
        model: config.model,
        messages: messages.value
          .slice(0, -1)
          .map((m) => ({ role: m.role, content: m.content })),
        stream: true,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      }),
    });

    // Check if the response is successful (e.g., handles 404 for wrong model)
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `API Error: ${res.status} ${res.statusText}`
      );
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split("\n");
      for (const line of lines) {
        const cleaned = line.replace(/^data: /, "").trim();
        if (!cleaned || cleaned === "[DONE]") continue;
        try {
          const json = JSON.parse(cleaned);
          const content =
            json.choices?.[0]?.delta?.content || json.message?.content || "";
          if (content) {
            messages.value[botIdx].content += content;
            messages.value[botIdx].displayContent =
              messages.value[botIdx].content;
            scrollToBottom();
          }
        } catch (e) {}
      }
    }
  } catch (err) {
    let errorDisplay = "";
    if (err.name === "AbortError") {
      errorDisplay = "*Stopped by user*";
    } else {
      // Display specific error details in chat
      errorDisplay = `⚠️ **Error:** ${
        err.message ||
        "Could not connect to the API. Check your model name and network."
      }`;
    }
    messages.value[botIdx].content = errorDisplay;
    messages.value[botIdx].displayContent = errorDisplay;
    emit("error", err);
  } finally {
    isLoading.value = false;
    saveToLocalStorage();
    // Return focus to input after processing completes
    nextTick(() => {
      if (chatInput.value) chatInput.value.focus();
    });
  }
};

const createNewChat = () => {
  const id = Date.now();
  const newChat = {
    id,
    title: "New Conversation",
    messages: [
      {
        role: "system",
        content: props.systemPrompt,
        displayContent: props.systemPrompt,
      },
      {
        role: "assistant",
        content: `Hello! I am ${props.botName}.`,
        displayContent: `Hello! I am ${props.botName}.`,
      },
    ],
  };
  chatHistory.value.unshift(newChat);
  loadChat(newChat);
};

const loadChat = (chat) => {
  currentChatId.value = chat.id;
  messages.value = chat.messages.map((m) => ({
    ...m,
    displayContent: m.content,
  }));
  nextTick(() => {
    scrollToBottom(true);
    if (chatInput.value) chatInput.value.focus();
  });
};

const saveToLocalStorage = () => {
  const storageKey = `history_${props.botName.replace(/\s/g, "_")}`;
  const chatIndex = chatHistory.value.findIndex(
    (c) => c.id === currentChatId.value
  );
  if (chatIndex !== -1) {
    chatHistory.value[chatIndex].messages = [...messages.value];
    if (
      chatHistory.value[chatIndex].title === "New Conversation" &&
      messages.value.length > 2
    ) {
      const firstUserMsg = messages.value.find((m) => m.role === "user");
      if (firstUserMsg)
        chatHistory.value[chatIndex].title = firstUserMsg.content.substring(
          0,
          30
        );
    }
  }
  localStorage.setItem(storageKey, JSON.stringify(chatHistory.value));
};

const startDragging = (e) => {
  if (e.target.closest("button")) return;
  const startX = e.clientX - windowPos.x;
  const startY = e.clientY - windowPos.y;
  const move = (e) => {
    windowPos.x = e.clientX - startX;
    windowPos.y = e.clientY - startY;
  };
  const up = () => {
    document.removeEventListener("mousemove", move);
    document.removeEventListener("mouseup", up);
  };
  document.addEventListener("mousemove", move);
  document.addEventListener("mouseup", up);
};

const startResizing = (e) => {
  const startW = windowPos.w;
  const startH = windowPos.h;
  const startX = e.clientX;
  const startY = e.clientY;
  const move = (e) => {
    windowPos.w = Math.max(400, startW + (e.clientX - startX));
    windowPos.h = Math.max(400, startH + (e.clientY - startY));
  };
  const up = () => {
    document.removeEventListener("mousemove", move);
    document.removeEventListener("mouseup", up);
  };
  document.addEventListener("mousemove", move);
  document.addEventListener("mouseup", up);
};

const scrollToBottom = (force = false) => {
  const area = chatScroll.value;
  if (!area) return;
  const target = area.getScrollTarget();
  if (
    force ||
    target.scrollHeight - target.offsetHeight - area.getScrollPosition().top <
      150
  ) {
    nextTick(() => area.setScrollPosition("vertical", target.scrollHeight, 0));
  }
};

const handleContentClick = (e) => {
  if (e.target.classList.contains("copy-btn")) {
    copyToClipboard(decodeURIComponent(e.target.dataset.code)).then(() => {
      $q.notify({
        message: "Copied!",
        color: "positive",
        position: "top",
        timeout: 800,
      });
    });
  }
};
const stopGeneration = () => abortController.value?.abort();
const deleteHistory = (id) => {
  chatHistory.value = chatHistory.value.filter((c) => c.id !== id);
  saveToLocalStorage();
  if (currentChatId.value === id) createNewChat();
};
</script>

<style scoped>
.settings-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  backdrop-filter: blur(4px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.ollama-chat-package {
  display: flex;
  flex-direction: column;
  z-index: 1000;
  border: 1px solid rgba(0, 0, 0, 0.1);
}
.history-sidebar {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid rgba(0, 0, 0, 0.1);
}
.chat-area {
  flex: 1;
}
.resize-handle {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 15px;
  height: 15px;
  cursor: nwse-resize;
  background: linear-gradient(135deg, transparent 50%, #888 50%);
}
.markdown-body-wrapper :deep(.code-wrapper) {
  background: #1e1e1e;
  border-radius: 6px;
  overflow: hidden;
  margin: 10px 0;
}
.markdown-body-wrapper :deep(.code-header) {
  background: #2d2d2d;
  padding: 4px 10px;
  display: flex;
  justify-content: space-between;
  color: #999;
  font-size: 10px;
}
.markdown-body-wrapper :deep(pre) {
  padding: 12px;
  margin: 0;
  color: #f8f8f2;
}
.slide-enter-active,
.slide-leave-active {
  transition: all 0.25s ease-out;
}
.slide-enter-from,
.slide-leave-to {
  width: 0;
  opacity: 0;
}
</style>
