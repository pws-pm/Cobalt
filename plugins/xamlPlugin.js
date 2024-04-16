export default function xamlPlugin(options = { defaultFilename: 'default.xaml' }) {
  return {
    name: 'xaml-converter',
    build({ tokens }) {
      console.log("Starting build process...");
      const outputs = generateOutputs(tokens, options.defaultFilename);
      return outputs;
    }
  };
}

function generateOutputs(tokens, defaultFilename) {
  const xamlContents = convertTokensToXAML(tokens);
  return [
    {
      filename: defaultFilename,
      contents: xamlContents
    }
  ];
}

function convertTokensToXAML(tokens) {
  let xaml = `<ResourceDictionary xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation">\\n`;

  const processToken = (path, token) => {
    const tokenKey = path.replace(/\./g, '-'); // Replace dots with hyphens
    console.log(`Converting token ${path} to XAML key: ${tokenKey}`);
  
    if (token.$type === 'color') {
      xaml += ` <SolidColorBrush x:Key="${tokenKey}" Color="${token.$value}" />\\n`;
    } else if (token.$type === 'dimension') {
      xaml += ` <Double x:Key="${tokenKey}">${parseFloat(token.$value).toFixed(2)}px</Double>\\n`;
    } else if (token.$type === 'typography') {
      const typographyProps = Object.entries(token.$value)
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ');
      xaml += ` <Style x:Key="${tokenKey}" TargetType="TextBlock">\\n`;
      xaml += `  <Setter Property="FontFamily" Value="${token.$value.fontFamily}" />\\n`;
      xaml += `  <Setter Property="FontWeight" Value="${token.$value.fontWeight}" />\\n`;
      xaml += `  <Setter Property="FontSize" Value="${token.$value.fontSize}" />\\n`;
      xaml += `  <Setter Property="LineHeight" Value="${token.$value.lineHeight}" />\\n`;
      xaml += `  <Setter Property="TextDecorations" Value="${token.$value.textDecoration}" />\\n`;
      xaml += ` </Style>\\n`;
    } else if (token.$type === 'shadow') {
      xaml += ` <DropShadowEffect x:Key="${tokenKey}" \\n`;
      token.$value.forEach((shadow, index) => {
        xaml += `  ShadowDepth="${index}" \\n`;
        xaml += `  Color="${shadow.color}" \\n`;
        xaml += `  OpacityMask="${shadow.color.slice(1)}" \\n`;
        xaml += `  BlurRadius="${parseFloat(shadow.blur)}" \\n`;
        xaml += `  Direction="${Math.atan2(shadow.offsetY, shadow.offsetX) * (180 / Math.PI)}" \\n`;
        xaml += `  ShadowDepthMaskSource="System" \\n`;
      });
      xaml += ` />\\n`;
    }
  };

  const processObject = (obj, path = '') => {
    Object.entries(obj).forEach(([key, value]) => {
      const currentPath = path ? `${path}.${key}` : key;
      if (value && typeof value === 'object' && value.$type) {
        processToken(currentPath, value);
      } else if (typeof value === 'object') {
        processObject(value, currentPath);
      }
    });
  };

  processObject(tokens);

  xaml += '</ResourceDictionary>';
  return xaml;
}