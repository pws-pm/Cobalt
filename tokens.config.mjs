import pluginSass from "@cobalt-ui/plugin-sass"; 

/** @type {import("@cobalt-ui/core").Config} */
export default {
  tokens: "./tokens.json",
  outDir: "./tokens/",
  plugins: [pluginSass()], 
};