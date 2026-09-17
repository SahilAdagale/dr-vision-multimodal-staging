document.addEventListener('DOMContentLoaded', () => {

  const state = {
    selectedImage: null,
    selectedImageKey: null,
    uploadedImage: null,
    clinicalData: {},
    result: null,
    deferralThreshold: 0.60,
    isMultimodal: true,
    isProcessing: false
  };


  const dom = {

    navbar: document.getElementById('navbar'),


    uploadZone: document.getElementById('upload-zone'),
    fileInput: document.getElementById('file-input'),
    previewImage: document.getElementById('preview-image'),
    previewContainer: document.querySelector('.preview-container'),


    inputAge: document.getElementById('input-age'),
    inputDuration: document.getElementById('input-duration'),
    inputSystolic: document.getElementById('input-systolic'),
    inputDiastolic: document.getElementById('input-diastolic'),
    inputHba1c: document.getElementById('input-hba1c'),
    inputBmi: document.getElementById('input-bmi'),
    inputCholesterol: document.getElementById('input-cholesterol'),
    inputSmoking: document.getElementById('input-smoking'),
    inputFamily: document.getElementById('input-family'),
    inputInsulin: document.getElementById('input-insulin'),


    analyzeBtn: document.getElementById('analyze-btn'),

    processingSection: document.getElementById('processing-section'),
    pipelineSteps: document.querySelectorAll('.pipeline-step'),
    pipelineConnectors: document.querySelectorAll('.pipeline-connector'),


    resultsSection: document.getElementById('results-section'),
    resultBadge: document.getElementById('result-badge'),
    gaugeValue: document.getElementById('gauge-value'),
    gaugeFill: document.getElementById('gauge-fill'),
    probsContainer: document.getElementById('class-probs-container'),


    deferralStatus: document.getElementById('deferral-status'),
    thresholdSlider: document.getElementById('threshold-slider'),
    thresholdValue: document.getElementById('threshold-value'),

    gradcamCanvas: document.getElementById('gradcam-canvas'),
    gradcamDescription: document.getElementById('gradcam-description'),
    opacitySlider: document.getElementById('opacity-slider'),
    shapContainer: document.getElementById('shap-container'),


    toggleSwitch: document.getElementById('fusion-toggle'),
    toggleLabelImage: document.getElementById('toggle-label-image'),
    toggleLabelMulti: document.getElementById('toggle-label-multi'),
    comparisonInfo: document.getElementById('comparison-info'),


    downloadReportBtn: document.getElementById('download-report-btn'),
    exportJsonBtn: document.getElementById('export-json-btn'),
    exportCsvBtn: document.getElementById('export-csv-btn'),
    reportPreview: document.getElementById('report-preview'),
  };


  initNavbar();
  initUploadZone();
  initSampleImages();
  initSamplePatients();
  initFormListeners();
  initThresholdSlider();
  initGradCAM();
  initSHAP();
  initToggle();
  initScrollAnimations();
  initParticles();

  function initNavbar() {
    window.addEventListener('scroll', () => {
      dom.navbar.classList.toggle('scrolled', window.scrollY > 50);
    });


    document.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }


  function initUploadZone() {
    dom.uploadZone.addEventListener('click', () => dom.fileInput.click());

    dom.uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
      dom.uploadZone.classList.add('drag-over');
    });

    dom.uploadZone.addEventListener('dragleave', (e) => {
      if (!dom.uploadZone.contains(e.relatedTarget)) {
        dom.uploadZone.classList.remove('drag-over');
      }
    });

    dom.uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dom.uploadZone.classList.remove('drag-over');

      // 1. Filesystem file drop
      const files = e.dataTransfer ? e.dataTransfer.files : null;
      if (files && files.length > 0) {
        const file = files[0];
        if (file && file.type.startsWith('image/')) {
          handleImageFile(file);
          if (typeof showToast === 'function') {
            showToast('Fundus image uploaded successfully', 'success', '📷');
          }
          return;
        }
      }

      // 2. Sample case image drop
      let sampleData = null;
      try {
        const jsonStr = e.dataTransfer ? e.dataTransfer.getData('application/json') : null;
        if (jsonStr) sampleData = JSON.parse(jsonStr);
      } catch (_) {}

      let sampleKey = sampleData?.key || 
                      (e.dataTransfer ? (e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text')) : null);
      let sampleSrc = sampleData?.imgSrc || 
                      (e.dataTransfer ? (e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('URL')) : null);

      const allThumbs = Array.from(document.querySelectorAll('.sample-thumb'));
      let targetThumb = null;

      if (sampleKey && DRSimulator.SAMPLE_PROFILES[sampleKey]) {
        targetThumb = document.querySelector(`.sample-thumb[data-key="${sampleKey}"]`);
      }

      if (!targetThumb) {
        targetThumb = allThumbs.find(t => {
          const img = t.querySelector('img');
          const src = img?.src || '';
          return (sampleSrc && src.includes(sampleSrc)) || 
                 (sampleKey && (src.includes(sampleKey) || t.dataset.key === sampleKey));
        });
        if (targetThumb) {
          sampleKey = targetThumb.dataset.key;
          sampleSrc = targetThumb.querySelector('img')?.src;
        }
      }

      if (targetThumb && sampleKey) {
        const imgSrc = sampleSrc || targetThumb.querySelector('img')?.src || `assets/images/fundus_${sampleKey}.jpg`;
        selectSampleImage(sampleKey, imgSrc, targetThumb);
        const label = targetThumb.querySelector('.thumb-label')?.textContent || sampleKey;
        if (typeof showToast === 'function') {
          showToast(`Sample case loaded: ${label}`, 'success', '👁️');
        }
        return;
      }

      // 3. Web image URL drop
      const droppedUrl = e.dataTransfer ? (e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('URL')) : null;
      if (droppedUrl && (droppedUrl.startsWith('http') || droppedUrl.startsWith('data:image'))) {
        state.selectedImage = droppedUrl;
        state.selectedImageKey = 'custom_url';
        showImagePreview(droppedUrl);
        if (typeof showToast === 'function') {
          showToast('Image loaded via drag & drop', 'info', '🖼️');
        }
      }
    });

    dom.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) handleImageFile(file);
    });

    // Clear button
    const clearBtn = document.getElementById('clear-image-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearImage();
      });
    }
  }

  function handleImageFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      state.uploadedImage = e.target.result;
      state.selectedImage = e.target.result;
      state.selectedImageKey = 'uploaded';
      showImagePreview(e.target.result);

      // Deselect sample thumbs
      document.querySelectorAll('.sample-thumb').forEach(t => t.classList.remove('selected'));
    };
    reader.readAsDataURL(file);
  }

  function showImagePreview(src) {
    dom.previewImage.src = src;
    dom.uploadZone.classList.add('has-image');
    updateAnalyzeButton();
  }

  function clearImage() {
    state.selectedImage = null;
    state.selectedImageKey = null;
    state.uploadedImage = null;
    dom.uploadZone.classList.remove('has-image');
    dom.previewImage.src = '';
    dom.fileInput.value = '';
    document.querySelectorAll('.sample-thumb').forEach(t => t.classList.remove('selected'));
    updateAnalyzeButton();
  }

  function selectSampleImage(key, imgSrc, thumbElement) {
    document.querySelectorAll('.sample-thumb').forEach(t => t.classList.remove('selected'));
    if (thumbElement) {
      thumbElement.classList.add('selected');
    } else {
      const matchingThumb = document.querySelector(`.sample-thumb[data-key="${key}"]`);
      if (matchingThumb) matchingThumb.classList.add('selected');
    }

    state.selectedImage = imgSrc;
    state.selectedImageKey = key;
    state.uploadedImage = null;
    showImagePreview(imgSrc);

    // Auto-fill clinical data for the selected sample
    const profile = DRSimulator.SAMPLE_PROFILES[key];
    if (profile) {
      fillClinicalData(profile);
    }
  }

  // ===== SAMPLE IMAGES =====
  function initSampleImages() {
    document.querySelectorAll('.sample-thumb').forEach(thumb => {
      thumb.setAttribute('draggable', 'true');

      const handleDragStart = (e) => {
        const key = thumb.dataset.key;
        const img = thumb.querySelector('img');
        const imgSrc = img ? img.src : '';
        if (e.dataTransfer) {
          e.dataTransfer.setData('text/plain', key);
          e.dataTransfer.setData('application/json', JSON.stringify({ key, imgSrc }));
          e.dataTransfer.effectAllowed = 'copy';
        }
        thumb.classList.add('dragging');
      };

      thumb.addEventListener('dragstart', handleDragStart);
      thumb.addEventListener('dragend', () => {
        thumb.classList.remove('dragging');
      });

      const img = thumb.querySelector('img');
      if (img) {
        img.addEventListener('dragstart', handleDragStart);
      }

      thumb.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = thumb.dataset.key;
        const imgSrc = thumb.querySelector('img').src;
        selectSampleImage(key, imgSrc, thumb);
      });
    });
  }

  // ===== SAMPLE PATIENTS =====
  function initSamplePatients() {
    document.querySelectorAll('.patient-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const key = chip.dataset.profile;
        const profile = DRSimulator.SAMPLE_PROFILES[key];
        if (profile) {
          fillClinicalData(profile);

          // Animate the fields
          document.querySelectorAll('.form-group input, .form-group select').forEach((el, i) => {
            el.style.transition = 'none';
            el.style.backgroundColor = 'rgba(0, 212, 255, 0.1)';
            setTimeout(() => {
              el.style.transition = 'background-color 0.5s ease';
              el.style.backgroundColor = '';
            }, 100 + i * 50);
          });
        }
      });
    });
  }

  function fillClinicalData(profile) {
    dom.inputAge.value = profile.age;
    dom.inputDuration.value = profile.diabetesDuration;
    dom.inputSystolic.value = profile.systolicBP;
    dom.inputDiastolic.value = profile.diastolicBP;
    dom.inputHba1c.value = profile.hba1c;
    dom.inputBmi.value = profile.bmi;
    dom.inputCholesterol.value = profile.cholesterol;
    dom.inputSmoking.value = profile.smoking;
    dom.inputFamily.value = profile.familyHistory;
    dom.inputInsulin.value = profile.insulin;
    updateAnalyzeButton();
  }

  // ===== FORM LISTENERS =====
  function initFormListeners() {
    const inputs = [dom.inputAge, dom.inputDuration, dom.inputSystolic, dom.inputDiastolic,
    dom.inputHba1c, dom.inputBmi, dom.inputCholesterol, dom.inputSmoking,
    dom.inputFamily, dom.inputInsulin];

    inputs.forEach(input => {
      if (input) {
        input.addEventListener('input', updateAnalyzeButton);
        input.addEventListener('change', updateAnalyzeButton);
      }
    });

    // Analyze button
    dom.analyzeBtn.addEventListener('click', runAnalysis);
  }

  function getClinicalData() {
    return {
      age: parseFloat(dom.inputAge.value) || 0,
      diabetesDuration: parseFloat(dom.inputDuration.value) || 0,
      systolicBP: parseFloat(dom.inputSystolic.value) || 0,
      diastolicBP: parseFloat(dom.inputDiastolic.value) || 0,
      hba1c: parseFloat(dom.inputHba1c.value) || 0,
      bmi: parseFloat(dom.inputBmi.value) || 0,
      cholesterol: parseFloat(dom.inputCholesterol.value) || 0,
      smoking: dom.inputSmoking.value || 'never',
      familyHistory: dom.inputFamily.value || 'no',
      insulin: dom.inputInsulin.value || 'no'
    };
  }

  function updateAnalyzeButton() {
    const hasImage = state.selectedImage !== null;
    const hasAge = dom.inputAge.value !== '';
    const hasDuration = dom.inputDuration.value !== '';
    dom.analyzeBtn.disabled = !(hasImage && hasAge && hasDuration);
    dom.analyzeBtn.style.opacity = dom.analyzeBtn.disabled ? '0.5' : '1';
  }

  // ===== ANALYSIS PIPELINE =====
  async function runAnalysis() {
    if (state.isProcessing) return;
    state.isProcessing = true;

    const clinicalData = getClinicalData();
    state.clinicalData = clinicalData;

    // Determine image key
    const imageKey = state.selectedImageKey || 'no_dr';

    // Hide results, show processing
    dom.resultsSection.classList.remove('active');
    dom.processingSection.classList.add('active');

    // Scroll to processing
    dom.processingSection.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Reset pipeline steps
    dom.pipelineSteps.forEach(s => { s.classList.remove('active', 'completed'); });
    dom.pipelineConnectors.forEach(c => { c.classList.remove('active'); });

    // Animate pipeline steps
    const steps = Array.from(dom.pipelineSteps);
    const connectors = Array.from(dom.pipelineConnectors);

    for (let i = 0; i < steps.length; i++) {
      steps[i].classList.add('active');
      await sleep(600 + Math.random() * 400);
      steps[i].classList.remove('active');
      steps[i].classList.add('completed');

      if (connectors[i]) {
        connectors[i].classList.add('active');
        await sleep(300);
      }
    }

    await sleep(400);

    // Run simulation
    const result = DRSimulator.predict(imageKey, clinicalData, state.isMultimodal);
    state.result = result;

    // Hide processing, show results
    dom.processingSection.classList.remove('active');
    dom.resultsSection.classList.add('active');

    // Render results
    renderResults(result);
    renderDeferral(result);
    renderGradCAM(result);
    renderSHAP(result);
    renderComparison(result);

    // Scroll to results
    dom.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    state.isProcessing = false;
  }

  // ===== RENDER RESULTS =====
  function renderResults(result) {
    // Stage badge
    dom.resultBadge.className = `result-badge stage-${result.stage.id}`;
    dom.resultBadge.innerHTML = `
      <span style="font-size: 1.5rem">${getStageEmoji(result.stage.id)}</span>
      Stage ${result.stage.id}: ${result.stage.name}
    `;

    // Confidence gauge
    const confidencePct = (result.confidence * 100).toFixed(1);
    dom.gaugeValue.textContent = confidencePct + '%';
    dom.gaugeValue.style.color = result.confidence >= state.deferralThreshold ? '#00c9a7' : '#ff6b35';

    // Animate gauge arc
    const arcLength = 251.3; // Half-circle circumference for r=80 (π × 80)
    const dashOffset = arcLength * (1 - result.confidence);
    dom.gaugeFill.style.strokeDasharray = arcLength;
    dom.gaugeFill.style.strokeDashoffset = dashOffset;
    dom.gaugeFill.style.stroke = result.confidence >= state.deferralThreshold ? '#00c9a7' : '#ff6b35';

    // Class probabilities
    renderClassProbs(result.probabilities);
  }

  function renderClassProbs(probabilities) {
    const container = dom.probsContainer;
    container.innerHTML = '';

    const stageNames = ['No DR', 'Mild NPDR', 'Moderate NPDR', 'Severe NPDR', 'Proliferative DR'];
    const maxProb = Math.max(...probabilities);

    probabilities.forEach((prob, i) => {
      const bar = document.createElement('div');
      bar.className = 'prob-bar';
      bar.innerHTML = `
        <span class="prob-label">${stageNames[i]}</span>
        <div class="prob-track">
          <div class="prob-fill stage-${i}" style="width: 0%">
            ${(prob * 100).toFixed(1)}%
          </div>
        </div>
      `;
      container.appendChild(bar);

      // Animate width
      setTimeout(() => {
        bar.querySelector('.prob-fill').style.width = (prob * 100) + '%';
      }, 100 + i * 150);
    });
  }

  // ===== DEFERRAL =====
  function renderDeferral(result) {
    updateDeferralDisplay(result.confidence);
  }

  function updateDeferralDisplay(confidence) {
    const isDeferred = DRSimulator.shouldDefer(confidence, state.deferralThreshold);

    dom.deferralStatus.className = `deferral-status ${isDeferred ? 'deferred' : 'accepted'}`;
    dom.deferralStatus.innerHTML = isDeferred
      ? `⚠️ DEFERRED — Requires Clinician Review`
      : `✅ ACCEPTED — Automated Diagnosis`;

    // Update explanation
    const expEl = document.getElementById('deferral-explanation');
    if (expEl) {
      expEl.textContent = isDeferred
        ? `Confidence score (${(confidence * 100).toFixed(1)}%) is below the threshold (${(state.deferralThreshold * 100).toFixed(0)}%). This case has been flagged for mandatory ophthalmologist review due to potential image quality issues or model uncertainty.`
        : `Confidence score (${(confidence * 100).toFixed(1)}%) exceeds the threshold (${(state.deferralThreshold * 100).toFixed(0)}%). The automated diagnosis is within acceptable reliability limits.`;
    }
  }

  function initThresholdSlider() {
    dom.thresholdSlider.addEventListener('input', (e) => {
      state.deferralThreshold = parseFloat(e.target.value);
      dom.thresholdValue.textContent = (state.deferralThreshold * 100).toFixed(0) + '%';

      if (state.result) {
        updateDeferralDisplay(state.result.confidence);
      }
    });
  }

  // ===== GRAD-CAM =====
  function initGradCAM() {
    GradCAM.init(dom.gradcamCanvas);

    dom.opacitySlider.addEventListener('input', (e) => {
      GradCAM.setOpacity(parseFloat(e.target.value));
    });
  }

  async function renderGradCAM(result) {
    const imgSrc = state.selectedImage;
    if (!imgSrc) return;

    try {
      await GradCAM.loadImage(imgSrc);
      GradCAM.renderAnimated(result.gradcamConfig, 2000);

      dom.gradcamDescription.textContent = result.gradcamConfig.description;
    } catch (err) {
      console.error('Grad-CAM render error:', err);
    }
  }

  // ===== SHAP =====
  function initSHAP() {
    SHAPChart.init(dom.shapContainer);
  }

  function renderSHAP(result) {
    SHAPChart.render(result.shapValues, true);
  }

  // ===== COMPARISON TOGGLE =====
  function initToggle() {
    dom.toggleSwitch.addEventListener('click', () => {
      state.isMultimodal = !state.isMultimodal;
      dom.toggleSwitch.classList.toggle('active', state.isMultimodal);
      dom.toggleLabelImage.classList.toggle('active', !state.isMultimodal);
      dom.toggleLabelMulti.classList.toggle('active', state.isMultimodal);

      if (state.result) {
        // Re-run with new mode
        const imageKey = state.selectedImageKey || 'no_dr';
        const result = DRSimulator.predict(imageKey, state.clinicalData, state.isMultimodal);
        state.result = result;
        renderResults(result);
        renderDeferral(result);
        renderSHAP(result);

        // Update comparison info
        if (dom.comparisonInfo) {
          dom.comparisonInfo.innerHTML = state.isMultimodal
            ? `<strong>Multimodal Fusion Active</strong> — Image features + clinical data combined for enhanced accuracy. Confidence: ${(result.confidence * 100).toFixed(1)}%`
            : `<strong>Image-Only Baseline</strong> — Using retinal image features alone. Confidence: ${(result.imageOnly.confidence * 100).toFixed(1)}% (typically lower without clinical context)`;
        }
      }
    });
  }

  function renderComparison(result) {
    if (dom.comparisonInfo) {
      dom.comparisonInfo.innerHTML = `<strong>Multimodal Fusion Active</strong> — Image features + clinical data combined for enhanced accuracy. Confidence: ${(result.confidence * 100).toFixed(1)}%`;
    }
  }

  // ===== TOAST NOTIFICATIONS =====
  function showToast(message, type = 'info', icon = 'ℹ️') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${message}</span>
    `;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 350);
    }, 3500);
  }

  // ===== REPORT & EXPORTS =====
  function downloadBlob(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function exportJSON() {
    if (!state.result) {
      showToast('Please run the multimodal analysis first to generate data.', 'warning', '⚠️');
      return;
    }
    const exportData = {
      project: 'DR Vision — Multimodal DR Staging',
      exportTimestamp: new Date().toISOString(),
      patientClinicalData: state.clinicalData,
      modelResults: {
        stageId: state.result.stage.id,
        stageName: state.result.stage.name,
        stageLabel: state.result.stage.label,
        riskLevel: state.result.stage.risk,
        confidence: state.result.confidence,
        deferred: DRSimulator.shouldDefer(state.result.confidence, 0.6),
        probabilities: state.result.probabilities,
        clinicalRiskIndex: state.result.clinicalRisk,
        fusionStrategy: state.result.fusionStrategy,
        modelVersion: state.result.modelVersion
      },
      shapAttributions: state.result.shapValues || []
    };
    const jsonStr = JSON.stringify(exportData, null, 2);
    const filename = `dr_vision_record_${Date.now()}.json`;
    downloadBlob(jsonStr, filename, 'application/json');
    showToast('Clinical record exported as JSON.', 'success', '💾');
  }

  function exportCSV() {
    if (!state.result) {
      showToast('Please run the multimodal analysis first to generate data.', 'warning', '⚠️');
      return;
    }
    const c = state.clinicalData || {};
    const r = state.result;
    const headers = [
      'Timestamp', 'Age', 'DiabetesDuration', 'SystolicBP', 'DiastolicBP',
      'HbA1c', 'BMI', 'Cholesterol', 'Smoking', 'FamilyHistory', 'Insulin',
      'PredictedStageId', 'PredictedStageName', 'RiskLevel', 'Confidence',
      'ClinicalRiskScore', 'Deferred', 'FusionStrategy'
    ];
    const row = [
      new Date().toISOString(),
      c.age || '',
      c.diabetesDuration || '',
      c.systolicBP || '',
      c.diastolicBP || '',
      c.hba1c || '',
      c.bmi || '',
      c.cholesterol || '',
      c.smoking || '',
      c.familyHistory || '',
      c.insulin || '',
      r.stage.id,
      `"${r.stage.name}"`,
      r.stage.risk,
      (r.confidence * 100).toFixed(1) + '%',
      (r.clinicalRisk * 100).toFixed(1) + '%',
      DRSimulator.shouldDefer(r.confidence, 0.6) ? 'YES' : 'NO',
      `"${r.fusionStrategy}"`
    ];
    const csvContent = headers.join(',') + '\n' + row.join(',') + '\n';
    const filename = `dr_vision_dataset_${Date.now()}.csv`;
    downloadBlob(csvContent, filename, 'text/csv;charset=utf-8;');
    showToast('Tabular clinical dataset exported as CSV.', 'success', '📊');
  }

  if (dom.downloadReportBtn) {
    dom.downloadReportBtn.addEventListener('click', () => {
      if (state.result) {
        ReportGenerator.generateReport(state.result, state.clinicalData, state.selectedImage);
        showToast('Preparing clinical PDF report...', 'info', '📄');
      } else {
        showToast('Please run the multimodal analysis first to generate the report.', 'warning', '⚠️');
      }
    });
  }

  if (dom.exportJsonBtn) {
    dom.exportJsonBtn.addEventListener('click', exportJSON);
  }

  if (dom.exportCsvBtn) {
    dom.exportCsvBtn.addEventListener('click', exportCSV);
  }

  // ===== SCROLL ANIMATIONS =====
  function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
  }

  // ===== PARTICLE BACKGROUND =====
  function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];
    const count = 60;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function createParticle() {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.3 + 0.1
      };
    }

    function init() {
      resize();
      particles = Array.from({ length: count }, createParticle);
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 212, 255, ${p.opacity})`;
        ctx.fill();
      });

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0, 212, 255, ${0.06 * (1 - dist / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize);
    init();
    draw();
  }

  // ===== HELPERS =====
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function getStageEmoji(stageId) {
    const emojis = ['🟢', '🟡', '🟠', '🔴', '⛔'];
    return emojis[stageId] || '⚪';
  }

  // ===== KEYBOARD SHORTCUTS & MODAL =====
  const shortcutsModal = document.getElementById('shortcuts-modal');
  const closeShortcutsBtn = document.getElementById('close-shortcuts-btn');
  const navShortcutsBtn = document.getElementById('nav-shortcuts-btn');

  function toggleShortcuts(show) {
    if (!shortcutsModal) return;
    if (show === undefined) shortcutsModal.classList.toggle('open');
    else if (show) shortcutsModal.classList.add('open');
    else shortcutsModal.classList.remove('open');
  }

  if (navShortcutsBtn) {
    navShortcutsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleShortcuts();
    });
  }

  if (closeShortcutsBtn) {
    closeShortcutsBtn.addEventListener('click', () => toggleShortcuts(false));
  }
  if (shortcutsModal) {
    shortcutsModal.addEventListener('click', (e) => {
      if (e.target === shortcutsModal) toggleShortcuts(false);
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      toggleShortcuts(false);
      return;
    }
    const isEditing = ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName);

    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (dom.runAnalysisBtn) dom.runAnalysisBtn.click();
    } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
      e.preventDefault();
      if (dom.downloadReportBtn) dom.downloadReportBtn.click();
    } else if (e.altKey && (e.key === 'M' || e.key === 'm')) {
      e.preventDefault();
      if (dom.toggleSwitch) {
        dom.toggleSwitch.checked = !dom.toggleSwitch.checked;
        dom.toggleSwitch.dispatchEvent(new Event('change'));
      }
    } else if (e.key === '?' && !isEditing) {
      e.preventDefault();
      toggleShortcuts();
    }
  });
});
