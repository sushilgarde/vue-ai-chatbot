import ChatInterface from "./src/ChatInterface.vue";

export default {
  install: (app) => {
    app.component("ChatInterface", ChatInterface);
  },
};

export { VueAiChatbot };
