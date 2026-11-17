# Electricity Consumption Analytics & Lagrange Estimation Dashboard
### Academic Capstone Project Demonstration Platform

An end-to-end full-stack web application designed for electricity load curve numerical modeling, continuous power demand estimation, rate-of-change analytics, and validation using the **Lagrange Interpolating Polynomial** method.

---

## ⚡ Capstone Project Highlights & Architecture

### **1. Professional Main Dashboard**
- **Dashboard Heading**: `Electricity Consumption Analytics`
- **Subtitle**: `An intelligent electricity consumption estimation system powered by Lagrange Polynomial Interpolation.`
- **6 Dynamic Live KPI Cards** (powered by real backend SQLite telemetry):
  1. **Total Data Records** (telemetry points count)
  2. **Average Electricity Consumption** (mean demand)
  3. **Maximum Consumption** (peak observed demand)
  4. **Minimum Consumption** (base load level)
  5. **Estimated Consumption** (dynamic $P(x^*)$ calculation)
  6. **Data Validation Status** (automated diagnostic health check)

---

### **2. Module 1: Electricity Consumption Data Collection and Preparation**
- **5-Stage Visual Workflow**:
  $$\text{Data Collection} \longrightarrow \text{Data Validation} \longrightarrow \text{Data Cleaning} \longrightarrow \text{Data Preparation} \longrightarrow \text{Ready for Estimation}$$
- **Data Ingestion**: Upload custom CSV/TXT smart meter files with flexible column detection or create records manually.
- **Data Diagnostics Studio**:
  - Checks coordinate uniqueness ($x_i \neq x_j$ required for non-zero Lagrange denominators)
  - Chronological monotonicity verification
  - Non-negativity check & outlier detection
- **Automated Data Cleaning**:
  - 1-click **Clean & Auto-Fix Dataset** (deduplicates coordinates and orders chronologically)
  - 1-click **Sort Chronologically**
- **Support Node Selector**:
  - Interactive per-record inclusion checkboxes
  - *Uniform Node Spacing* (e.g. 5, 7 nodes)
  - *Chebyshev-spaced Node Optimization*: Places nodes denser at interval boundaries using Chebyshev roots:
    $$x_k = \frac{a+b}{2} + \frac{b-a}{2} \cos\left(\frac{2k-1}{2n}\pi\right)$$
    to mitigate Runge's boundary oscillation.
- **CRUD Operations & Export**: In-line record editing, deletion, and one-click CSV export.

---

### **3. Module 2: Electricity Consumption Estimation and Visualization**
- **Lagrange Numerical Engine**:
  - Direct calculation of the unique degree $n$ polynomial:
    $$P(x) = \sum_{i=0}^n y_i L_i(x), \quad L_i(x) = \prod_{j \neq i, j=0}^n \frac{x - x_j}{x_i - x_j}$$
  - Numerically stable **Barycentric Lagrange evaluation** for dense curve generation.
  - **Instantaneous Ramp Rate $P'(x)$**: Analytical first derivative of the polynomial evaluating grid load surge or shed rate in $\text{kW/h}$.
  - **Cumulative Energy Integration $\int P(x) dx$**: Composite Simpson's quadrature computing total energy throughput ($\text{kWh}$).
- **Runge's Phenomenon Detector & Mitigation**:
  - Dynamic alert banner when high degree ($n \ge 8$) or extrapolation divergence occurs.
  - **Piecewise Local Lagrange Mode**: Local sliding-window interpolation immune to global boundary oscillations.
- **Step-by-Step Mathematical Decomposition Table**:
  - Displays $i$, $(x_i, y_i)$, numerator $\prod (x^* - x_j)$, denominator $\prod (x_i - x_j)$, basis value $L_i(x^*)$, and weighted contribution $y_i \cdot L_i(x^*)$ with percentage contribution bars.
- **Persistence & Audit Trail**:
  - Logs estimation runs, parameters, and results into SQLite database with custom notes.

---

### **4. Multi-Dimensional Interactive Visualization Studio**
5 dedicated analytical views:
- **View A — Electricity Consumption Trend**: Temporal line chart of recorded demand.
- **View B — Continuous Lagrange Interpolation Curve**: Multi-series plot featuring original points, highlighted support nodes, continuous polynomial line, target estimate marker $(x^*, P(x^*))$, and toggleable basis curves $L_i(x)$.
- **View C — Actual vs. Estimated Comparison**: Comparative dual line plot at all observed timestamps.
- **View D — Residual Analysis**: Residual error bar chart ($y_i - \hat{y}_i$).
- **View E — Consumption Distribution**: Frequency histogram binning electricity consumption into load clusters.

---

### **5. Model Verification & Holdout Validation Studio**
- **Holdout Cross-Validation**: Splits data into training support nodes and holdout test points (10% to 50% ratio).
- **Residual Metrics**: Mean Absolute Error (MAE), Root Mean Squared Error (RMSE), Mean Absolute Percentage Error (MAPE with robust zero handling), and $R^2$ Goodness-of-Fit.
- **Residual Inspection Table**: Compares ground truth against interpolated values at each unobserved test hour.

---

### **6. Capstone Live Demonstration Mode (10 Guided Steps)**
Specifically designed for academic evaluation in front of faculty members:
1. **STEP 1**: Select a sample electricity consumption dataset.
2. **STEP 2**: Display original records and dataset statistics.
3. **STEP 3**: Perform automated data validation and cleaning.
4. **STEP 4**: Select interpolation support nodes (Chebyshev / Uniform).
5. **STEP 5**: Enter target coordinate $x^*$ for electricity consumption estimation.
6. **STEP 6**: Execute Lagrange numerical interpolation.
7. **STEP 7**: Display the step-by-step mathematical calculation.
8. **STEP 8**: Display the continuous interpolation curve and estimated load.
9. **STEP 9**: Run holdout cross-validation and review accuracy metrics.
10. **STEP 10**: Generate the final capstone project summary report.

---

### **7. Standardized Sample Profiles & Measurement Units**
All datasets maintain strict unit integrity without mixing:
- **Residential Smart Meter Profile**: Measured in **kWh** (energy consumption).
- **Commercial Office Building Profile**: Measured in **kW** (power demand).
- **Solar Microgrid Profile (Duck Curve)**: Measured in **kW** (net load).
- **Annual Substation Demand Profile**: Measured in **MWh** (industrial throughput).

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Recharts, Lucide React icons
- **Backend**: Python 3.10+, FastAPI, NumPy, Pandas, Pydantic, SQLite3
- **Theme**: Professional clean light theme with white and light blue backgrounds, navy text, cyan/blue accents, and rounded cards.

---

## 🚀 How to Run the Application

### 1. Launching Both Backend and Frontend Together:
From the project root:
```powershell
cd "C:\Users\rishi\.gemini\antigravity\scratch\electricity-consumption-lagrange"
python run_app.py
```
This automatically starts:
- **FastAPI Backend**: `http://127.0.0.1:8000` (Interactive Swagger docs: `http://127.0.0.1:8000/docs`)
- **React Frontend**: `http://localhost:5173`

### 2. Running Automated Verification Test Suite:
```powershell
cd "C:\Users\rishi\.gemini\antigravity\scratch\electricity-consumption-lagrange\backend"
python test_capstone_flow.py
```
All 16 steps pass with 100% verification across Residential, Commercial, and Substation profiles.
