/**
 * DR Vision - Grad-CAM Activation Heatmap Visualizer
 * High-performance canvas-based Grad-CAM renderer with smooth bilinear interpolation,
 * robust multi-origin image loading, real-time opacity adjustment, and hardware-accelerated rendering.
 */

const GradCAM = (() => {
  let canvas, ctx;
  let currentImage = null;
  let currentConfig = null;
  let opacity = 0.55;
  let animFrameId = null;
  let offscreenCanvas = null;
  let offscreenCtx = null;
  const GRID_SIZE = 128; // Optimized resolution for 60fps real-time rendering

  function init(canvasElement) {
    canvas = canvasElement;
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    
    // Set standard canvas resolution
    canvas.width = 512;
    canvas.height = 512;

    offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = GRID_SIZE;
    offscreenCanvas.height = GRID_SIZE;
    offscreenCtx = offscreenCanvas.getContext('2d');
  }

  function loadImage(imageSource) {
    return new Promise((resolve, reject) => {
      if (!canvas) {
        init(document.getElementById('gradcam-canvas'));
      }

      // If already an HTMLImageElement that is loaded
      if (imageSource instanceof HTMLImageElement && imageSource.complete && imageSource.naturalWidth > 0) {
        currentImage = imageSource;
        resolve(imageSource);
        return;
      }

      const src = typeof imageSource === 'string' ? imageSource : (imageSource?.src || '');
      if (!src) {
        reject(new Error('No image source provided'));
        return;
      }

      const img = new Image();
      // Only set crossOrigin for remote http(s) URLs on http(s) origin to prevent file:// protocol blockage
      if (src.startsWith('http') && window.location.protocol.startsWith('http')) {
        img.crossOrigin = 'anonymous';
      }

      img.onload = () => {
        currentImage = img;
        resolve(img);
      };

      img.onerror = () => {
        // Fallback retry without crossOrigin if initial attempt failed
        if (img.crossOrigin) {
          const fallback = new Image();
          fallback.onload = () => {
            currentImage = fallback;
            resolve(fallback);
          };
          fallback.onerror = (err) => reject(err);
          fallback.src = src;
        } else {
          reject(new Error('Failed to load image: ' + src));
        }
      };

      img.src = src;
    });
  }

  function jetColormap(value) {
    let r, g, b;
    if (value < 0.125) {
      r = 0; g = 0; b = 0.5 + value * 4;
    } else if (value < 0.375) {
      r = 0; g = (value - 0.125) * 4; b = 1;
    } else if (value < 0.625) {
      r = (value - 0.375) * 4; g = 1; b = 1 - (value - 0.375) * 4;
    } else if (value < 0.875) {
      r = 1; g = 1 - (value - 0.625) * 4; b = 0;
    } else {
      r = 1 - (value - 0.875) * 2; g = 0; b = 0;
    }
    return [
      Math.round(Math.min(255, Math.max(0, r * 255))),
      Math.round(Math.min(255, Math.max(0, g * 255))),
      Math.round(Math.min(255, Math.max(0, b * 255)))
    ];
  }

  function generateHeatmapGrid(config, size = GRID_SIZE) {
    const heatmap = new Float32Array(size * size);
    if (!config || !config.hotspots) return heatmap;

    for (const spot of config.hotspots) {
      const cx = spot.x * size;
      const cy = spot.y * size;
      const r = spot.radius * size;
      const intensity = spot.intensity;

      const minX = Math.max(0, Math.floor(cx - r * 2.5));
      const maxX = Math.min(size - 1, Math.ceil(cx + r * 2.5));
      const minY = Math.max(0, Math.floor(cy - r * 2.5));
      const maxY = Math.min(size - 1, Math.ceil(cy + r * 2.5));

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const dx = x - cx;
          const dy = y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const gaussian = intensity * Math.exp(-(dist * dist) / (2 * r * r));
          const idx = y * size + x;
          if (gaussian > heatmap[idx]) {
            heatmap[idx] = gaussian;
          }
        }
      }
    }

    return heatmap;
  }

  function drawHeatmapToOffscreen(heatmapData, size, alpha) {
    if (!offscreenCtx) return;
    const imgData = offscreenCtx.createImageData(size, size);
    const data = imgData.data;

    for (let i = 0; i < heatmapData.length; i++) {
      const val = heatmapData[i];
      if (val > 0.04) {
        const [r, g, b] = jetColormap(val);
        const idx = i * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = Math.round(Math.min(1, val * 1.2) * alpha * 255);
      }
    }

    offscreenCtx.putImageData(imgData, 0, 0);
  }

  function render(config, heatmapOpacity) {
    if (!canvas || !ctx) return;
    if (heatmapOpacity !== undefined) opacity = heatmapOpacity;
    if (config) currentConfig = config;
    if (!currentConfig) return;

    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw base fundus image
    if (currentImage && currentImage.complete) {
      ctx.drawImage(currentImage, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = '#060a14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Generate heatmap & render onto canvas
    const heatmap = generateHeatmapGrid(currentConfig, GRID_SIZE);
    drawHeatmapToOffscreen(heatmap, GRID_SIZE, opacity);

    // Draw smoothed bilinear overlay
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(offscreenCanvas, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  function renderAnimated(config, duration = 1200) {
    if (!canvas || !ctx) return;
    currentConfig = config;

    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }

    const startTime = performance.now();

    function frame(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (currentImage && currentImage.complete) {
        ctx.drawImage(currentImage, 0, 0, canvas.width, canvas.height);
      }

      // Scale intensities by progress
      const animatedConfig = {
        hotspots: (config.hotspots || []).map(spot => ({
          ...spot,
          intensity: spot.intensity * eased
        }))
      };

      const heatmap = generateHeatmapGrid(animatedConfig, GRID_SIZE);
      drawHeatmapToOffscreen(heatmap, GRID_SIZE, opacity * eased);

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(offscreenCanvas, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      if (progress < 1) {
        animFrameId = requestAnimationFrame(frame);
      } else {
        animFrameId = null;
      }
    }

    animFrameId = requestAnimationFrame(frame);
  }

  function setOpacity(newOpacity) {
    opacity = Math.max(0, Math.min(1, newOpacity));
    if (currentConfig) {
      render(currentConfig);
    }
  }

  function toDataURL() {
    return canvas ? canvas.toDataURL('image/png') : null;
  }

  return {
    init,
    loadImage,
    render,
    renderAnimated,
    setOpacity,
    toDataURL
  };
})();

if (typeof module !== 'undefined') module.exports = GradCAM;
