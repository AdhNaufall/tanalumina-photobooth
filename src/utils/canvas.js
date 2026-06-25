import { useState, useEffect } from 'react';
import { frames } from '../data/templates';

export function getStripLayoutStyles(template) {
  if (template.layout === 'grid2x2') {
    return { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' };
  }

  if (template.layout === 'featured') {
    return { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' };
  }

  return { gridTemplateColumns: '1fr' };
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function captureVideoFrame(video, mirror = false) {
  const canvas = document.createElement('canvas');
  canvas.width = video?.videoWidth || 1280;
  canvas.height = video?.videoHeight || 1280;

  const context = canvas.getContext('2d');
  if (!context || !video) {
    return '';
  }

  if (mirror) {
    context.save();
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    context.restore();
  } else {
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
  }

  return canvas.toDataURL('image/jpeg', 0.95);
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src.slice(0, 80)}`));
    image.src = src;
  });
}

export async function loadFirstAvailableImage(sources) {
  let lastError = null;
  for (const source of sources) {
    if (!source) continue;
    try {
      return await loadImage(source);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error('No image sources available');
}

export function useResolvedImageSrc(sources) {
  const [resolvedSrc, setResolvedSrc] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        for (const source of sources) {
          if (!source) continue;

          await loadImage(source);
          if (!cancelled) setResolvedSrc(source);
          return;
        }
      } catch (error) {
        console.warn('Unable to resolve frame image source.', error);
      }

      if (!cancelled) setResolvedSrc(sources[sources.length - 1] ?? null);
    })();

    return () => { cancelled = true; };
  }, [sources]);

  return resolvedSrc;
}

export function getCanvasFilterString(filterType) {
  switch (filterType) {
    case 'bw': return 'grayscale(100%) contrast(1.1)';
    case 'sepia': return 'sepia(100%)';
    case 'vintage': return 'sepia(50%) contrast(1.1) brightness(0.9) saturate(1.5)';
    case 'polaroid': return 'contrast(1.2) saturate(1.2) brightness(1.1) sepia(20%) hue-rotate(-10deg)';
    case 'high-contrast': return 'contrast(1.5) saturate(1.2)';
    case 'soft': return 'brightness(1.1) saturate(0.8) contrast(0.9)';
    case 'warm': return 'sepia(20%) contrast(1.1) brightness(0.95) saturate(1.2)';
    case 'cool': return 'brightness(1.05) contrast(1.05) hue-rotate(-5deg) saturate(0.9)';
    case 'vivid': return 'saturate(1.8) contrast(1.1) brightness(1.05)';
    case 'moody': return 'brightness(0.8) contrast(1.2) saturate(0.7)';
    case 'vintage-warm': return 'sepia(40%) contrast(1.1) brightness(0.9) saturate(1.4) hue-rotate(5deg)';
    default: return 'none';
  }
}

export function roundRectPath(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

export function drawCoverImage(context, image, x, y, width, height, bias = 1, filterString = 'none') {
  const scale = Math.max(width / image.width, height / image.height) * bias;
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const offsetX = x + (width - drawWidth) / 2;
  const offsetY = y + (height - drawHeight) / 2;

  context.save();
  context.filter = filterString;
  roundRectPath(context, x, y, width, height, 28);
  context.clip();
  context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
  context.restore();
}

export function drawCoverImageRect(context, image, x, y, width, height, bias = 1, filterString = 'none') {
  const scale = Math.max(width / image.width, height / image.height) * bias;
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const offsetX = x + (width - drawWidth) / 2;
  const offsetY = y + (height - drawHeight) / 2;

  context.save();
  context.filter = filterString;
  context.beginPath();
  context.rect(x, y, width, height);
  context.clip();
  context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
  context.restore();
}

const holeCache = {};

export function analyzeFrameHoles(image) {
  if (holeCache[image.src]) return holeCache[image.src];

  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const width = canvas.width;
  const height = canvas.height;

  const yHasHole = new Array(height).fill(false);
  const xBoundsPerY = new Array(height);

  // Scan rows
  for (let y = 0; y < height; y++) {
    let minX = width, maxX = -1;
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha < 50) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        yHasHole[y] = true;
      }
    }
    if (yHasHole[y]) {
      xBoundsPerY[y] = { minX, maxX };
    }
  }

  const rowRects = [];
  let inHole = false;
  let currentRect = null;

  for (let y = 0; y < height; y++) {
    if (yHasHole[y]) {
      const { minX, maxX } = xBoundsPerY[y];
      if (maxX - minX < 50) continue; // Ignore tiny artifacts

      if (!inHole) {
        inHole = true;
        currentRect = { y, minX, maxX, height: 1 };
      } else {
        currentRect.height++;
        if (minX < currentRect.minX) currentRect.minX = minX;
        if (maxX > currentRect.maxX) currentRect.maxX = maxX;
      }
    } else {
      if (inHole) {
        inHole = false;
        if (currentRect.height > 50) {
          rowRects.push(currentRect);
        }
      }
    }
  }
  if (inHole && currentRect.height > 50) rowRects.push(currentRect);

  const finalRects = [];
  for (const rect of rowRects) {
    let inHoleX = false;
    let currentX = null;
    
    // Scan columns within this row bounding box
    for (let x = rect.minX; x <= rect.maxX; x++) {
      let transparentCount = 0;
      for (let y = rect.y; y < rect.y + rect.height; y++) {
        if (data[(y * width + x) * 4 + 3] < 50) transparentCount++;
      }
      
      const isTransparentColumn = transparentCount > rect.height * 0.1;
      
      if (isTransparentColumn) {
        if (!inHoleX) {
          inHoleX = true;
          currentX = { x, width: 1 };
        } else {
          currentX.width++;
        }
      } else {
        if (inHoleX) {
          inHoleX = false;
          if (currentX.width > 50) {
            finalRects.push({ x: currentX.x, y: rect.y, width: currentX.width, height: rect.height });
          }
        }
      }
    }
    if (inHoleX && currentX.width > 50) {
      finalRects.push({ x: currentX.x, y: rect.y, width: currentX.width, height: rect.height });
    }
  }

  holeCache[image.src] = finalRects;
  return finalRects;
}

export async function renderStripToCanvas(template, images, customColor, selectedFrameId, canvasElement = null, photoFilter = 'normal') {
  const canvas = canvasElement || document.createElement('canvas');
  const filterString = getCanvasFilterString(photoFilter);
  const context = canvas.getContext('2d');
  if (!context) return canvas;

  if (selectedFrameId !== 'color') {
    const frameObj = frames.find((f) => f.id === selectedFrameId);
    if (!frameObj) return canvas;

    let frameImage;
    try {
      frameImage = await loadImage(frameObj.src);
    } catch (error) {
      console.error('Failed to load frame image:', error);
      return canvas;
    }

    // Auto-detect holes in the frame
    const holes = analyzeFrameHoles(frameImage);

    canvas.width = frameImage.width;
    canvas.height = frameImage.height;

    context.fillStyle = customColor || frameObj.defaultColor || '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Draw user photos into the detected holes
    if (holes.length > 0) {
      // Sort holes top-to-bottom, then left-to-right
      holes.sort((a, b) => {
        if (Math.abs(a.y - b.y) > 50) return a.y - b.y;
        return a.x - b.x;
      });

      for (let index = 0; index < holes.length; index++) {
        const hole = holes[index];
        const source = images[index];
        
        if (!source) {
          context.fillStyle = 'rgba(255, 255, 255, 0.2)';
          context.fillRect(hole.x, hole.y, hole.width, hole.height);
          continue;
        }
        
        try {
          const image = await loadImage(source);
          // Expand the drawing area slightly (2px) to prevent sub-pixel gaps between photo and frame
          drawCoverImageRect(
            context, 
            image, 
            hole.x - 2, 
            hole.y - 2, 
            hole.width + 4, 
            hole.height + 4, 
            1, 
            filterString
          );
        } catch (error) {
          console.error('Failed to draw photo:', error);
        }
      }
    } else {
       // Fallback to original hardcoded values if no holes found
       console.warn('No transparent holes found, falling back to default layout');
       for (let index = 0; index < 3; index++) {
         if (!images[index]) continue;
         try {
           const image = await loadImage(images[index]);
           drawCoverImageRect(context, image, 120, index * 720 + 120, 1080, 720, 1, filterString);
         } catch (e) {}
       }
    }

    // Draw the frame overlay on top
    context.drawImage(frameImage, 0, 0, canvas.width, canvas.height);

    return canvas;
  }

  const isPlainColorFrame = selectedFrameId === 'color' && !template.id;

  const finalBgColor = isPlainColorFrame ? customColor : (template.bgColor ?? '#ffffff');
  const finalCardColor = isPlainColorFrame ? '#ffffff' : (template.cardColor ?? '#dbf4fb');
  const finalAccentColor = isPlainColorFrame ? '#333333' : (template.accentColor ?? '#1f9eb9');
  const finalName = isPlainColorFrame ? 'CUSTOM STRIP' : template.name;

  const stripWidth = 1080;
  const padding = 42;
  const gap = 24;
  const headerHeight = 96;
  const footerHeight = 76;

  const count = Math.max(3, images.length);
  const layout = template.layout ?? 'stack';
  const heights = [];
  
  if (layout === 'featured') {
    heights.push(520, 200, 200);
  } else if (layout === 'grid2x2') {
    heights.push(300, 300, 300, 300);
  } else if (layout === 'filmroll') {
    for (let i = 0; i < count; i++) heights.push(150);
  } else {
    for (let i = 0; i < count; i++) heights.push(664);
  }

  canvas.width = stripWidth;
  canvas.height = padding * 2 + headerHeight + footerHeight + heights.reduce((sum, value) => sum + value, 0) + gap * Math.max(0, count - 1);

  context.fillStyle = finalBgColor;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = finalAccentColor;
  context.font = 'bold 28px Georgia, serif';
  context.textAlign = 'center';
  context.fillText('TANALUMINA', canvas.width / 2, padding + 28);
  context.font = '16px Trebuchet MS, sans-serif';
  context.fillStyle = finalAccentColor;
  context.fillText(finalName.toUpperCase(), canvas.width / 2, padding + 58);

  let currentY = padding + headerHeight;

  for (let index = 0; index < count; index += 1) {
    const slotHeight = heights[index] ?? 220;
    const slotWidth = canvas.width - padding * 2;

    context.fillStyle = finalCardColor;
    roundRectPath(context, padding, currentY, slotWidth, slotHeight, 28);
    context.fill();

    const source = images[index];
    if (source) {
      try {
        const image = await loadImage(source);
        drawCoverImage(context, image, padding, currentY, slotWidth, slotHeight, layout === 'featured' && index === 0 ? 1.45 : 1, filterString);
      } catch (error) {
        console.error('Failed to draw slot image:', error);
      }
    }
    currentY += slotHeight + gap;
  }

  context.fillStyle = finalAccentColor;
  context.font = '14px Trebuchet MS, sans-serif';
  context.textAlign = 'left';
  context.fillText(formatDate(new Date()), padding, canvas.height - padding + 4);
  context.textAlign = 'right';
  context.fillText('TANALUMINA Photo Booth', canvas.width - padding, canvas.height - padding + 4);

  return canvas;
}

export function downloadCanvas(canvas, filename) {
  canvas.toBlob((blob) => {
    if (!blob) {
      console.error('downloadCanvas: toBlob returned null — canvas may be tainted or empty.');
      return;
    }
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      anchor.remove();
    }, 1500);
  }, 'image/png');
}
