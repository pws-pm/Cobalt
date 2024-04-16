export default function pluginMAUI(options = {}) {
  return {
    name: "pluginMAUI",

    async build({ tokens, rawSchema }) {
      let xamlContent = `<ResourceDictionary xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
                        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">\n`;

      // Convert tokens to XAML content and filter out empty results
      xamlContent += tokens.map(token => convertTokenToMAUI(token)).filter(line => line.trim().length > 0).join("\n");

      xamlContent += "\n</ResourceDictionary>";

      return [
        {
          filename: options.filename || "default.xaml",
          contents: xamlContent,
        }
      ];
    }
  };
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
      // Comment explaining the shadow token structure
      xaml = `  <!-- Shadow for ${token.id} -->\n  `;
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
