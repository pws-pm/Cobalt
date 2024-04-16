import pluginCSS from "@cobalt-ui/plugin-css";
import pluginSass from "@cobalt-ui/plugin-sass";
import pluginXAML from "./plugins/pluginXAML.js";



/** @type {import("@cobalt-ui/core").Config} */
export default {
  tokens: "./tokens.json",
  outDir: "./build/variables/",
  plugins: [
    pluginSass(),
    pluginXAML({
      filename: "theme.xaml",
    })
  ]
};