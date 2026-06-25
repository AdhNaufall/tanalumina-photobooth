import React from 'react';
import { getStripLayoutStyles, formatDate } from '../utils/canvas';
import { frames } from '../data/templates';

export default function StripPreview({ template, images, onSlotClick, compact = false, photoFilter = 'normal', selectedFrameId = 'color', customColor = '' }) {
  const layoutStyles = getStripLayoutStyles(template);

  const isPlainColorFrame = selectedFrameId === 'color';
  const finalBgColor = isPlainColorFrame ? customColor || template.bgColor : customColor || '#ffffff';
  
  const frameObj = !isPlainColorFrame ? frames.find(f => f.id === selectedFrameId) : null;

  return (
    <div className={`strip-template ${compact ? 'strip-template-compact' : ''}`} style={{ background: finalBgColor, position: 'relative' }}>
      {!compact ? (
        <div className="strip-meta">
          <span style={{ color: template.accentColor }}>{formatDate(new Date())}</span>
          <strong style={{ color: template.accentColor }}>TANALUMINA</strong>
        </div>
      ) : null}
      <div className={`strip-grid ${template.theme === 'starlane' ? 'strip-grid-starlane' : ''}`} style={layoutStyles}>
        {Array.from({ length: template.count }).map((_, index) => {
          const image = images[index] ?? null;
          return (
            <div
              key={`${template.id}-preview-${index}`}
              role={onSlotClick ? 'button' : undefined}
              tabIndex={onSlotClick ? 0 : undefined}
              onClick={onSlotClick ? () => onSlotClick(index) : undefined}
              className={`strip-slot ${template.theme === 'starlane' ? 'strip-slot-starlane' : ''} ${onSlotClick ? 'clickable' : ''}`}
              style={{
                background: template.cardColor,
                gridColumn: template.layout === 'featured' && index === 0 ? '1 / -1' : undefined,
                minHeight:
                  template.layout === 'featured' && index === 0
                    ? '220px'
                    : template.layout === 'filmroll'
                      ? '60px'
                      : template.layout === 'grid2x2'
                        ? '132px'
                        : '240px',
              }}
            >
              {image ? <img src={image} className={`filter-${photoFilter}`} alt={`Foto ${index + 1}`} /> : null}
              {onSlotClick ? <div className="retake-hint">{image ? 'Retake' : 'Ambil'}</div> : null}
            </div>
          );
        })}
      </div>
      {!compact ? (
        <div className="strip-info">
          <small style={{ color: template.accentColor }}>{template.name}</small>
          <small style={{ color: template.accentColor }}>TANALUMINA Photo Booth</small>
        </div>
      ) : null}
      
      {frameObj && (
        <img 
          src={frameObj.src} 
          alt="Frame Overlay" 
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill', pointerEvents: 'none', zIndex: 10 }} 
        />
      )}
    </div>
  );
}
