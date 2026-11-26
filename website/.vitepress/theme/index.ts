import DefaultTheme from "vitepress/theme";
import MapDemo from "./MapDemo.vue";
import BasemapDemo from "./BasemapDemo.vue";
import "./custom.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }: { app: any }) {
    app.component("MapDemo", MapDemo);
    app.component("BasemapDemo", BasemapDemo);
  },
};
