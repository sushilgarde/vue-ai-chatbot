<template>
  <div
    ref="windowRef"
    class="ollama-chat-package shadow-10 rounded-borders overflow-hidden flex flex-column"
    :style="windowStyle"
    :class="$q.dark.isActive ? 'bg-dark border-grey-9' : 'bg-white'"
  >
    <q-toolbar
      @mousedown="startDragging"
      class="cursor-move noselect"
      :class="
        $q.dark.isActive ? 'bg-black text-white' : 'bg-primary text-white'
      "
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
        :icon="$q.dark.isActive ? 'light_mode' : 'dark_mode'"
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
          :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-2'"
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
        <q-scroll-area class="chat-area q-pa-md col" ref="chatScroll">
          <div v-for="(msg, index) in messages" :key="index" class="q-mb-md">
            <q-chat-message
              v-if="msg.role !== 'system'"
              :name="msg.role === 'user' ? 'Me' : botName"
              :sent="msg.role === 'user'"
              :bg-color="
                msg.role === 'user'
                  ? 'blue-7'
                  : $q.dark.isActive
                  ? 'grey-9'
                  : 'grey-3'
              "
              :text-color="
                msg.role === 'user' || $q.dark.isActive ? 'white' : 'black'
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
                :class="{ 'dark-mode': $q.dark.isActive }"
              ></div>
            </q-chat-message>
          </div>

          <q-chat-message
            v-if="isLoading && currentBotText === ''"
            :name="botName"
            :bg-color="$q.dark.isActive ? 'grey-9' : 'grey-3'"
          >
            <template v-slot:avatar>
              <q-avatar size="32px" class="q-mr-sm">
                <q-icon name="smart_toy" color="grey-6" />
              </q-avatar>
            </template>
            <q-spinner-dots size="1.5rem" />
          </q-chat-message>
        </q-scroll-area>

        <div
          class="q-pa-sm border-top"
          :class="$q.dark.isActive ? 'bg-black' : 'bg-white'"
        >
          <q-input
            ref="chatInput"
            v-model="userInput"
            @keyup.enter="sendMessage"
            :placeholder="placeholder"
            outlined
            rounded
            dense
            :dark="$q.dark.isActive"
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

// --- Props (OpenAI Standard Parameters) ---
const props = defineProps({
  // Connection
  apiUrl: { type: String, default: "http://localhost:11434/api/chat" },
  model: { type: String, default: "gemma3:4b" },
  botName: { type: String, default: "Ollama AI" },

  // Model Parameters
  systemPrompt: { type: String, default: "You are a helpful assistant." },
  temperature: { type: Number, default: 0.7 },
  topP: { type: Number, default: 0.9 },
  maxTokens: { type: Number, default: 2048 },
  frequencyPenalty: { type: Number, default: 0 },
  presencePenalty: { type: Number, default: 0 },

  // UI
  placeholder: { type: String, default: "Ask me anything..." },
  initialWidth: { type: Number, default: 550 },
  initialHeight: { type: Number, default: 700 },
});

const emit = defineEmits(["message-sent", "message-received", "error"]);

const $q = useQuasar();
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

// --- Window Position & Size ---
const windowPos = reactive({
  x: 0,
  y: 0,
  w: props.initialWidth,
  h: props.initialHeight,
});
const isDragging = ref(false);
const isResizing = ref(false);

const windowStyle = computed(() => ({
  transform: `translate(${windowPos.x}px, ${windowPos.y}px)`,
  width: `${windowPos.w}px`,
  height: `${windowPos.h}px`,
  position: "absolute",
  zIndex: 1000,
}));

// --- Markdown Setup ---
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

// --- Lifecycle & Persistence ---
onMounted(() => {
  const storageKey = `history_${props.botName.replace(/\s/g, "_")}`;
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    chatHistory.value = JSON.parse(saved);
    chatHistory.value.length > 0
      ? loadChat(chatHistory.value[0])
      : createNewChat();
  } else {
    createNewChat();
  }
});

const saveToLocalStorage = () => {
  const storageKey = `history_${props.botName.replace(/\s/g, "_")}`;
  localStorage.setItem(storageKey, JSON.stringify(chatHistory.value));
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
    focusInput();
  });
};

const deleteHistory = (id) => {
  chatHistory.value = chatHistory.value.filter((c) => c.id !== id);
  saveToLocalStorage();
  if (currentChatId.value === id) createNewChat();
};

// --- Movement & Resizing ---
const startDragging = (e) => {
  if (e.target.closest("button")) return;
  isDragging.value = true;
  const startX = e.clientX - windowPos.x;
  const startY = e.clientY - windowPos.y;
  const move = (e) => {
    windowPos.x = e.clientX - startX;
    windowPos.y = e.clientY - startY;
  };
  const up = () => {
    isDragging.value = false;
    document.removeEventListener("mousemove", move);
  };
  document.addEventListener("mousemove", move);
  document.addEventListener("mouseup", up);
};

const startResizing = (e) => {
  isResizing.value = true;
  const startW = windowPos.w;
  const startH = windowPos.h;
  const startX = e.clientX;
  const startY = e.clientY;
  const move = (e) => {
    windowPos.w = Math.max(400, startW + (e.clientX - startX));
    windowPos.h = Math.max(400, startH + (e.clientY - startY));
  };
  const up = () => {
    isResizing.value = false;
    document.removeEventListener("mousemove", move);
  };
  document.addEventListener("mousemove", move);
  document.addEventListener("mouseup", up);
};

