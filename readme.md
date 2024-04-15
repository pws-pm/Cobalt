# TokensBrücke Plugin Setup Guide

## Quick Installation

1. Install the TokensBrücke plugin from Figma Community: [TokensBrücke Plugin](https://www.figma.com/community/plugin/1254538877056388290/tokensbrucke).

## Generating Tokens.json

Configure and save your `tokens.json` in the project folder file using these settings:
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