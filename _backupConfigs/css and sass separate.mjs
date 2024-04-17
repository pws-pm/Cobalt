import pluginCSS from "@cobalt-ui/plugin-css";
import pluginSass from "@cobalt-ui/plugin-sass"; 

/** @type {import("@cobalt-ui/core").Config} */
export default {
  tokens: "./tokens.json",
  outDir: "./build/variables/",
  plugins: [
    pluginSass(),
    pluginCSS()
  ]
};