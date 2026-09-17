const SHAPChart = (() => {
  let container = null;

  function init(containerElement) {
    container = containerElement;
  }

  function render(shapValues, animated = true) {
    if (!container) return;
    container.innerHTML = '';

    const maxAbs = Math.max(...shapValues.map(f => Math.abs(f.value)), 0.01);
    const scaleFactor = 40 / maxAbs;

    const title = document.createElement('h4');
    title.style.cssText = 'font-size: 0.85rem; color: #8b95a8; margin-bottom: 16px; font-weight: 500;';
    title.textContent = 'SHAP Feature Attribution';
    container.appendChild(title);

    shapValues.forEach((feature, index) => {
      const row = document.createElement('div');
      row.className = 'shap-bar-group';
      row.style.opacity = animated ? '0' : '1';
      row.style.transform = animated ? 'translateX(-20px)' : 'none';

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
      const barWidth = Math.abs(feature.value) * scaleFactor;
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
        valueEl.style.color = '#0094ff';
      }

      barWrap.appendChild(bar);
      barWrap.appendChild(valueEl);

      row.appendChild(nameEl);
      row.appendChild(barWrap);
      container.appendChild(row);

      if (animated) {
        setTimeout(() => {
          row.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
          row.style.opacity = '1';
          row.style.transform = 'translateX(0)';

          setTimeout(() => {
            bar.style.transition = 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            bar.style.width = barWidth + '%';
          }, 100);
        }, index * 100);
      }
    });

    const axis = document.createElement('div');
    axis.className = 'shap-axis';
    axis.innerHTML = `
      <span>← Lower Severity</span>
      <span style="position: absolute; left: calc(130px + 50% - 20px);">Base</span>
      <span>Higher Severity →</span>
    `;
    axis.style.position = 'relative';
    container.appendChild(axis);

    const legend = document.createElement('div');
    legend.style.cssText = 'display: flex; justify-content: center; gap: 24px; margin-top: 16px; font-size: 0.7rem;';
    legend.innerHTML = `
      <span style="color: #ff6b35;">■ Pushes toward higher severity</span>
      <span style="color: #0094ff;">■ Pushes toward lower severity</span>
    `;
    container.appendChild(legend);
  }

  return {
    init,
    render
  };
})();
