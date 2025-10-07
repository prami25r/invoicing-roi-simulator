# invoicing-roi-simulator
Lightweight ROI calculator for automated invoicing
# Invoicing ROI Simulator — 3-Hour Assignment

## 📝 Planned Approach & Architecture
This project will be a **single-page web application** with the following structure:

- **Frontend**: Interactive form inputs and live calculation results.
- **Backend**: REST API to handle simulations, scenario CRUD, and report generation.
- **Database**: Stores saved scenarios and simulation results.
- **Hosting**: Local development first, optionally deploy via Vercel/Render.

**Workflow:**
1. User inputs business metrics in the form.
2. Frontend sends data to backend via `/simulate` endpoint.
3. Backend calculates labor cost, automation cost, error savings, ROI, and payback.
4. Results returned to frontend instantly.
5. Users can save/load/delete scenarios and generate an email-gated report.

---

## 💻 Technologies & Frameworks
| Layer | Technology/Framework |
| --- | --- |
| Frontend | React (or Next.js) |
| Backend | Node.js + Express |
| Database | SQLite (or JSON for simplicity) |
| PDF/Report | html-pdf or jsPDF |
| Hosting | Localhost for demo / optional Vercel/Render deployment |

---

## ⚙️ Key Features & Functionality
- **Quick Simulation**: Enter invoice volume, staff, wages, error rate, etc., and get live ROI, savings, and payback.
- **Scenario Management**: Save, load, and delete named scenarios.
- **Report Generation**: Download PDF/HTML report after providing an email.
- **Favorable Output Logic**: Results always favor automation using backend constants.
- **REST API Endpoints**:
  - POST `/simulate` – Run simulation
  - POST `/scenarios` – Save scenario
  - GET `/scenarios` – List scenarios
  - GET `/scenarios/:id` – Retrieve scenario
  - POST `/report/generate` – Generate report

---

## ⏱ Timeline for 3-Hour Assignment
1. **First 15 minutes**: This README + GitHub repo submission.
2. **Next 45 minutes**: Frontend form + live calculation.
3. **Next 45 minutes**: Backend + REST API + scenario CRUD.
4. **Next 45 minutes**: Report generation and email capture.
5. **Final 30 minutes**: Testing, polishing UI, README updates.

---

**Repository Link:** (https://github.com/<prami25r>/invoicing-roi-simulator)

