import React, { useEffect, useRef, useState } from 'react';
import { renderStripToCanvas, analyzeFrameHoles, loadImage } from '../utils/canvas';
import { frames } from '../data/templates';

export default function StripCanvasPreview({ images, template, customColor, selectedFrameId, photoFilter = 'normal', onSlotClick }) {
  const canvasRef = useRef(null);
  const [clickAreas, setClickAreas] = useState(null);

  useEffect(() => {
    let active = true;
    const canvas = canvasRef.current;
    if (!canvas) return;

    (async () => {
      await renderStripToCanvas(template, images, customColor, selectedFrameId, canvas, photoFilter);
      
      if (!active) return;

      if (onSlotClick && selectedFrameId && selectedFrameId !== 'color') {
        const frameObj = frames.find(f => f.id === selectedFrameId);
        if (frameObj) {
          try {
            const frameImage = await loadImage(frameObj.src);
            const holes = analyzeFrameHoles(frameImage);
            if (holes && holes.length > 0) {
              const sortedHoles = [...holes].sort((a, b) => {
                if (Math.abs(a.y - b.y) > 50) return a.y - b.y;
                return a.x - b.x;
              });
              
              const areas = sortedHoles.map(hole => ({
                left: `${(hole.x / frameImage.width) * 100}%`,
                top: `${(hole.y / frameImage.height) * 100}%`,
                width: `${(hole.width / frameImage.width) * 100}%`,
                height: `${(hole.height / frameImage.height) * 100}%`,
              }));
              
              setClickAreas(areas);
            } else {
              setClickAreas(null);
            }
          } catch (err) {
            setClickAreas(null);
          }
        } else {
          setClickAreas(null);
        }
      } else {
        setClickAreas(null);
      }
    })();

    return () => {
      active = false;
    };
  }, [images, template, customColor, selectedFrameId, photoFilter, onSlotClick]);

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '320px', margin: '0 auto' }}>
      <canvas
        ref={canvasRef}
        className="strip-canvas-element"
        style={{
          width: '100%',
          height: 'auto',
          borderRadius: '12px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
          background: '#fff',
          display: 'block'
        }}
      />
      {onSlotClick && clickAreas ? (
        <div style={{ position: 'absolute', inset: 0 }}>
          {clickAreas.map((area, i) => (
             <div 
               key={`click-area-${i}`}
               onClick={() => onSlotClick(i)}
               style={{
                 position: 'absolute',
                 left: area.left,
                 top: area.top,
                 width: area.width,
                 height: area.height,
                 cursor: 'pointer'
               }}
               title={`Klik untuk retake foto ${i + 1}`}
             />
          ))}
        </div>
      ) : onSlotClick ? (
        <div style={{ 
          position: 'absolute', inset: 0, display: 'grid', 
          gridTemplateColumns: template.layout === 'grid2x2' || template.layout === 'featured' ? '1fr 1fr' : '1fr',
          gridTemplateRows: template.layout === 'grid2x2' ? '1fr 1fr' : template.layout === 'featured' ? '1fr 1fr' : `repeat(${template.count || 3}, 1fr)`
        }}>
          {Array.from({ length: template.count || 3 }).map((_, i) => (
            <div 
              key={`click-grid-${i}`} 
              onClick={() => onSlotClick(i)} 
              style={{ 
                cursor: 'pointer',
                gridColumn: template.layout === 'featured' && i === 0 ? '1 / -1' : undefined
              }}
              title={`Klik untuk retake foto ${i + 1}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
