/**
 * Version 1.03
 * 
 * pluginMAUI Configuration Options
 * 
 * This plugin generates a XAML ResourceDictionary from design tokens. It supports an optional
 * 'excludePatterns' parameter to exclude tokens based on their IDs. 
 *
 * Usage:
 * The 'excludePatterns' parameter accepts an array of string patterns. Each string is a regular 
 * expression that is tested against the token IDs. Any token whose ID matches any of the provided 
 * patterns will be excluded from the output.
 *
 * Example Configuration to exclude tokens that start with 'colorbase' or end with 'temporary':
 *
 * import pluginMAUI from "./plugins/pluginMAUI.js";
 *
 * export default {
 *   plugins: [
 *     pluginMAUI({
 *       excludePatterns: ["^colorbase", "temporary$"]
 *     }),
 *   ],
 * };
 */

export default function pluginMAUI(options = {}) {
  const { excludePatterns = [], outputDirectory = "./" } = options;

  // Validate options structure
  if (!Array.isArray(excludePatterns) || typeof outputDirectory !== 'string') {
    throw new Error("Invalid options: 'excludePatterns' must be an array and 'outputDirectory' must be a string.");
  }

  return {
    name: "pluginMAUI",

    async build({ tokens, rawSchema }) {
      // Validate tokens array
      if (!Array.isArray(tokens)) {
        throw new Error("Invalid input: 'tokens' must be an array.");
      }

      try {
        const allModes = detectAllModes(tokens);
        const regexPatterns = excludePatterns.map(pattern => {
          try {
            return new RegExp(pattern);
          } catch (error) {
            throw new Error(`Invalid regex pattern: ${pattern}`);
          }
        });
        let baseContent = createResourceDictionary(tokens, regexPatterns, convertTokenToMAUI);
        const outputs = [{
          filename: `${outputDirectory}/theme.xaml`,
          contents: baseContent,
        }];

        allModes.forEach(mode => {
          const modeOutputs = createResourceDictionaryForMode(tokens, regexPatterns, mode, outputDirectory);
          outputs.push(...modeOutputs);
        });

        return outputs;
      } catch (error) {
        console.error("Error in build process:", error);
        throw new Error("Failed to build themes due to an internal error.");
      }
    }
  };
}

function detectAllModes(tokens) {
  const modeSet = new Set();
  tokens.forEach(token => {
    if (token.$extensions && token.$extensions.mode) {
      Object.keys(token.$extensions.mode).forEach(mode => modeSet.add(mode));
    }
  });
  return Array.from(modeSet);
}

function createResourceDictionary(tokens, regexPatterns, convertFunction) {
  let xamlContent = `<ResourceDictionary xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
                      xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">\n`;

  const filteredTokens = tokens.filter(token => 
      !regexPatterns.some(regex => regex.test(token.id)));

  const groupedTokens = groupTokensByType(filteredTokens);
  for (const [type, tokensOfType] of Object.entries(groupedTokens)) {
    xamlContent += `\n  <!-- ${type.toUpperCase()} Tokens -->\n`;
    xamlContent += tokensOfType.map(token => convertFunction(token)).join("");
    xamlContent += "\n";
  }

  xamlContent += "\n</ResourceDictionary>";
  return xamlContent;
}

function createResourceDictionaryForMode(tokens, regexPatterns, mode, outputDirectory) {
  try {
    const groupedTokens = groupTokensByCollectionAndMode(tokens, mode, regexPatterns);
    
    return Object.entries(groupedTokens).map(([collectionName, tokensOfCollection]) => {
      let xamlContent = `<ResourceDictionary xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
                          xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">\n`;

      xamlContent += tokensOfCollection.map(token => convertTokenToMAUI(token)).join("");
      xamlContent += "</ResourceDictionary>";

      return {
        filename: `${outputDirectory}/theme.${collectionName}.${mode}.xaml`,
        contents: xamlContent,
      };
    });
  } catch (error) {
    console.error(`Error processing mode ${mode}:`, error);
    throw new Error(`Failed to create resource dictionary for mode ${mode} due to an internal error.`);
  }
}

function groupTokensByCollectionAndMode(tokens, mode, regexPatterns) {
  return tokens
    .filter(token =>
      token.$extensions &&
      token.$extensions.mode &&
      token.$extensions.mode[mode] &&
      !regexPatterns.some(regex => regex.test(token.id))
    )
    .reduce((acc, token) => {
      const collectionName = token.$extensions.figma.collection.name;
      const modeToken = {
        ...token,
        $value: token.$extensions.mode[mode],
      };

      if (!acc[collectionName]) {
        acc[collectionName] = [];
      }
      acc[collectionName].push(modeToken);
      return acc;
    }, {});
}

function convertTokenToMAUI(token, mode = null) {
  let xaml = '';
  let value = mode && token.$extensions && token.$extensions.mode && token.$extensions.mode[mode]
              ? token.$extensions.mode[mode]
              : token.$value; // Use the default $value if no mode-specific value is provided

  switch (token.$type) {
      case 'color':
          xaml = `  <Color x:Key="${token.id}">${convertColorFormat(value)}</Color>\n`;
          break;
      case 'dimension':
          xaml = `  <x:Double x:Key="${token.id}">${parseDimension(value)}</x:Double>\n`;
          break;
      case 'shadow':
          xaml = convertShadowToMAUI(token, value) + '\n';
          break;
      case 'typography':
          xaml = convertTypographyToXAML(token, value) + '\n';
          break;
  }

  return xaml;
}