// --- AI Chat Logic ---
const focusInput = () => nextTick(() => chatInput.value?.focus());
const stopGeneration = () => abortController.value?.abort();

const handleContentClick = (e) => {
  if (e.target.classList.contains("copy-btn")) {
    copyToClipboard(decodeURIComponent(e.target.dataset.code)).then(() => {
      $q.notify({
        message: "Copied!",
        color: "positive",
        position: "top",
        timeout: 800,
      });
      focusInput();
    });
  }
};

const scrollToBottom = (force = false) => {
  const area = chatScroll.value;
  if (!area) return;
  const target = area.getScrollTarget();
  const isAtBottom =
    target.scrollHeight - target.offsetHeight - area.getScrollPosition().top <
    150;
  if (force || isAtBottom) {
    nextTick(() => area.setScrollPosition("vertical", target.scrollHeight, 0));
  }
};

const sendMessage = async () => {
  if (!userInput.value.trim() || isLoading.value) return;
  const text = userInput.value;

  emit("message-sent", text);
  messages.value.push({ role: "user", content: text, displayContent: text });
  userInput.value = "";

  const botIdx = messages.value.length;
  messages.value.push({ role: "assistant", content: "", displayContent: "" });

  isLoading.value = true;
  currentBotText.value = "";
  abortController.value = new AbortController();
  scrollToBottom(true);

  const currentChat = chatHistory.value.find(
    (c) => c.id === currentChatId.value
  );
  if (currentChat && currentChat.title === "New Conversation") {
    currentChat.title = text.substring(0, 30) + (text.length > 30 ? "..." : "");
  }

  try {
    const res = await fetch(props.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: abortController.value.signal,
      body: JSON.stringify({
        model: props.model,
        messages: messages.value
          .slice(0, -1)
          .map((m) => ({ role: m.role, content: m.content })),
        stream: true,
        options: {
          temperature: props.temperature,
          top_p: props.topP,
          num_predict: props.maxTokens,
          frequency_penalty: props.frequencyPenalty,
          presence_penalty: props.presencePenalty,
        },
      }),
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let renderFrame;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split("\n");
      for (const line of lines) {
        if (!line.trim()) continue;
        const json = JSON.parse(line);
        if (json.message?.content) {
          messages.value[botIdx].content += json.message.content;
          currentBotText.value = messages.value[botIdx].content;

          // requestAnimationFrame ensures render only happens on screen refresh
          cancelAnimationFrame(renderFrame);
          renderFrame = requestAnimationFrame(() => {
            messages.value[botIdx].displayContent =
              messages.value[botIdx].content;
            scrollToBottom();
          });
        }
      }
    }
    emit("message-received", messages.value[botIdx].content);
  } catch (err) {
    if (err.name === "AbortError")
      messages.value[botIdx].content += "\n\n**[Stopped]**";
    else {
      messages.value[botIdx].content = "⚠️ Connection Error.";
      emit("error", err);
    }
    messages.value[botIdx].displayContent = messages.value[botIdx].content;
  } finally {
    isLoading.value = false;
    abortController.value = null;
    if (currentChat) {
      currentChat.messages = messages.value.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      saveToLocalStorage();
    }
    scrollToBottom(true);
    focusInput();
  }
};
</script>

<style lang="scss">
.ollama-chat-package {
  display: flex;
  flex-direction: column;
  z-index: 1000;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.history-sidebar {
  width: 220px;
  height: 100%;
  overflow-y: auto;
  border-right: 1px solid rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.chat-area {
  flex: 1;
}
.border-top {
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}
.border-right {
  border-right: 1px solid rgba(0, 0, 0, 0.1);
}
.noselect {
  user-select: none;
}

.resize-handle {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 15px;
  height: 15px;
  cursor: nwse-resize;
  background: linear-gradient(135deg, transparent 50%, #888 50%);
  z-index: 1001;
}

/* ANTI-FLICKER & LAYOUT STABILITY */
.markdown-body-wrapper {
  contain: content;
  min-width: 50px;
  line-height: 1.5;
  font-size: 0.9rem;
  word-break: break-word;

  &.dark-mode {
    color: #e0e0e0;
  }

  .code-wrapper {
    position: relative;
    margin: 10px 0;
    background: #1e1e1e;
    border-radius: 6px;
    border: 1px solid #444;
    overflow: hidden;
    backface-visibility: hidden;

    .code-header {
      background: #2d2d2d;
      padding: 4px 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      span {
        font-family: monospace;
        font-size: 10px;
        color: #999;
        text-transform: uppercase;
      }
      .copy-btn {
        background: #444;
        color: #fff;
        border: none;
        padding: 2px 8px;
        border-radius: 3px;
        font-size: 9px;
        cursor: pointer;
        &:hover {
          background: #027be3;
        }
      }
    }

    pre {
      margin: 0;
      padding: 12px;
      overflow-x: auto;
      min-height: 1em;
      code {
        color: #f8f8f2;
        white-space: pre-wrap;
      }
    }
  }
}

/* Animations */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.25s ease-out;
}
.slide-enter-from,
.slide-leave-to {
  width: 0;
  opacity: 0;
  transform: translateX(-10px);
}
</style>
