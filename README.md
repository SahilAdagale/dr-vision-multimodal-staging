# DR Vision — Multimodal Deep Learning System for Diabetic Retinopathy Staging

![License](https://img.shields.io/badge/License-Academic-blue)
![Status](https://img.shields.io/badge/Status-Prototype-orange)
![Hackathon](https://img.shields.io/badge/Hack%202%20Ignite-2026-green)

## 🔬 Overview

A **Multimodal Deep Learning System** that fuses retinal fundus images with patient clinical data (age, diabetes duration, blood pressure, HbA1c, and related risk factors) to stage Diabetic Retinopathy severity across **five clinically recognised classes**:

| Stage | Name | Risk Level |
|-------|------|------------|
| 0 | No DR | None |
| 1 | Mild NPDR | Low |
| 2 | Moderate NPDR | Moderate |
| 3 | Severe NPDR | High |
| 4 | Proliferative DR | Very High |

### Key Features

- **Multimodal Fusion**: Combines CNN-based image encoding (ResNet18/EfficientNet-B0) with tabular clinical feature encoding through a fully-connected fusion layer
- **Clinical Deferral Mechanism**: Confidence-based system trained via contrastive learning to route low-quality or uncertain cases to ophthalmologists instead of returning silent misdiagnoses
- **Explainability**: Grad-CAM heatmaps on fundus images + SHAP feature attributions on clinical data
- **Interactive Dashboard**: Web-based interface for image upload, clinical data input, result visualisation, and PDF report download
- **Image-Only vs. Multimodal Comparison**: Toggle between single-modality and fused predictions to demonstrate fusion benefits

## 👥 Team

| Name | Role |
|------|------|
| **Rohit Dhondage** | Team Lead / ML Pipeline |
| **Yash Tupe** | Backend / Data Processing |
| **Yash Pethkar** | Frontend / Dashboard |
| **Sahil Adagale** | Explainability / Deferral |

**Guide**: Prof. S. N. Bhadane  
**College**: PVG's College of Engineering & Shrikrushna S. Dhamankar Institute of Management, Nashik  
**Course**: BE Information Technology (Final Year 2026-27)

## 🚀 Getting Started

### Prerequisites
- Any modern web browser (Chrome, Firefox, Edge)
- No additional installations required

### Running the Demo
1. Clone this repository
2. Open `index.html` in your browser
3. Select a sample fundus image or upload your own
4. Enter patient clinical data (or use quick-fill presets)
5. Click "Run Multimodal Analysis"

```bash
# Clone the repository
git clone <repository-url>

# Open in browser (or just double-click index.html)
start index.html
```

## 📁 Project Structure

```
├── index.html              # Main dashboard page
├── css/
│   └── styles.css          # Design system & styling
├── js/
│   ├── app.js              # Main application controller
│   ├── simulator.js        # ML pipeline simulation logic
│   ├── gradcam.js          # Grad-CAM heatmap renderer (Canvas)
│   ├── shap.js             # SHAP waterfall chart renderer
│   └── report.js           # PDF report generator (jsPDF)
├── assets/
│   └── images/             # Sample fundus images
└── README.md
```

## 🧪 Technology Stack

| Component | Technology |
|-----------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Styling | Custom CSS with glassmorphism, animations |
| Heatmaps | HTML5 Canvas API |
| Charts | Custom SVG/DOM rendering |
| PDF Reports | jsPDF (CDN) |
| Typography | Google Fonts (Inter, Outfit) |

## 📊 How It Works

1. **Image Encoder**: A CNN (ResNet18/EfficientNet-B0) processes the retinal fundus image to extract a feature embedding
2. **Tabular Encoder**: A feed-forward neural network processes clinical data (age, diabetes duration, BP, HbA1c, BMI, cholesterol, etc.)
3. **Multimodal Fusion**: Both embeddings are concatenated and passed through a fully-connected fusion layer
4. **DR Classifier**: Outputs a 5-class probability distribution over DR severity stages
5. **Deferral System**: A contrastive-learning-based quality assessor evaluates image reliability; cases below the confidence threshold are flagged for mandatory clinician review
6. **Explainability**: Grad-CAM heatmaps show which image regions activated the model; SHAP values show each clinical feature's contribution to the prediction

## ⚠️ AI Disclosure

> **As required by Hack 2 Ignite 2026 rules**: This project was developed with AI coding assistance for code generation, UI design, and documentation. All architectural decisions, clinical logic, and system design were specified by the team. The AI tools were used as a development accelerator, not as the sole creator.

## 📚 References

1. Gulshan et al. (JAMA, 2016) — Deep learning for DR detection
2. Gargeya & Leng (Ophthalmology, 2017) — Automated DR identification
3. Ting et al. (JAMA, 2017) — DR detection across multiethnic populations
4. Dai et al. (Nature Communications, 2021) — DR detection across disease spectrum
5. Li et al. (Computers in Biology and Medicine, 2024) — Multimodal fusion survey
6. She & Spivakovsky (arXiv, 2025) — MultiRetNet multimodal DR system
7. Zedadra et al. (IEEE Access, 2025) — Graph-aware multimodal DR
8. Beede et al. (CHI, 2020) — Human-centered evaluation of DR screening

## ⚖️ Disclaimer

This is an academic prototype and is **NOT** intended for clinical use. All results should be reviewed by a qualified ophthalmologist before any clinical decision-making. The system is designed as a screening aid, not a replacement for professional medical diagnosis.

---

*Hack 2 Ignite 2026 | GH RAISONI College | September 16-18, 2026*