function convertShadowToMAUI(token, value) {
  const shadowCount = value.length;
  let xamlOutput = [];

  const isInsetGroup = value.some(shadow => shadow.inset);

  if (isInsetGroup) {
    xamlOutput.push(`  <!-- Inset shadows for ${token.id}. All tokens in this group should be used together. Apply using clipped borders inside the main component. Ensure the Z-index is set higher so shadows are visible within the component content. -->`);
  } else {
    xamlOutput.push(`  <!-- Drop shadows for ${token.id}. All tokens in this group should be used together. Apply using separate Frames behind the main component. Ensure the Z-index is set lower so shadows appear behind the component content. -->`);
  }

  value.forEach((shadow, index) => {
    const key = shadowCount > 1 ? `${token.id}-${index + 1}` : token.id;
    const margin = parseFloat(shadow.spread.replace('px', ''));

    xamlOutput.push(`  <Shadow x:Key="${key}" Brush="${shadow.color}" Radius="${parseDimension(shadow.blur)}" Opacity="1" Offset="${parseDimension(shadow.offsetX)},${parseDimension(shadow.offsetY)}"/>`);
    if (!shadow.inset) {
      xamlOutput.push(`  <!-- Frame for drop shadow (Key: ${key}) should have a Margin="${margin},${margin},${margin},${margin}" relative to the main component. -->`);
    }
  });

  return xamlOutput.join("\n") + "\n";
}

function groupTokensByType(tokens) {
  return tokens.reduce((acc, token) => {
    const type = token.$type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(token);
    return acc;
  }, {});
}

function convertFontWeightToFontFamily(fontFamily, weight) {
  const validFontWeights = ["Thin", "ExtraLight", "Light", "Regular", "Medium", "SemiBold", "Bold", "ExtraBold", "Black"];
  let weightName = '';

  if (typeof weight === 'string') {
      let normalizedWeight = weight.replace(/\s/g, '').charAt(0).toUpperCase() + weight.replace(/\s/g, '').slice(1).toLowerCase();
      if (validFontWeights.includes(normalizedWeight)) {
          weightName = normalizedWeight;
      } else {
          console.log(`Unsupported fontWeight '${weight}', defaulting to 'Regular'.`);
          weightName = "Regular";
      }
  } else {
      switch (weight) {
          case 100: weightName = "Thin"; break;
          case 200: weightName = "ExtraLight"; break;
          case 300: weightName = "Light"; break;
          case 400: weightName = "Regular"; break;
          case 500: weightName = "Medium"; break;
          case 600: weightName = "SemiBold"; break;
          case 700: weightName = "Bold"; break;
          case 800: weightName = "ExtraBold"; break;
          case 900: weightName = "Black"; break;
          default:
              console.log(`Unexpected fontWeight value '${weight}', defaulting to 'Regular'.`);
              weightName = "Regular";
      }
  }

  return `${fontFamily}${weightName}`;
}

function convertTypographyToXAML(token, value) {
  const fontSizePx = parseFloat(value.fontSize.replace('px', ''));

  return `
<Style x:Key="${token.id}" TargetType="Label">
<Setter Property="FontFamily" Value="${convertFontWeightToFontFamily(value.fontFamily, value.fontWeight)}" />
<Setter Property="FontSize" Value="${parseDimension(value.fontSize)}" />
<Setter Property="LineHeight" Value="${(parseFloat(value.lineHeight.replace('px', '')) / 16).toFixed(3)}" />
<Setter Property="CharacterSpacing" Value="${parseLetterSpacing(value.letterSpacing, fontSizePx)}" />
<Setter Property="TextDecorations" Value="${value.textDecoration === 'NONE' ? 'None' : convertTextDecoration(value.textDecoration)}" />
<Setter Property="TextTransform" Value="${convertTextCase(value.textCase)}" />
</Style>\n`;
}

function convertColorFormat(value) {
  // Check if the color is in #rrggbbaa format
  if (/^#[0-9A-Fa-f]{8}$/.test(value)) {
    // Rearrange the color format to #aarrggbb
    return `#${value.slice(7, 9)}${value.slice(1, 7)}`;
  }
  return value;
}

function parseDimension(value) {
  if (typeof value !== 'string' || !value.endsWith('px')) {
      console.error(`Invalid dimension value: ${value}. Expected a string ending with 'px'.`);
      return '16'; // Default to '16' if input is not as expected
  }
  return value.replace('px', '');
}

function parseLetterSpacing(letterSpacing, fontSize) {
  if (typeof letterSpacing === 'string') {
      if (letterSpacing.endsWith('%')) {
          const percentage = parseFloat(letterSpacing) / 100;
          const letterSpacingEm = (percentage * fontSize);
          return Math.round(letterSpacingEm / fontSize * 1000);
      } else if (letterSpacing.endsWith('px')) {
          const letterSpacingPx = parseFloat(letterSpacing);
          return Math.round(letterSpacingPx / fontSize * 1000);
      }
  }
  console.error(`Invalid letterSpacing value: ${letterSpacing}. Expected a string with 'px' or '%'.`);
  return 0;
}

function convertTextCase(textCase) {
  switch(textCase.toUpperCase()) {
      case 'UPPERCASE': return 'Upper';
      case 'LOWERCASE': return 'Lower';
      case 'CAPITALIZE': return 'Capitalize';
      default:
          console.log(`Unexpected text case value '${textCase}', defaulting to 'None'.`);
          return 'None';
  }
}

function convertTextDecoration(textDecoration) {
  switch(textDecoration.toUpperCase()) {
      case 'UNDERLINE': return 'Underline';
      case 'LINE-THROUGH': return 'Strikethrough';
      case 'OVERLINE': return 'Overline';
      default:
          console.log(`Unexpected text decoration value '${textDecoration}', defaulting to 'None'.`);
          return 'None';
  }
}
