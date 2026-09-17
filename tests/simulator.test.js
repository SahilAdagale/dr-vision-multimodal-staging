/**
 * DR Vision - Automated Unit Tests for DRSimulator
 * Tests core prediction logic, multimodal fusion, SHAP calculations, and deferral triggers.
 */

(function (exports) {
  'use strict';

  const testSuite = [];

  function test(description, fn) {
    testSuite.push({ description, fn });
  }

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  function assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`${message || 'Failed'}: Expected [${expected}] but got [${actual}]`);
    }
  }

  function assertClose(actual, expected, epsilon = 0.001, message) {
    if (Math.abs(actual - expected) > epsilon) {
      throw new Error(`${message || 'Failed'}: Expected [${expected}] ≈ [${actual}] within ±${epsilon}`);
    }
  }

  // --- Test Cases ---

  test('DRSimulator defines all 5 clinically recognized DR stages', () => {
    assert(Array.isArray(DRSimulator.STAGES), 'STAGES must be an array');
    assertEqual(DRSimulator.STAGES.length, 5, 'Must define exactly 5 stages');
    const expectedStages = ['No DR', 'Mild NPDR', 'Moderate NPDR', 'Severe NPDR', 'Proliferative DR'];
    DRSimulator.STAGES.forEach((s, idx) => {
      assertEqual(s.id, idx, `Stage ID should match index ${idx}`);
      assertEqual(s.name, expectedStages[idx], `Stage name should match ${expectedStages[idx]}`);
      assert(s.risk && s.color && s.label, `Stage ${idx} must have risk, color, and label`);
    });
  });

  test('DRSimulator provides valid sample profiles', () => {
    const profiles = DRSimulator.SAMPLE_PROFILES;
    assert(profiles.no_dr, 'no_dr profile must exist');
    assert(profiles.proliferative_dr, 'proliferative_dr profile must exist');
    assert(profiles.low_quality, 'low_quality profile must exist');

    assert(profiles.no_dr.expectedStage === 0, 'no_dr should map to Stage 0');
    assert(profiles.proliferative_dr.expectedStage === 4, 'proliferative_dr should map to Stage 4');
    assert(profiles.low_quality.confidence < 0.5, 'low_quality should have confidence below threshold');
  });

  test('computeClinicalRisk produces normalized score between 0 and 1', () => {
    const lowRisk = DRSimulator.SAMPLE_PROFILES.no_dr;
    const highRisk = DRSimulator.SAMPLE_PROFILES.proliferative_dr;

    const lowScore = DRSimulator.computeClinicalRisk(lowRisk);
    const highScore = DRSimulator.computeClinicalRisk(highRisk);

    assert(lowScore >= 0 && lowScore <= 1, 'lowScore must be within [0, 1]');
    assert(highScore >= 0 && highScore <= 1, 'highScore must be within [0, 1]');
    assert(highScore > lowScore, 'High risk profile must produce higher risk score than low risk profile');
  });

  test('predict generates 5-class normalized probability distribution', () => {
    const profile = DRSimulator.SAMPLE_PROFILES.mild_dr;
    const result = DRSimulator.predict(1, profile, true, 'mild_dr');

    assert(result.stage, 'Result must have stage');
    assertEqual(result.probabilities.length, 5, 'Probabilities must have 5 entries');

    const sum = result.probabilities.reduce((a, b) => a + b, 0);
    assertClose(sum, 1.0, 0.005, 'Probabilities must sum to 1.0');
    assert(result.confidence >= 0 && result.confidence <= 1, 'Confidence must be between 0 and 1');
  });

  test('shouldDefer correctly triggers when confidence is below threshold', () => {
    assertEqual(DRSimulator.shouldDefer(0.45, 0.6), true, '0.45 should be deferred under 0.6 threshold');
    assertEqual(DRSimulator.shouldDefer(0.75, 0.6), false, '0.75 should not be deferred under 0.6 threshold');
    assertEqual(DRSimulator.shouldDefer(0.59, 0.6), true, '0.59 should be deferred');
    assertEqual(DRSimulator.shouldDefer(0.60, 0.6), false, '0.60 should pass threshold');
  });

  test('low_quality sample triggers clinical deferral recommendation', () => {
    const lqProfile = DRSimulator.SAMPLE_PROFILES.low_quality;
    const result = DRSimulator.predict(2, lqProfile, true, 'low_quality');

    assert(result.isLowQuality === true, 'isLowQuality must be true for low_quality image');
    const defer = DRSimulator.shouldDefer(result.confidence, 0.6);
    assertEqual(defer, true, 'Low quality image should trigger clinician deferral');
  });

  test('computeSHAPValues generates clinical feature attributions', () => {
    const profile = DRSimulator.SAMPLE_PROFILES.moderate_dr;
    const shap = DRSimulator.computeSHAPValues(profile, 2);

    assert(Array.isArray(shap), 'SHAP values must be an array');
    assert(shap.length >= 6, 'SHAP must evaluate at least 6 clinical features');
    shap.forEach(f => {
      assert(typeof f.name === 'string', 'Feature must have name string');
      assert(typeof f.value === 'number', 'Feature must have numerical attribution value');
    });
  });

  test('generateGradCAMConfig returns valid heatmap coordinates and layers', () => {
    const config = DRSimulator.generateGradCAMConfig(3);
    assert(config, 'GradCAM config must be returned');
    assert(Array.isArray(config.hotspots), 'Config must define hotspots array');
    assert(config.hotspots.length > 0, 'Hotspots must not be empty');
    config.hotspots.forEach(spot => {
      assert(spot.x >= 0 && spot.x <= 1, 'Spot x coordinate must be normalized [0, 1]');
      assert(spot.y >= 0 && spot.y <= 1, 'Spot y coordinate must be normalized [0, 1]');
      assert(spot.intensity >= 0 && spot.intensity <= 1, 'Spot intensity must be [0, 1]');
    });
  });

  // Export or run
  exports.DRSimulatorTests = {
    testSuite,
    run() {
      const results = { passed: 0, failed: 0, tests: [] };
      testSuite.forEach(t => {
        try {
          t.fn();
          results.passed++;
          results.tests.push({ name: t.description, status: 'PASS' });
        } catch (err) {
          results.failed++;
          results.tests.push({ name: t.description, status: 'FAIL', error: err.message });
        }
      });
      return results;
    }
  };

  if (typeof module !== 'undefined') {
    module.exports = exports.DRSimulatorTests;
  }
})(typeof window !== 'undefined' ? window : globalThis);
