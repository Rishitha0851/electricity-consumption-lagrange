# Capstone Project Deployment Guide

## Electricity Consumption Estimation Using Lagrange Interpolation

This guide explains how to deploy the application to **Render (Backend API)** and **Vercel (Frontend Dashboard)** to generate a permanent, public HTTPS link that can be opened and demonstrated on any device without installing Python, Node.js, or local dependencies.

---

## Architecture Overview

```
                               ┌────────────────────────────────────────────────────────┐
                               │                    Faculty / User                      │
                               │                Web Browser (Mobile/PC)                 │
                               └───────────────────────────┬────────────────────────────┘
                                                           │
                                                           ▼ HTTPS
                               ┌────────────────────────────────────────────────────────┐
                               │              Vercel Frontend (Production)              │
                               │      React 19 + TypeScript + Vite + Tailwind CSS       │
                               │   https://electricity-consumption-lagrange.vercel.app  │
                               └───────────────────────────┬────────────────────────────┘
                                                           │
                                                           ▼ REST API (CORS enabled)
                               ┌────────────────────────────────────────────────────────┐
                               │               Render Backend (Production)              │
                               │       FastAPI + Uvicorn + NumPy + Pandas + SQLite      │
                               │  https://electricity-lagrange-api.onrender.com/api     │
                               └────────────────────────────────────────────────────────┘
```

---

## Step 1: Push Code to Your GitHub Repository

1. Open PowerShell or Terminal in the project root:
   ```bash
   cd C:\Users\rishi\.gemini\antigravity\scratch\electricity-consumption-lagrange
   ```

2. Create a new repository on your GitHub account (e.g. `electricity-consumption-lagrange`).

3. Link the local git repository and push:
   ```bash
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/electricity-consumption-lagrange.git
   git branch -M main
   git push -u origin main
   ```

---

## Step 2: Deploy Backend to Render (Free Tier)

1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** → **Web Service**.
2. Connect your GitHub repository: `electricity-consumption-lagrange`.
3. Fill in the following deployment settings:
   - **Name**: `electricity-lagrange-api`
   - **Region**: Closest to your location (e.g. Frankfurt, Oregon, Singapore)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free`

4. Click **Advanced** and add the following **Environment Variables**:
   | Key | Value | Notes |
   |---|---|---|
   | `PYTHON_VERSION` | `3.10.11` | Required for stability |
   | `ALLOWED_ORIGINS` | `*` | Or your Vercel URL once deployed |

5. Under **Health Check Path**, enter:
   ```
   /api/health
   ```

6. Click **Create Web Service**.
7. Once deployed (approx. 2–3 minutes), copy your Render public URL:
   `https://electricity-lagrange-api.onrender.com`

---

## Step 3: Deploy Frontend to Vercel (Free Tier)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New...** → **Project**.
2. Import your GitHub repository: `electricity-consumption-lagrange`.
3. In the project configuration:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. Expand the **Environment Variables** section and add:
   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://electricity-lagrange-api.onrender.com` *(use your actual Render backend URL from Step 2)* |

5. Click **Deploy**.
6. Within 60 seconds, your site will be live at:
   `https://electricity-consumption-lagrange.vercel.app` (or custom name).

---

## Step 4: Verification Checklist (Faculty Demonstration)

Once both services are deployed, perform the following verification workflow:

1. **Verify Backend Health**:
   - Open `https://<your-render-url>/api/health`
   - Response must be: `{"status":"online","service":"Electricity Consumption Estimation Engine","version":"1.0.0"}`
   - Open `https://<your-render-url>/docs` to view the interactive FastAPI Swagger documentation.

2. **Verify Frontend Loading**:
   - Open `https://<your-vercel-url>` in browser.
   - Status badge in top right should show **Backend: Online**.

3. **Demonstrate Module 1 (Data Collection & Preparation)**:
   - Select **Residential Smart Meter Profile** (24 records, unit: `kWh`).
   - Click **Run Data Validation**: observe checks for uniqueness, sorting, missing values, duplicates, and physical bounds.
   - Click **Clean & Prepare Dataset**: observe status update to `Ready for Estimation`.
   - Click **Export Cleaned CSV** to test file download.

4. **Demonstrate Module 2 (Lagrange Estimation)**:
   - Click **Chebyshev Nodes** to select 6 optimal nodes (degree $n = 5$).
   - Enter target coordinate $x^* = 18.5$ (Evening Peak Transition, 6:30 PM).
   - Click **Estimate Consumption**:
     - View exact calculated value ($P(18.5) \approx 2.858\text{ kWh}$).
     - View basis polynomial decomposition $\ell_i(x^*)$ and weighted contributions $y_i \cdot \ell_i(x^*)$.
     - View instantaneous ramp rate ($P'(18.5) \approx +0.364\text{ kWh/h}$) and total domain energy.

5. **Demonstrate Visualizations**:
   - Switch to **Continuous Curve View**: inspect 100-point continuous polynomial trajectory with marked support nodes and target estimate.
   - Switch to **Actual vs Estimated**: observe holdout comparison.
   - Switch to **Residuals**: inspect error distribution and zero-line variance.

6. **Demonstrate Validation Studio**:
   - View Holdout Validation metrics: MAE, RMSE, MAPE, and $R^2$ determination coefficient.
   - Compare Uniform vs Chebyshev node distributions to discuss Runge's phenomenon prevention.

7. **Demonstrate Estimation History & Capstone Report**:
   - Review audit trail in **History** view.
   - Open **Capstone Report** and click **Export PDF / Print** to demonstrate academic presentation deliverable.

---

## Instant Public Tunneling Alternative (Zero Cloud Setup)

If you need an immediate public link right now without pushing to GitHub or signing into Vercel/Render:

1. In PowerShell window 1 (Backend):
   ```bash
   cd C:\Users\rishi\.gemini\antigravity\scratch\electricity-consumption-lagrange\backend
   python -m uvicorn main:app --host 127.0.0.1 --port 8000
   ```

2. In PowerShell window 2 (Frontend):
   ```bash
   cd C:\Users\rishi\.gemini\antigravity\scratch\electricity-consumption-lagrange\frontend
   npm run dev -- --host
   ```

3. In PowerShell window 3 (Public Tunnel):
   ```bash
   npx ngrok http 5173
   # OR
   npx localtunnel --port 5173
   ```
   The generated URL (e.g. `https://xxxx.ngrok-free.app` or `https://xxxx.loca.lt`) can be accessed from any phone, laptop, or projector.
