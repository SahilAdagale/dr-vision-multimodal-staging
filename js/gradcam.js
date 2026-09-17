const GradCAM = (() => {
  let canvas, ctx;
  let currentImage = null;
  let currentConfig = null;
  let opacity = 0.55;

  function init(canvasElement) {
    canvas = canvasElement;
    ctx = canvas.getContext('2d');
  }

  function loadImage(imageSrc) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        currentImage = img;
        canvas.width = img.naturalWidth || 512;
        canvas.height = img.naturalHeight || 512;
        resolve(img);
      };
      img.onerror = reject;
      img.src = imageSrc;
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

  function generateHeatmapData(config, width, height) {
    const heatmap = new Float32Array(width * height);

    for (const spot of config.hotspots) {
      const cx = spot.x * width;
      const cy = spot.y * height;
      const r = spot.radius * Math.max(width, height);
      const intensity = spot.intensity;

      const minX = Math.max(0, Math.floor(cx - r * 2.5));
      const maxX = Math.min(width - 1, Math.ceil(cx + r * 2.5));
      const minY = Math.max(0, Math.floor(cy - r * 2.5));
      const maxY = Math.min(height - 1, Math.ceil(cy + r * 2.5));

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const dx = x - cx;
          const dy = y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const gaussian = intensity * Math.exp(-(dist * dist) / (2 * r * r));
          const idx = y * width + x;
          heatmap[idx] = Math.max(heatmap[idx], gaussian);
        }
      }
    }

    return heatmap;
  }

  function render(config, heatmapOpacity) {
    if (!currentImage || !canvas) return;
    currentConfig = config;
    if (heatmapOpacity !== undefined) opacity = heatmapOpacity;

    const w = canvas.width;
    const h = canvas.height;

    ctx.drawImage(currentImage, 0, 0, w, h);

    const heatmapData = generateHeatmapData(config, w, h);

    const overlayCanvas = document.createElement('canvas');
    overlayCanvas.width = w;
    overlayCanvas.height = h;
    const overlayCtx = overlayCanvas.getContext('2d');
    const imageData = overlayCtx.createImageData(w, h);

    for (let i = 0; i < heatmapData.length; i++) {
      const value = heatmapData[i];
      if (value > 0.05) {
        const [r, g, b] = jetColormap(value);
        imageData.data[i * 4] = r;
        imageData.data[i * 4 + 1] = g;
        imageData.data[i * 4 + 2] = b;
        imageData.data[i * 4 + 3] = Math.round(value * opacity * 255);
      }
    }

    overlayCtx.putImageData(imageData, 0, 0);

    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    ctx.drawImage(overlayCanvas, 0, 0);
  }

  function renderAnimated(config, duration = 1500) {
    if (!currentImage || !canvas) return;
    currentConfig = config;

    const startTime = performance.now();

    function animFrame(timestamp) {
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      ctx.drawImage(currentImage, 0, 0, canvas.width, canvas.height);

      const revealedConfig = {
        hotspots: config.hotspots.map((spot, i) => ({
          ...spot,
          intensity: spot.intensity * Math.min(1, eased * config.hotspots.length / (i + 1))
        }))
      };

      const w = canvas.width;
      const h = canvas.height;
      const heatmapData = generateHeatmapData(revealedConfig, w, h);
      const overlayCanvas = document.createElement('canvas');
      overlayCanvas.width = w;
      overlayCanvas.height = h;
      const overlayCtx = overlayCanvas.getContext('2d');
      const imageData = overlayCtx.createImageData(w, h);

      for (let i = 0; i < heatmapData.length; i++) {
        const value = heatmapData[i];
        if (value > 0.05) {
          const [r, g, b] = jetColormap(value);
          imageData.data[i * 4] = r;
          imageData.data[i * 4 + 1] = g;
          imageData.data[i * 4 + 2] = b;
          imageData.data[i * 4 + 3] = Math.round(value * opacity * 255);
        }
      }

      overlayCtx.putImageData(imageData, 0, 0);
      ctx.drawImage(overlayCanvas, 0, 0);

      if (progress < 1) {
        requestAnimationFrame(animFrame);
      }
    }

    requestAnimationFrame(animFrame);
  }

  function setOpacity(newOpacity) {
    opacity = newOpacity;
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
