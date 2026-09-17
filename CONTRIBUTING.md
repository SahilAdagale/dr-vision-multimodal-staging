# Contributing to DR Vision

Thank you for your interest in contributing to **DR Vision — Multimodal Deep Learning System for Diabetic Retinopathy Staging**! 

This guide outlines our development workflow, coding standards, and contribution process.

---

## 📋 Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Branching & Workflow](#branching--workflow)
4. [Commit Conventions](#commit-conventions)
5. [Code Standards & Style](#code-standards--style)
6. [Testing & Verification](#testing--verification)
7. [Submitting a Pull Request](#submitting-a-pull-request)

---

## 📜 Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free environment. All contributors and maintainers are expected to treat everyone with respect, professionalism, and kindness.

---

## 🚀 Getting Started

### Local Setup
1. **Fork** and **clone** the repository:
   ```bash
   git clone https://github.com/SahilAdagale/dr-vision-multimodal-staging.git
   cd dr-vision-multimodal-staging
   ```
2. **Open the project**:
   - Double-click `index.html` or open it with your preferred browser.
   - For a live-reloading local server, you can use Python's built-in HTTP server or VS Code Live Server:
     ```bash
     # Optional: Start local server
     python -m http.server 8000
     # or npx serve .
     ```

---

## 🌿 Branching & Workflow

- `main` is our production-ready branch.
- Create feature or fix branches following this convention:
  - `feat/feature-name` (e.g. `feat/patient-history`)
  - `fix/bug-name` (e.g. `fix/shap-axis-alignment`)
  - `docs/doc-update` (e.g. `docs/api-clarification`)
  - `refactor/component-name`

---

## 💬 Commit Conventions

We enforce [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) to keep our git history readable and automated tooling friendly:

- `feat:` A new feature or capability
- `fix:` A bug fix
- `docs:` Documentation-only changes
- `style:` Formatting, whitespace, visual CSS tweaks (no logic change)
- `refactor:` Code restructuring without changing behavior
- `perf:` Performance improvements
- `test:` Adding or updating tests
- `ci:` Continuous integration and automation workflows
- `chore:` Maintenance tasks, dependency updates

**Examples:**
- `feat(export): add CSV and JSON data export capabilities`
- `fix(gradcam): fix canvas coordinate offset on high-DPI displays`
- `docs(readme): add installation instructions for mobile preview`

---

## 💻 Code Standards & Style

### JavaScript
- Use modern ES6+ features (`const`, `let`, arrow functions, template literals).
- Keep modules focused and avoid tight coupling.
- Add descriptive JSDoc comments to all public functions and data transforms.
- Ensure strict error handling for DOM lookups and file parsing.

### CSS
- Follow the existing design token architecture (`--bg-primary`, `--accent-primary`, etc.).
- Maintain responsive breakpoints (`max-width: 1024px`, `max-width: 768px`, `max-width: 480px`).
- Use CSS transitions smoothly (recommended: `cubic-bezier(0.4, 0, 0.2, 1)`).

### HTML
- Use semantic HTML5 tags (`<nav>`, `<section>`, `<article>`, `<main>`, `<footer>`).
- Ensure all interactive elements have accessible names and labels.

---

## 🧪 Testing & Verification

Before submitting changes:
1. Open `tests/test-runner.html` in your browser and confirm that all unit tests pass.
2. Run the validation script:
   ```powershell
   .\scripts\validate.ps1
   ```
3. Test key user journeys in `index.html`:
   - Preset image selection and analysis execution
   - Image upload (JPEG/PNG)
   - Explainability rendering (Grad-CAM canvas and SHAP waterfall chart)
   - PDF, JSON, and CSV export functionality

---

## 📥 Submitting a Pull Request

1. Push your branch to your fork:
   ```bash
   git push origin feat/your-feature-name
   ```
2. Open a Pull Request targeting `main`.
3. Fill out the PR description template with:
   - Summary of changes
   - Motivation and context
   - Screenshots/recordings (for UI changes)
   - Verification checklist completed
4. Await review and address any reviewer feedback promptly.

Thank you for helping improve clinical AI accessibility! 👁️
