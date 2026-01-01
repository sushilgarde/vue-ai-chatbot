import VueAiChatbot from "./src/VueAiChatbot.vue";
// Import only the components you used
import {
  QBtn,
  QInput,
  QToolbar,
  QToolbarTitle,
  QIcon,
  QAvatar,
  QChatMessage,
  QScrollArea,
  QSpinnerDots,
  QList,
  QItem,
  QItemSection,
  QItemLabel,
  QTooltip,
  Ripple,
} from "quasar";

const install = (app) => {
  // Register components globally so the user doesn't have to
  const components = {
    QBtn,
    QInput,
    QToolbar,
    QToolbarTitle,
    QIcon,
    QAvatar,
    QChatMessage,
    QScrollArea,
    QSpinnerDots,
    QList,
    QItem,
    QItemSection,
    QItemLabel,
    QTooltip,
  };

  Object.entries(components).forEach(([name, component]) => {
    app.component(name, component);
  });

  // Register Directive
  app.directive("ripple", Ripple);

  app.component("VueAiChatbot", VueAiChatbot);
};

export default { install };
export { VueAiChatbot };
