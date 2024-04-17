import pluginSass from "@cobalt-ui/plugin-sass";

/** @type {import("@cobalt-ui/core").Config} */
export default {
  tokens: "./tokens.json",
  outDir: "./build/variables/",
  plugins: [
    pluginSass({
      pluginCSS: {
        prefix: "ds",
        modeSelectors: [
          {mode: "light", tokens: ["color.*"], selectors: ['[data-color-theme="light"]']},
          {mode: "dark", tokens: ["color.*"], selectors: ['[data-color-theme="dark"]']},
        ],
      },
    })
  ]
};