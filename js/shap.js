/**
 * DR Vision - SHAP Feature Attribution Chart Renderer
 * Renders an interactive, animated horizontal waterfall chart of clinical feature contributions.
 */

const SHAPChart = (() => {
  let container = null;

  function init(containerElement) {
    container = containerElement;
  }

  function render(shapValues, animated = true) {
    if (!container) return;
    container.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.style.marginBottom = '16px';
    header.innerHTML = `
      <h3 style="margin: 0 0 6px 0; font-size: 1rem;">📊 SHAP Feature Attribution</h3>
      <p style="margin: 0; font-size: 0.8rem; color: #8b95a8;">
        Impact of clinical variables pushing the model's DR stage assessment higher or lower.
      </p>
    `;
    container.appendChild(header);

    if (!shapValues || shapValues.length === 0) {
      const emptyMsg = document.createElement('p');
      emptyMsg.style.cssText = 'font-size: 0.8rem; color: #5a6478; text-align: center; margin-top: 30px;';
      emptyMsg.textContent = 'No clinical feature contributions available.';
      container.appendChild(emptyMsg);
      return;
    }

    const chartWrap = document.createElement('div');
    chartWrap.className = 'shap-chart-wrapper';
    container.appendChild(chartWrap);

    const maxAbs = Math.max(...shapValues.map(f => Math.abs(f.value)), 0.01);
    const scaleFactor = 40 / maxAbs;

    shapValues.forEach((feature, index) => {
      const row = document.createElement('div');
      row.className = 'shap-bar-group';
      row.style.opacity = animated ? '0' : '1';
      row.style.transform = animated ? 'translateX(-16px)' : 'none';

      const nameEl = document.createElement('div');
      nameEl.className = 'shap-feature-name';
      nameEl.textContent = feature.name;

      const barWrap = document.createElement('div');
      barWrap.className = 'shap-bar-wrap';

      const centerLine = document.createElement('div');
      centerLine.className = 'shap-bar-center';
      barWrap.appendChild(centerLine);

      const bar = document.createElement('div');
      bar.className = `shap-bar ${feature.value >= 0 ? 'positive' : 'negative'}`;
      const barWidth = Math.min(48, Math.abs(feature.value) * scaleFactor);
      bar.style.width = animated ? '0%' : barWidth + '%';

      if (feature.value >= 0) {
        bar.style.left = '50%';
      } else {
        bar.style.right = '50%';
      }

      const valueEl = document.createElement('span');
      valueEl.className = 'shap-value';
      valueEl.textContent = (feature.value >= 0 ? '+' : '') + feature.value.toFixed(3);

      if (feature.value >= 0) {
        valueEl.style.left = `calc(50% + ${barWidth}% + 6px)`;
        valueEl.style.color = '#ff6b35';
      } else {
        valueEl.style.right = `calc(50% + ${barWidth}% + 6px)`;
        valueEl.style.color = '#00d4ff';
      }

      barWrap.appendChild(bar);
      barWrap.appendChild(valueEl);

      row.appendChild(nameEl);
      row.appendChild(barWrap);
      chartWrap.appendChild(row);

      if (animated) {
        setTimeout(() => {
          row.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
          row.style.opacity = '1';
          row.style.transform = 'translateX(0)';

          setTimeout(() => {
            bar.style.transition = 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
            bar.style.width = barWidth + '%';
          }, 80);
        }, index * 80);
      }
    });

    const axis = document.createElement('div');
    axis.className = 'shap-axis';
    axis.innerHTML = `
      <span>← Lowers Risk</span>
      <span style="position: absolute; left: 50%; transform: translateX(-50%); color: #8b95a8;">Base (0.0)</span>
      <span>Increases Risk →</span>
    `;
    axis.style.position = 'relative';
    axis.style.marginTop = '16px';
    container.appendChild(axis);

    const legend = document.createElement('div');
    legend.style.cssText = 'display: flex; justify-content: center; gap: 24px; margin-top: 14px; font-size: 0.72rem; flex-wrap: wrap;';
    legend.innerHTML = `
      <span style="color: #ff6b35; display: inline-flex; align-items: center; gap: 4px;">
        <span style="display:inline-block; width:10px; height:10px; background:#ff6b35; border-radius:2px;"></span> Pushes toward higher severity
      </span>
      <span style="color: #00d4ff; display: inline-flex; align-items: center; gap: 4px;">
        <span style="display:inline-block; width:10px; height:10px; background:#00d4ff; border-radius:2px;"></span> Pushes toward lower severity
      </span>
    `;
    container.appendChild(legend);
  }

  return {
    init,
    render
  };
})();

if (typeof module !== 'undefined') module.exports = SHAPChart;
