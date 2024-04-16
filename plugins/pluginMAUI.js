export default function pluginMAUI(options = {}) {
  return {
    name: "pluginMAUI",

    async build({ tokens, rawSchema }) {
      let xamlContent = `<ResourceDictionary xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
                        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">\n`;

      // Group tokens by type to separate them in the output with comments
      const groupedTokens = groupTokensByType(tokens);

      // Iterate over grouped tokens and append them with type comments and separations
      for (const [type, tokensOfType] of Object.entries(groupedTokens)) {
        xamlContent += `\n  <!-- ${type.toUpperCase()} Tokens -->\n`;
        xamlContent += tokensOfType.map(token => convertTokenToMAUI(token)).join("\n") + "\n";
      }

      xamlContent += "</ResourceDictionary>";

      return [
        {
          filename: options.filename || "default.xaml",
          contents: xamlContent,
        }
      ];
    }
  };
}

// Helper function to group tokens by their type
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

// Helper function to convert a token to XAML format for MAUI
function convertTokenToMAUI(token) {
  let xaml = '';

  switch (token.$type) {
    case 'color':
      xaml = `  <Color x:Key="${token.id}">${token.$value}</Color>`;
      break;
    case 'dimension':
      xaml = `  <sys:Double x:Key="${token.id}">${token.$value}</sys:Double>`;
      break;
    case 'shadow':
      xaml += convertShadowToMAUI(token);
      break;
    // Add more cases as necessary for other token types
  }

  return xaml;
}

/**
 * Converts shadow effects for MAUI.
 * Generates shadow entries with or without indices based on count.
 * Single shadow does not use index; multiple shadows are indexed.
 */
function convertShadowToMAUI(token) {
  const shadowCount = token.$value.length;
  return token.$value.map((shadow, index) => {
    const key = shadowCount > 1 ? `${token.id}-${index + 1}` : token.id;
    return `  <Shadow x:Key="${key}" Color="${shadow.color}" Radius="${parseDimension(shadow.blur)}" Opacity="1" OffsetX="${parseDimension(shadow.offsetX)}" OffsetY="${parseDimension(shadow.offsetY)}"/>`;
  }).join("\n  ");
}

// Helper function to parse dimensions and remove 'px' if present
function parseDimension(value) {
  return value.replace('px', '');
}
