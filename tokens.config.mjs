//import pluginCSS from "@cobalt-ui/plugin-css";
import pluginSass from "@cobalt-ui/plugin-sass";
import pluginMAUI from "./plugins/pluginMAUI.js";



/** @type {import("@cobalt-ui/core").Config} */
export default {
  tokens: "./tokens.json",
  outDir: "./build/variables/",
  plugins: [
    pluginSass(),
    pluginMAUI({
      filename: "theme.xaml",
    })
  ]
};