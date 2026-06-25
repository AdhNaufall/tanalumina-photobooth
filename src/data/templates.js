export const templates = [
  {
    id: 'classic-cream',
    name: 'Classic Cream',
    count: 3,
    layout: 'stack',
    theme: 'classic',
    bgColor: '#fdf8ef',
    cardColor: '#f6ebd9',
    accentColor: '#7a5b36',
  },
  {
    id: 'mint-pastel',
    name: 'Mint Pastel',
    count: 3,
    layout: 'stack',
    theme: 'mint',
    bgColor: '#edfdf8',
    cardColor: '#d9f6eb',
    accentColor: '#2f7561',
  },
  {
    id: 'mono-film',
    name: 'Mono Film',
    count: 3,
    layout: 'stack',
    theme: 'mono',
    bgColor: '#121212',
    cardColor: '#2a2a2a',
    accentColor: '#f2f2f2',
  },
];

const frameModules = import.meta.glob('/public/assets/frames/*.png', { eager: true });

export const frames = [
  { id: 'color', name: 'Default Frame', src: '', defaultColor: '#ffffff' },
];

const predefinedColors = {
  'frame1': '#169d53',
  'frame2': '#e5e6d9',
  'frame3': '#272323',
};

// Loop through all found frame images and add them to the array
for (const path in frameModules) {
  const filename = path.split('/').pop(); // e.g. "frame4.png"
  const id = filename.replace('.png', ''); // e.g. "frame4"
  
  // Create a readable name, e.g. "frame1" -> "Frame 1"
  let name = id.charAt(0).toUpperCase() + id.slice(1);
  if (name.toLowerCase().startsWith('frame')) {
    name = name.replace(/frame/i, 'Frame ');
  }

  frames.push({
    id,
    name: name.trim(),
    src: path.replace('/public', ''), // Remove /public for the actual browser URL
    defaultColor: predefinedColors[id] || '#ffffff'
  });
}

export const initialTemplateId = 'classic-cream';
