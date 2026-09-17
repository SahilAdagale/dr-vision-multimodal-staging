const ReportGenerator = (() => {

  async function generateReport(result, clinicalData, imageSrc) {
    if (typeof window.jspdf === 'undefined') {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js');
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = margin;

    doc.setFillColor(13, 18, 32);
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Multimodal DR Staging — Clinical Report', margin, 18);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 190, 210);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 27);
    doc.text('Model: MultiRetNet v1.0 | Fusion: Fully-Connected', margin, 33);

    y = 50;

    doc.setTextColor(0, 180, 220);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Patient Clinical Data', margin, y);
    y += 8;

    doc.setTextColor(60, 60, 80);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    const patientRows = [
      ['Age', `${clinicalData.age} years`, 'BMI', clinicalData.bmi?.toFixed(1) || 'N/A'],
      ['Diabetes Duration', `${clinicalData.diabetesDuration} years`, 'HbA1c', `${clinicalData.hba1c}%`],
      ['Blood Pressure', `${clinicalData.systolicBP}/${clinicalData.diastolicBP} mmHg`, 'Cholesterol', `${clinicalData.cholesterol} mg/dL`],
      ['Smoking Status', clinicalData.smoking || 'N/A', 'Insulin Use', clinicalData.insulin || 'N/A'],
      ['Family History', clinicalData.familyHistory || 'N/A', '', ''],
    ];

    doc.setFillColor(240, 242, 248);
    doc.rect(margin, y - 4, pageWidth - margin * 2, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('Parameter', margin + 2, y);
    doc.text('Value', margin + 50, y);
    doc.text('Parameter', margin + 95, y);
    doc.text('Value', margin + 145, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    patientRows.forEach(row => {
      doc.setTextColor(80, 80, 100);
      doc.text(row[0], margin + 2, y);
      doc.setTextColor(30, 30, 50);
      doc.text(row[1], margin + 50, y);
      if (row[2]) {
        doc.setTextColor(80, 80, 100);
        doc.text(row[2], margin + 95, y);
        doc.setTextColor(30, 30, 50);
        doc.text(row[3], margin + 145, y);
      }
      y += 6;
    });

    y += 8;

    doc.setTextColor(0, 180, 220);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Diagnosis Result', margin, y);
    y += 8;

    const stageColors = {
      0: [0, 201, 167],
      1: [168, 224, 99],
      2: [255, 215, 0],
      3: [255, 107, 53],
      4: [255, 45, 85]
    };
    const stageColor = stageColors[result.stage.id] || [100, 100, 100];

    doc.setFillColor(...stageColor);
    doc.roundedRect(margin, y - 4, 80, 12, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Stage ${result.stage.id}: ${result.stage.name}`, margin + 4, y + 3);

    y += 16;

    doc.setTextColor(60, 60, 80);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Confidence Score: ${(result.confidence * 100).toFixed(1)}%`, margin, y);
    y += 6;
    doc.text(`Clinical Risk Score: ${(result.clinicalRisk * 100).toFixed(1)}%`, margin, y);
    y += 6;
    doc.text(`Fusion Strategy: ${result.fusionStrategy}`, margin, y);
    y += 6;

    const isDeferred = result.confidence < 0.6;
    doc.setFont('helvetica', 'bold');
    if (isDeferred) {
      doc.setTextColor(255, 107, 53);
      doc.text('⚠ DEFERRED — Refer to ophthalmologist for manual review', margin, y);
    } else {
      doc.setTextColor(0, 180, 130);
      doc.text('✓ ACCEPTED — Automated diagnosis within confidence threshold', margin, y);
    }
    y += 10;

    doc.setTextColor(0, 180, 220);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Class Probabilities', margin, y);
    y += 8;

    const stageNames = ['No DR', 'Mild NPDR', 'Moderate NPDR', 'Severe NPDR', 'Proliferative DR'];
    result.probabilities.forEach((prob, i) => {
      doc.setTextColor(80, 80, 100);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(stageNames[i], margin + 2, y);

      doc.setFillColor(230, 232, 240);
      doc.roundedRect(margin + 40, y - 3.5, 80, 5, 1, 1, 'F');

      const color = stageColors[i] || [100, 100, 100];
      doc.setFillColor(...color);
      doc.roundedRect(margin + 40, y - 3.5, prob * 80, 5, 1, 1, 'F');

      doc.setTextColor(30, 30, 50);
      doc.text(`${(prob * 100).toFixed(1)}%`, margin + 125, y);

      y += 7;
    });

    y += 8;

    doc.setTextColor(0, 180, 220);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Feature Attributions (SHAP)', margin, y);
    y += 8;

    result.shapValues.forEach(feature => {
      doc.setTextColor(80, 80, 100);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(feature.name, margin + 2, y);

      const val = feature.value;
      if (val >= 0) {
        doc.setTextColor(255, 107, 53);
        doc.text(`+${val.toFixed(3)} (↑ severity)`, margin + 75, y);
      } else {
        doc.setTextColor(0, 148, 255);
        doc.text(`${val.toFixed(3)} (↓ severity)`, margin + 75, y);
      }
      y += 6;
    });

    y += 10;

    doc.setFillColor(245, 247, 252);
    doc.rect(margin, y - 4, pageWidth - margin * 2, 20, 'F');
    doc.setTextColor(120, 120, 140);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.text('Disclaimer: This report is generated by an AI-assisted prototype system developed as', margin + 2, y);
    doc.text('an academic project. It is NOT a substitute for professional medical diagnosis. All results', margin + 2, y + 4);
    doc.text('should be reviewed by a qualified ophthalmologist before clinical decision-making.', margin + 2, y + 8);

    y += 18;

    doc.setTextColor(150, 150, 170);
    doc.setFontSize(7);
    doc.text('PVG\'s COET — BE Information Technology — Hack 2 Ignite 2026', margin, y);
    doc.text('Team: Rohit Dhondage, Yash Tupe, Yash Pethkar, Sahil Adagale | Guide: Prof. S. N. Bhadane', margin, y + 4);

    doc.save(`DR_Staging_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  return {
    generateReport
  };
})();
