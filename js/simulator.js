const DRSimulator = (() => {
  const STAGES = [
    { id: 0, name: 'No DR', label: 'No Diabetic Retinopathy', color: '#00c9a7', risk: 'None' },
    { id: 1, name: 'Mild NPDR', label: 'Mild Non-Proliferative DR', color: '#a8e063', risk: 'Low' },
    { id: 2, name: 'Moderate NPDR', label: 'Moderate Non-Proliferative DR', color: '#ffd700', risk: 'Moderate' },
    { id: 3, name: 'Severe NPDR', label: 'Severe Non-Proliferative DR', color: '#ff6b35', risk: 'High' },
    { id: 4, name: 'Proliferative DR', label: 'Proliferative Diabetic Retinopathy', color: '#ff2d55', risk: 'Very High' },
  ];

  const SAMPLE_PROFILES = {
    no_dr: {
      age: 35, diabetesDuration: 2, systolicBP: 118, diastolicBP: 75,
      hba1c: 6.1, bmi: 23.5, cholesterol: 185, smoking: 'never',
      familyHistory: 'no', insulin: 'no',
      expectedStage: 0, confidence: 0.94
    },
    mild_dr: {
      age: 48, diabetesDuration: 7, systolicBP: 132, diastolicBP: 82,
      hba1c: 7.2, bmi: 27.8, cholesterol: 210, smoking: 'former',
      familyHistory: 'yes', insulin: 'no',
      expectedStage: 1, confidence: 0.88
    },
    moderate_dr: {
      age: 55, diabetesDuration: 12, systolicBP: 145, diastolicBP: 90,
      hba1c: 8.1, bmi: 30.2, cholesterol: 235, smoking: 'never',
      familyHistory: 'yes', insulin: 'yes',
      expectedStage: 2, confidence: 0.82
    },
    severe_dr: {
      age: 62, diabetesDuration: 18, systolicBP: 158, diastolicBP: 96,
      hba1c: 9.3, bmi: 32.1, cholesterol: 260, smoking: 'current',
      familyHistory: 'yes', insulin: 'yes',
      expectedStage: 3, confidence: 0.79
    },
    proliferative_dr: {
      age: 68, diabetesDuration: 25, systolicBP: 170, diastolicBP: 102,
      hba1c: 10.5, bmi: 34.5, cholesterol: 285, smoking: 'current',
      familyHistory: 'yes', insulin: 'yes',
      expectedStage: 4, confidence: 0.85
    },
    low_quality: {
      age: 50, diabetesDuration: 10, systolicBP: 140, diastolicBP: 88,
      hba1c: 7.8, bmi: 28.5, cholesterol: 220, smoking: 'never',
      familyHistory: 'no', insulin: 'yes',
      expectedStage: 2, confidence: 0.32
    }
  };

  function computeClinicalRisk(data) {
    let score = 0;
    score += Math.min(data.age / 80, 1) * 0.15;
    score += Math.min(data.diabetesDuration / 30, 1) * 0.25;
    const bpScore = Math.min((data.systolicBP - 110) / 80, 1);
    score += Math.max(bpScore, 0) * 0.15;
    const hba1cScore = Math.min((data.hba1c - 5.7) / 6, 1);
    score += Math.max(hba1cScore, 0) * 0.25;
    const bmiScore = Math.min((data.bmi - 18.5) / 20, 1);
    score += Math.max(bmiScore, 0) * 0.05;
    if (data.smoking === 'current') score += 0.08;
    else if (data.smoking === 'former') score += 0.03;
    if (data.familyHistory === 'yes') score += 0.05;
    if (data.insulin === 'yes') score += 0.05;

    return Math.min(score, 1);
  }

  function computeStageProbabilities(imageStage, clinicalRisk, isMultimodal = true) {
    const probs = [0, 0, 0, 0, 0];

    if (isMultimodal) {
      const blendedCenter = imageStage * 0.7 + (clinicalRisk * 4) * 0.3;
      const center = Math.round(Math.max(0, Math.min(4, blendedCenter)));

      for (let i = 0; i < 5; i++) {
        const dist = Math.abs(i - blendedCenter);
        probs[i] = Math.exp(-dist * dist / 0.8);
      }
    } else {
      for (let i = 0; i < 5; i++) {
        const dist = Math.abs(i - imageStage);
        probs[i] = Math.exp(-dist * dist / 1.2);
      }
    }

    const sum = probs.reduce((a, b) => a + b, 0);
    return probs.map(p => p / sum);
  }

  function computeSHAPValues(data, predictedStage) {
    const baselineStage = 1.0;
    const features = [];

    const hba1cContrib = (data.hba1c - 7.0) * 0.15;
    features.push({ name: 'HbA1c (' + data.hba1c + '%)', value: hba1cContrib, raw: data.hba1c });

    const durationContrib = (data.diabetesDuration - 8) * 0.04;
    features.push({ name: 'Diabetes Duration (' + data.diabetesDuration + 'y)', value: durationContrib, raw: data.diabetesDuration });

    const bpContrib = (data.systolicBP - 130) * 0.008;
    features.push({ name: 'Systolic BP (' + data.systolicBP + ')', value: bpContrib, raw: data.systolicBP });

    const ageContrib = (data.age - 50) * 0.005;
    features.push({ name: 'Age (' + data.age + ')', value: ageContrib, raw: data.age });

    const bmiContrib = (data.bmi - 25) * 0.01;
    features.push({ name: 'BMI (' + data.bmi.toFixed(1) + ')', value: bmiContrib, raw: data.bmi });

    const cholContrib = (data.cholesterol - 200) * 0.002;
    features.push({ name: 'Cholesterol (' + data.cholesterol + ')', value: cholContrib, raw: data.cholesterol });

    const smokingContrib = data.smoking === 'current' ? 0.15 : (data.smoking === 'former' ? 0.05 : -0.05);
    features.push({ name: 'Smoking (' + data.smoking + ')', value: smokingContrib, raw: data.smoking });

    const familyContrib = data.familyHistory === 'yes' ? 0.1 : -0.05;
    features.push({ name: 'Family History (' + data.familyHistory + ')', value: familyContrib, raw: data.familyHistory });

    const insulinContrib = data.insulin === 'yes' ? 0.12 : -0.08;
    features.push({ name: 'Insulin Use (' + data.insulin + ')', value: insulinContrib, raw: data.insulin });

    features.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

    return features;
  }

  function generateGradCAMConfig(predictedStage) {
    const configs = {
      0: {
        hotspots: [
          { x: 0.35, y: 0.5, radius: 0.08, intensity: 0.3 },
          { x: 0.55, y: 0.5, radius: 0.06, intensity: 0.2 },
        ],
        description: 'Minimal activation — model confirms no pathological features detected.'
      },
      1: {
        hotspots: [
          { x: 0.45, y: 0.35, radius: 0.07, intensity: 0.6 },
          { x: 0.6, y: 0.55, radius: 0.05, intensity: 0.5 },
          { x: 0.3, y: 0.6, radius: 0.04, intensity: 0.4 },
        ],
        description: 'Scattered activations indicating potential microaneurysms in the posterior pole.'
      },
      2: {
        hotspots: [
          { x: 0.4, y: 0.4, radius: 0.1, intensity: 0.75 },
          { x: 0.6, y: 0.35, radius: 0.08, intensity: 0.65 },
          { x: 0.35, y: 0.65, radius: 0.07, intensity: 0.6 },
          { x: 0.65, y: 0.6, radius: 0.06, intensity: 0.55 },
          { x: 0.5, y: 0.5, radius: 0.09, intensity: 0.5 },
        ],
        description: 'Multiple activations: hemorrhages, hard exudates, and possible cotton wool spots detected.'
      },
      3: {
        hotspots: [
          { x: 0.4, y: 0.4, radius: 0.12, intensity: 0.9 },
          { x: 0.6, y: 0.35, radius: 0.1, intensity: 0.85 },
          { x: 0.35, y: 0.65, radius: 0.11, intensity: 0.8 },
          { x: 0.65, y: 0.6, radius: 0.09, intensity: 0.8 },
          { x: 0.5, y: 0.5, radius: 0.13, intensity: 0.7 },
          { x: 0.3, y: 0.4, radius: 0.08, intensity: 0.75 },
          { x: 0.7, y: 0.45, radius: 0.07, intensity: 0.65 },
        ],
        description: 'Extensive activation across all quadrants: venous beading, IRMA, and widespread hemorrhages.'
      },
      4: {
        hotspots: [
          { x: 0.35, y: 0.45, radius: 0.14, intensity: 0.95 },
          { x: 0.55, y: 0.4, radius: 0.12, intensity: 0.9 },
          { x: 0.45, y: 0.6, radius: 0.13, intensity: 0.88 },
          { x: 0.65, y: 0.55, radius: 0.11, intensity: 0.85 },
          { x: 0.3, y: 0.35, radius: 0.1, intensity: 0.8 },
          { x: 0.7, y: 0.4, radius: 0.09, intensity: 0.82 },
          { x: 0.5, y: 0.5, radius: 0.15, intensity: 0.75 },
          { x: 0.4, y: 0.7, radius: 0.08, intensity: 0.7 },
        ],
        description: 'Critical activation: neovascularization, vitreous/preretinal hemorrhage, and possible tractional changes.'
      }
    };
    return configs[predictedStage] || configs[0];
  }

  function predict(imageKey, clinicalData, isMultimodal = true) {
    const profile = SAMPLE_PROFILES[imageKey];
    const data = clinicalData || profile;

    const imageStage = profile ? profile.expectedStage : 0;
    const clinicalRisk = computeClinicalRisk(data);
    const probabilities = computeStageProbabilities(imageStage, clinicalRisk, isMultimodal);
    const predictedStage = probabilities.indexOf(Math.max(...probabilities));

    let confidence;
    if (imageKey === 'low_quality') {
      confidence = 0.28 + Math.random() * 0.1;
    } else if (profile) {
      confidence = profile.confidence + (Math.random() * 0.06 - 0.03);
    } else {
      confidence = Math.max(...probabilities) * 0.95;
    }
    confidence = Math.max(0.15, Math.min(0.99, confidence));

    const imageOnlyProbs = computeStageProbabilities(imageStage, clinicalRisk, false);
    const imageOnlyStage = imageOnlyProbs.indexOf(Math.max(...imageOnlyProbs));
    const imageOnlyConfidence = Math.max(...imageOnlyProbs) * 0.88;

    const shapValues = computeSHAPValues(data, predictedStage);
    const gradcamConfig = generateGradCAMConfig(predictedStage);

    return {
      stage: STAGES[predictedStage],
      probabilities,
      confidence,
      clinicalRisk,
      shapValues,
      gradcamConfig,
      isLowQuality: imageKey === 'low_quality',
      imageOnly: {
        stage: STAGES[imageOnlyStage],
        probabilities: imageOnlyProbs,
        confidence: imageOnlyConfidence
      },
      timestamp: new Date().toISOString(),
      modelVersion: 'v1.0-MultiRetNet',
      fusionStrategy: isMultimodal ? 'Fully-Connected Fusion' : 'Image-Only'
    };
  }

  function shouldDefer(confidence, threshold = 0.6) {
    return confidence < threshold;
  }

  return {
    STAGES,
    SAMPLE_PROFILES,
    predict,
    shouldDefer,
    computeClinicalRisk,
    computeSHAPValues,
    generateGradCAMConfig
  };
})();

if (typeof module !== 'undefined') module.exports = DRSimulator;
