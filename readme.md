# TokensBrücke Plugin Setup Guide

## Quick Installation

1. Within the project folder install Cobalt and its plugins locally

```bash
npm i -D @cobalt-ui/cli @cobalt-ui/plugin-css @cobalt-ui/plugin-js @cobalt-ui/plugin-sass
```

2. Install the TokensBrücke plugin from Figma Community: [TokensBrücke Plugin](https://www.figma.com/community/plugin/1254538877056388290/tokensbrucke).

## Generating Tokens.json

Configure and save your `design.tokens.json` in the ./_input folder file using these settings:
- **Color Mode:** `hex`
- **Typography:** `yes`
- **Grids:** `no`
- **Effects:** `yes`
- **Separate Styles:** `keep separate`
- **Variables Scope:** `no`
- **DTCG Format:** `yes`
- **.value String for Aliases:** `off`

## Build with Cobalt

Run the following commands in your project directory:

```bash
npx co build
node postprocess.cjs
```

Use postprocess.cjs to adjust index.scss if needed, to remove colorBase (only if alias are already resolved)