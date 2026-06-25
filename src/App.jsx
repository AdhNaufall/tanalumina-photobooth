import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { templates, frames, initialTemplateId } from './data/templates';
import { renderStripToCanvas, downloadCanvas, captureVideoFrame, delay } from './utils/canvas';
import StripPreview from './components/StripPreview';
import StripCanvasPreview from './components/StripCanvasPreview';
import { formatDate } from './utils/canvas';

function App() {
  const [step, setStep] = useState(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplateId);
  const [selectedFrameId, setSelectedFrameId] = useState('color');
  const [customColor, setCustomColor] = useState('#ffffff');
  const [photoFilter, setPhotoFilter] = useState('normal');
  const [delayTime, setDelayTime] = useState(3000);
  const [method, setMethod] = useState(null);
  const [cameraAvailable, setCameraAvailable] = useState(true);
  const [cameraShots, setCameraShots] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [currentCaptureIndex, setCurrentCaptureIndex] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [flashActive, setFlashActive] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [cameraSessionId, setCameraSessionId] = useState(0);
  const uploadingSlotIndexRef = useRef(null);

  const videoRef = useRef(null);
  const cameraFallbackInputRef = useRef(null);
  const uploadInputRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const captureLockRef = useRef(false);

  const currentTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? templates[0],
    [selectedTemplateId],
  );

  const activeImages = method === 'camera' ? cameraShots : uploadedImages;

  const isSessionComplete = useMemo(() => {
    if (method === 'camera') {
      return cameraShots.length === 3 && cameraShots.every((img) => img !== null && img !== undefined);
    }
    if (method === 'upload') {
      return uploadedImages.length === 3 && uploadedImages.every((img) => img !== null && img !== undefined);
    }
    return false;
  }, [method, cameraShots, uploadedImages]);

  const stopCameraStream = useCallback(() => {
    if (cameraStreamRef.current) {
      for (const track of cameraStreamRef.current.getTracks()) {
        track.stop();
      }
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    stopCameraStream();

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraAvailable(false);
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });

      cameraStreamRef.current = stream;
      setCameraAvailable(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => { });
      }

      return true;
    } catch (error) {
      console.warn('Camera access failed, falling back to file picker.', error);
      setCameraAvailable(false);
      return false;
    }
  }, [stopCameraStream]);

  useEffect(() => () => stopCameraStream(), [stopCameraStream]);

  useEffect(() => {
    if (step !== 3 || method !== 'camera' || cameraSessionId === 0) {
      return undefined;
    }

    let cancelled = false;

    (async () => {
      await startCamera();
      if (!cancelled) {
        setCurrentCaptureIndex(0);
      }
    })();

    return () => {
      cancelled = true;
      stopCameraStream();
    };
  }, [cameraSessionId, method, startCamera, step, stopCameraStream]);

  function updateCameraIndex(index) {
    setCurrentCaptureIndex(index);
  }

  function resetTemplateDependentState(nextTemplateId = selectedTemplateId) {
    const nextTemplate = templates.find((template) => template.id === nextTemplateId) ?? templates[0];
    setSelectedTemplateId(nextTemplate.id);
    setCameraShots([]);
    setUploadedImages([]);
    setCurrentCaptureIndex(0);
    setMethod(null);
    setCameraAvailable(true);
    setStepState(1);
  }

  function handleStartSession() {
    setCameraShots([]);
    setUploadedImages(method === 'upload' ? [null, null, null] : []);
    setCurrentCaptureIndex(0);
    if (method === 'camera') {
      setCameraSessionId((value) => value + 1);
    }
    setStepState(3);
  }

  function handleCameraMode() {
    setMethod('camera');
    setStepState(2);
  }

  function handleUploadMode() {
    setMethod('upload');
    setStepState(2);
  }

  const isMockEnabled = useMemo(() => new URLSearchParams(window.location.search).get('mock') === 'true', []);

  async function handleLoadMockCamera() {
    const mockPhotos = [
      '/test-assets/photo-1.svg',
      '/test-assets/photo-2.svg',
      '/test-assets/photo-3.svg'
    ];
    const loaded = [];
    for (const path of mockPhotos) {
      try {
        const response = await fetch(path);
        const blob = await response.blob();
        const dataUrl = await fileToDataUrl(blob);
        loaded.push(dataUrl);
      } catch (e) {
        console.error('Failed to load mock photo:', e);
      }
    }
    if (loaded.length === 3) {
      setCameraShots(loaded);
      setCurrentCaptureIndex(3);
    }
  }

  async function handleLoadMockPhotos() {
    const mockPhotos = [
      '/test-assets/photo-1.svg',
      '/test-assets/photo-2.svg',
      '/test-assets/photo-3.svg'
    ];
    const loaded = [];
    for (const path of mockPhotos) {
      try {
        const response = await fetch(path);
        const blob = await response.blob();
        const dataUrl = await fileToDataUrl(blob);
        loaded.push(dataUrl);
      } catch (e) {
        console.error('Failed to load mock photo:', e);
      }
    }
    if (loaded.length === 3) {
      setUploadedImages(loaded);
    }
  }

  async function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async function handleUploadFiles(fileList) {
    const files = Array.from(fileList)
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, 3);

    const images = [];
    for (const file of files) {
      images.push(await fileToDataUrl(file));
    }

    setUploadedImages((prev) => {
      const next = [
        prev[0] || null,
        prev[1] || null,
        prev[2] || null
      ];
      let imgIdx = 0;
      for (let i = 0; i < 3; i++) {
        if (!next[i] && imgIdx < images.length) {
          next[i] = images[imgIdx];
          imgIdx++;
        }
      }
      return next;
    });
  }

  function handleSlotClick(index) {
    uploadingSlotIndexRef.current = index;
    uploadInputRef.current?.click();
  }

  function handleRemoveUploadSlot(index) {
    setUploadedImages((prev) => {
      const next = [
        prev[0] || null,
        prev[1] || null,
        prev[2] || null
      ];
      next[index] = null;
      return next;
    });
  }

  async function handleCameraFallbackFiles(fileList) {
    const files = Array.from(fileList).filter((file) => file.type.startsWith('image/'));
    for (const file of files) {
      const nextImage = await fileToDataUrl(file);
      setCameraShots((prev) => {
        const targetIndex = prev.findIndex((img) => img === null);
        if (targetIndex === -1) {
          if (prev.length < 3) {
            return [...prev, nextImage];
          }
          return prev;
        }
        const nextShots = [...prev];
        nextShots[targetIndex] = nextImage;
        return nextShots;
      });
      setCurrentCaptureIndex((prev) => Math.min(prev + 1, 3));
    }
  }

  async function runCountdown(seconds = 3) {
    for (let value = seconds; value >= 1; value -= 1) {
      setCountdown(value);
      await delay(1000);
    }
    setCountdown("SMILE!");
    setFlashActive(true);
    window.setTimeout(() => setFlashActive(false), 150);
    await delay(600);
    setCountdown(null);
  }

  async function takeCameraShot() {
    if (captureLockRef.current) {
      return;
    }

    // Ensure camera is started
    if (!cameraStreamRef.current) {
      const started = await startCamera();
      if (!started) return;
    }

    captureLockRef.current = true;
    setIsCapturing(true);

    try {
      const targetIndex = Math.min(Math.max(0, currentCaptureIndex), 2);
      setCurrentCaptureIndex(targetIndex);

      await runCountdown(delayTime / 1000);

      const frame = captureVideoFrame(videoRef.current, true);
      const nextShots = [...cameraShots];
      nextShots[targetIndex] = frame;
      const trimmed = nextShots.slice(0, 3);
      setCameraShots(trimmed);

      // Advance index
      const nextIndex = Math.min(targetIndex + 1, 3);
      setCurrentCaptureIndex(nextIndex);
    } finally {
      captureLockRef.current = false;
      setIsCapturing(false);
    }
  }

  async function handleAutoCameraSession() {
    if (captureLockRef.current) {
      return;
    }

    // Ensure camera is started
    if (!cameraStreamRef.current) {
      const started = await startCamera();
      if (!started) return;
    }

    captureLockRef.current = true;
    setIsCapturing(true);

    try {
      const shots = [];
      setCameraShots([]);
      setCurrentCaptureIndex(0);

      for (let index = 0; index < 3; index += 1) {
        setCurrentCaptureIndex(index);
        await runCountdown(delayTime / 1000);

        const frame = captureVideoFrame(videoRef.current, true);
        shots.push(frame);
        setCameraShots([...shots]);
      }
      setCurrentCaptureIndex(3);
    } finally {
      captureLockRef.current = false;
      setIsCapturing(false);
    }
  }

  async function handleRetakeAtSlot(index) {
    if (captureLockRef.current) {
      return;
    }

    // Ensure camera is started
    if (!cameraStreamRef.current) {
      const started = await startCamera();
      if (!started) return;
    }

    captureLockRef.current = true;
    setIsCapturing(true);

    try {
      setCurrentCaptureIndex(index);
      await runCountdown(delayTime / 1000);

      const frame = captureVideoFrame(videoRef.current, true);
      setCameraShots((prev) => {
        const next = [...prev];
        next[index] = frame;
        return next;
      });
    } finally {
      captureLockRef.current = false;
      setIsCapturing(false);
    }
  }

  async function handleSnapButton() {
    if (method !== 'camera') {
      return;
    }

    if (!cameraAvailable) {
      cameraFallbackInputRef.current?.click();
      return;
    }

    await takeCameraShot();
  }

  async function handleSaveStrip() {
    const canvas = await renderStripToCanvas(currentTemplate, activeImages, customColor, selectedFrameId, null, photoFilter);
    downloadCanvas(canvas, `tanalumina-${selectedTemplateId}-${Date.now()}.png`);
  }

  function resetAllState() {
    setCameraShots([]);
    setUploadedImages([]);
    setCurrentCaptureIndex(0);
    setMethod(null);
    setSelectedFrameId('color');
    setCustomColor('#ffffff');
    setDelayTime(3000);
    setStepState(1);
  }

  function handleRemake() {
    resetAllState();
  }

  function handleRetakeAt(index) {
    handleRetakeAtSlot(index);
  }

  function handleChooseStrip() {
    if (activeImages.length >= 3) {
      setStepState(4);
    }
  }

  function handleShowResult() {
    if (activeImages.length >= 3) {
      setStepState(5);
    }
  }

  function handleSelectFrame(frameId) {
    setSelectedFrameId(frameId);
    const frameObj = frames.find((f) => f.id === frameId);
    if (frameObj && frameObj.defaultColor) {
      setCustomColor(frameObj.defaultColor);
    }
  }

  function handleSelectTemplate(template) {
    setSelectedTemplateId(template.id);
    setSelectedFrameId('color');
    setCustomColor(template.bgColor || '#ffffff');
  }

  function handleBack() {
    if (step === 5) {
      setStepState(4);
      return;
    }

    if (step === 4) {
      setStepState(3);
      return;
    }

    if (step === 3) {
      setStepState(2);
      return;
    }

    if (step === 2) {
      resetAllState();
    }
  }

  function setStepState(nextStep) {
    setStep(nextStep);
    if (!(nextStep === 3 && method === 'camera')) {
      stopCameraStream();
    }
  }

  function renderTemplatePreview(template) {
    const isFeatured = template.layout === 'featured';
    const isGrid = template.layout === 'grid2x2';
    const isFilm = template.layout === 'filmroll';

    return (
      <div
        className="template-frame"
        data-template={template.id}
        style={{
          background: template.bgColor,
          gridTemplateColumns: isGrid || isFeatured ? 'repeat(2, minmax(0, 1fr))' : '1fr',
          minHeight: isFeatured ? '154px' : '138px',
        }}
      >
        {Array.from({ length: template.count }).map((_, index) => (
          <div
            key={`${template.id}-${index}`}
            className="template-slot"
            style={{
              background: template.cardColor,
              minHeight: isFeatured && index === 0 ? '68px' : isFilm ? '18px' : '28px',
              gridColumn: isFeatured && index === 0 ? '1 / -1' : undefined,
            }}
          />
        ))}
      </div>
    );
  }

  function renderUploadSlots() {
    return Array.from({ length: 3 }).map((_, index) => {
      const img = uploadedImages[index] || null;
      return (
        <div
          key={`upload-slot-${index}`}
          className={`upload-slot ${img ? 'filled' : ''}`}
          onClick={() => handleSlotClick(index)}
        >
          {img ? (
            <>
              <img src={img} alt={`Foto ${index + 1}`} />
              <div
                className="upload-slot-delete-overlay"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveUploadSlot(index);
                }}
              >
                <span className="delete-icon">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </span>
                <span className="delete-text">Hapus</span>
              </div>
            </>
          ) : (
            <span className="upload-slot-plus">+</span>
          )}
        </div>
      );
    });
  }

  function renderProgressDots() {
    return Array.from({ length: currentTemplate.count }).map((_, index) => (
      <span key={`${currentTemplate.id}-dot-${index}`} className={`progress-dot ${index < cameraShots.length ? 'active' : ''}`} />
    ));
  }

  return (
    <div className="app-shell">
      <div className="floating-orb orb-a" />
      <div className="floating-orb orb-b" />
      <div className="floating-orb orb-c" />
      <div className="floating-orb orb-d" />
      <div className="floating-orb orb-e" />
      <div className="floating-orb orb-f" />

      <main className="app-card">
        <section className="brand-row">
          <button className={`ghost-button ${step === 1 ? 'hidden' : ''}`} type="button" onClick={handleBack}>
            ← Kembali
          </button>
          <div className="brand-mark">
            <span className="brand-logo-badge">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
              TANALUMINA
            </span>
          </div>
        </section>

        {/* Step progress bar */}
        <div className="step-progress-bar" aria-hidden="true">
          <div className={`step-progress-segment ${step >= 1 ? 'done' : ''}`} />
          <div className={`step-progress-segment ${step >= 2 ? 'done' : ''}`} />
          <div className={`step-progress-segment ${step >= 3 ? 'done' : ''}`} />
          <div className={`step-progress-segment ${step >= 4 ? 'done' : ''}`} />
          <div className={`step-progress-segment ${step >= 5 ? 'done' : ''}`} />
        </div>

        {step === 1 ? (
          <section className="step-panel active">

            {/* Hero Section */}
            <div className="hero-banner">
              <h1 className="hero-title">Make Your Own PhotoStrip! ✨</h1>
              <p className="hero-subtitle">Capture your moment with Tanalumina </p>
            </div>

            <div className="hero-actions">
              <button className="primary-button hero-primary-btn" type="button" onClick={handleCameraMode}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', marginRight: '8px' }}>
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
                Mulai Sesi Kamera
              </button>

              <button className="secondary-button hero-secondary-btn" type="button" onClick={handleUploadMode}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', marginRight: '8px' }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                Upload Foto
              </button>
            </div>

            {!cameraAvailable && (
              <p className="camera-warning">Kamera tidak tersedia, silakan gunakan fitur upload foto.</p>
            )}
          </section>
        ) : null}

        {(step === 2 && method === 'camera') || (step === 3 && method === 'upload') ? (
          <section className="step-panel active">
            <p className="step-kicker">Pilih Frame Overlay</p>
            
            <div className="customizer-layout">
              <div className="customizer-preview">
                <StripCanvasPreview
                  images={method === 'upload' ? uploadedImages : Array(currentTemplate.count).fill(null)}
                  template={currentTemplate}
                  customColor={customColor}
                  selectedFrameId={selectedFrameId}
                  photoFilter="normal"
                />
              </div>

              <div className="customizer-controls">
                <div className="control-group">
                  <span className="control-label">Pilih Frame Overlay</span>
                  <div className="customizer-grid">
                    {frames.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        className={`customizer-option-btn ${selectedFrameId === f.id ? 'active' : ''}`}
                        onClick={() => handleSelectFrame(f.id)}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedFrameId === 'color' ? (
                  <div className="control-group">
                    <span className="control-label">Template Preset Klasik</span>
                    <div className="customizer-grid-3">
                      {templates.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          className={`customizer-option-btn ${selectedTemplateId === t.id && selectedFrameId === 'color' ? 'active' : ''}`}
                          onClick={() => handleSelectTemplate(t)}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="customizer-actions">
                  <button className="primary-button" type="button" onClick={() => {
                    if (method === 'camera') {
                      handleStartSession();
                    } else {
                      setStepState(4);
                    }
                  }}>
                    Lanjut {method === 'camera' ? 'Foto' : 'Pilih Filter'} →
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {step === 3 && method === 'camera' ? (
          <section className="step-panel active">
            <p className="step-kicker">Kamera siap menangkap momen</p>

            <div className="camera-layout-wrapper">
              {/* Main Camera Area */}
              <div className="camera-main-area">
                <div className="camera-stage-container">
                  <div className="camera-top-bar">
                    <label htmlFor="delaySelect">⏱ Countdown:</label>
                    <select
                      id="delaySelect"
                      className="delay-dropdown-small"
                      value={delayTime}
                      onChange={(e) => setDelayTime(parseInt(e.target.value))}
                      disabled={isCapturing}
                    >
                      <option value={1000}>1s</option>
                      <option value={3000}>3s</option>
                      <option value={5000}>5s</option>
                      <option value={10000}>10s</option>
                    </select>
                  </div>

                  <div className="camera-stage">
                    <video ref={videoRef} autoPlay playsInline muted />
                    <div className={`flash-overlay ${flashActive ? 'active' : ''}`} />
                    <div className={`countdown-overlay ${countdown === null ? 'hidden' : ''}`}>{countdown}</div>
                    <div className="camera-hud">
                      <span id="cameraProgressText">Foto {Math.min(currentCaptureIndex + 1, 3)} dari 3</span>
                      <div className="progress-dots">{renderProgressDots()}</div>
                    </div>
                  </div>
                </div>

                <div className="camera-shutter-row">
                  <button 
                    className={`shutter-btn ${isCapturing ? 'capturing' : ''}`} 
                    type="button" 
                    onClick={handleAutoCameraSession} 
                    disabled={isCapturing}
                    title="Mulai Sesi 3 Foto Otomatis"
                  >
                    <div className="shutter-btn-inner"></div>
                  </button>
                  <p className="shutter-hint">Tap untuk 3x foto otomatis</p>
                </div>

                <div className="camera-secondary-actions">
                  <button className="secondary-pill-btn" type="button" onClick={handleSnapButton} disabled={isCapturing}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="btn-icon">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                      <circle cx="12" cy="13" r="4"></circle>
                    </svg>
                    {cameraAvailable ? 'Jepret Manual' : 'Upload Galeri'}
                  </button>
                  <button className="secondary-pill-btn" type="button" onClick={resetAllState} disabled={isCapturing}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="btn-icon">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                      <path d="M3 3v5h5"></path>
                    </svg>
                    Mulai Ulang
                  </button>
                  {isMockEnabled && (
                    <button className="secondary-pill-btn" type="button" onClick={handleLoadMockCamera} disabled={isCapturing}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="btn-icon">
                        <path d="M9 3h6v6l4 10H5l4-10z"></path>
                        <path d="M9 14h6"></path>
                      </svg>
                      Load Mock
                    </button>
                  )}
                </div>
              </div>

              {/* Sidebar Preview */}
              <div className="camera-sidebar-area">
                <div className="camera-preview">
                  <p className="preview-help-text">Klik slot untuk retake</p>
                  <StripCanvasPreview 
                    template={currentTemplate} 
                    images={cameraShots} 
                    onSlotClick={handleRetakeAtSlot} 
                    selectedFrameId={selectedFrameId}
                    customColor={customColor}
                  />
                </div>
                
                <button className="primary-button proceed-btn" type="button" onClick={handleChooseStrip} disabled={cameraShots.length < 3 || isCapturing}>
                  Pilih Strip →
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {step === 2 && method === 'upload' ? (
          <section className="step-panel active">
            <p className="step-kicker">Upload foto kamu</p>
            <label
              className={`drop-zone ${dragActive ? 'drag-over' : ''}`}
              htmlFor="fileInput"
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={async (event) => {
                event.preventDefault();
                setDragActive(false);
                await handleUploadFiles(event.dataTransfer.files ?? []);
              }}
            >
              <input
                ref={uploadInputRef}
                id="fileInput"
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={async (event) => {
                  const files = event.target.files;
                  const targetIndex = uploadingSlotIndexRef.current;
                  if (files && files.length > 0) {
                    if (targetIndex !== null) {
                      const imgData = await fileToDataUrl(files[0]);
                      setUploadedImages((prev) => {
                        const next = Array.from({ length: 3 }).map((_, i) => prev[i] || null);
                        next[targetIndex] = imgData;
                        return next;
                      });
                      uploadingSlotIndexRef.current = null;
                    } else {
                      await handleUploadFiles(files);
                    }
                  }
                  event.target.value = '';
                }}
              />
              <div className="drop-copy">
                <div className="drop-illustration">⬆</div>
                <strong>Klik untuk pilih foto</strong>
                <span>atau drag &amp; drop · JPG, PNG · maks 3 foto</span>
              </div>
            </label>
            <p className="upload-count">
              Slot foto ({uploadedImages.filter((img) => img !== null).length}/3 terisi)
            </p>
            <div className="upload-slots">{renderUploadSlots()}</div>
            <div className="upload-actions">
              {isMockEnabled && (
                <button className="secondary-button" type="button" onClick={handleLoadMockPhotos}>
                  Load Mock Upload Photos
                </button>
              )}
              <button className="primary-button" type="button" onClick={() => setStepState(3)} disabled={!isSessionComplete}>
                Pilih Frame →
              </button>
              <button className="secondary-button" type="button" onClick={resetAllState}>
                Pilih metode lain
              </button>
            </div>
          </section>
        ) : null}

        {step === 4 ? (
          <section className="step-panel active">
            <p className="step-kicker">Pilih Filter Foto</p>

            <div className="customizer-layout">
              {/* Kiri: Live Canvas Preview */}
              <div className="customizer-preview">
                <StripCanvasPreview
                  images={activeImages}
                  template={currentTemplate}
                  customColor={customColor}
                  selectedFrameId={selectedFrameId}
                  photoFilter={photoFilter}
                />
              </div>

              {/* Kanan: Customizer Controls */}
              <div className="customizer-controls">
                {/* Photo Filter presets */}
                <div className="control-group">
                  <span className="control-label">Efek Filter</span>
                  <div className="filter-options-grid">
                    {[
                      { id: 'normal', name: 'Normal' },
                      { id: 'bw', name: 'B&W' },
                      { id: 'sepia', name: 'Sepia' },
                      { id: 'vintage', name: 'Vintage' },
                      { id: 'polaroid', name: 'Polaroid' },
                      { id: 'high-contrast', name: 'Contrast' },
                      { id: 'soft', name: 'Soft' },
                      { id: 'warm', name: 'Warm' },
                      { id: 'cool', name: 'Cool' },
                      { id: 'vivid', name: 'Vivid' },
                      { id: 'moody', name: 'Moody' },
                      { id: 'vintage-warm', name: 'Vintage Warm' }
                    ].map(filter => (
                      <button
                        key={filter.id}
                        type="button"
                        className={`filter-option-btn ${photoFilter === filter.id ? 'active' : ''}`}
                        onClick={() => setPhotoFilter(filter.id)}
                      >
                        <div className={`filter-preview-box filter-${filter.id}`}></div>
                        <span className="filter-option-label">{filter.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="customizer-actions">
                  <button className="primary-button" type="button" onClick={handleShowResult}>
                    Lihat Hasil Strip →
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {step === 5 ? (
          <section className="step-panel active">
            <p className="step-kicker">Hasil strip fotomu</p>
            <div className="result-layout">
              <div className="result-preview-card">
                <StripCanvasPreview
                  images={activeImages}
                  template={currentTemplate}
                  customColor={customColor}
                  selectedFrameId={selectedFrameId}
                  photoFilter={photoFilter}
                />
              </div>
              <div className="result-info">
                <p className="result-title">
                  {selectedFrameId !== 'color'
                    ? frames.find((f) => f.id === selectedFrameId)?.name
                    : currentTemplate.name}
                </p>
                <p className="result-meta">{activeImages.length} foto · {formatDate(new Date())}</p>
                <div className="result-actions">
                  <button className="primary-button" type="button" onClick={handleSaveStrip}>
                    Simpan Strip
                  </button>
                  <button className="secondary-button" type="button" onClick={handleRemake}>
                    Buat ulang
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </main>

      <input
        ref={cameraFallbackInputRef}
        className="sr-only"
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={async (event) => {
          await handleCameraFallbackFiles(event.target.files ?? []);
          event.target.value = '';
        }}
      />
    </div>
  );
}

export default App;