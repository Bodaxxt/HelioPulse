# HelioPulse ☀️

> **Zero-Hardware Solar Panel Cleaning Decision Engine**  
> Tailored for Egyptian Commercial & Industrial (C&I) Rooftop PV Plants (50 kWp – 2000 kWp).

---

## 📌 Executive Summary

Egyptian industrial zones (such as **10th of Ramadan City**, **6th of October City**, **Sadat City**, and **Ain Sokhna**) experience harsh desert dust deposition rates ranging from **0.2% to 0.6% per day**. Routine fixed-schedule panel cleaning (e.g., bi-weekly) squanders thousands of liters of treated water and incurs unnecessary OPEX. Conversely, neglected soiling severely erodes plant yield and corporate bottom line.

**HelioPulse** resolves this trade-off using a zero-hardware, physics-driven decision engine. By ingesting Open-Meteo atmospheric telemetry, modeling clean baseline yields via `pvlib`, and tracking dust saturation using the **Kimber Soiling Model**, HelioPulse computes the exact day $t^*$ that minimizes total levelized cleaning OPEX + generation loss.

---

## 🏗️ Full-Stack Monorepo Architecture

```
HelioPulse/
├── app/                              # [Sprint 1] FastAPI Production Backend
│   ├── config.py                     # Configuration, boundaries & physical constants
│   ├── main.py                       # FastAPI application factory, OpenAPI docs, CORS
│   ├── schemas/                      # Pydantic v2 strict schemas
│   │   ├── site.py                   # SiteInput boundary constraints
│   │   └── optimization.py           # Decision responses, scenarios, daily metrics
│   ├── domain/                       # Pure solar physics & soiling models
│   │   ├── solar_physics.py          # Hay-Davies POA, Faiman temperature, PVWatts DC/AC
│   │   └── soiling.py                # Kimber soiling dynamics & rain clearance
│   ├── services/                     # Application services
│   │   ├── weather_service.py        # Open-Meteo REST API & local JSON caching
│   │   ├── physics_engine.py         # pvlib baseline generator & soiling executor
│   │   └── optimizer.py              # 90-day forward economic optimizer & parity checker
│   └── routers/                      # HTTP API routers
│       ├── health.py                 # GET /api/v1/health
│       └── optimization.py           # POST /api/v1/optimize-cleaning
├── frontend/                         # [Sprint 2] Next.js 14 App Router SaaS Frontend
│   ├── app/                          # App router layout & main page
│   │   ├── globals.css               # Tailwind CSS & Glassmorphism theme
│   │   ├── layout.tsx                # Providers and metadata
│   │   └── page.tsx                  # Main SaaS landing & dashboard container
│   ├── components/                   # React components
│   │   ├── Navbar.tsx                # Brand, Egypt grid badge & API health indicator
│   │   ├── HeroSection.tsx           # Value proposition, Egypt stats badges & CTA
│   │   ├── SiteConfigForm.tsx        # Egyptian hub presets & Pydantic-validated sliders
│   │   ├── DecisionDashboard.tsx     # Hero KPI cards & analytics dashboard
│   │   ├── SoilingCurveChart.tsx     # Recharts 90-day soiling vs unmanaged curve
│   │   ├── UncertaintyToggle.tsx     # Low/Base/High dust sensitivity controller
│   │   └── ReportCard.tsx            # WhatsApp/Email plain-language directive & PDF export
│   ├── lib/
│   │   ├── api.ts                    # Axios client connecting to FastAPI backend
│   │   ├── types.ts                  # TypeScript types matching Pydantic schemas
│   │   └── providers.tsx             # TanStack React Query provider
│   ├── tailwind.config.js            # Industrial C&I solar theme
│   └── package.json                  # Next.js 14, Framer Motion, Recharts, Lucide
├── snapshots/                        # 100% reproducible JSON telemetry payloads
└── tests/                            # 22 automated unit & integration tests
```

---

## 🔬 Mathematical Physics & Economic Formulation

### 1. Solar Baseline Yield ($E_{\text{clean}}$)
Using `pvlib`, plane-of-array irradiance ($G_{\text{poa}}$) is computed using the **Hay-Davies** model transposed from direct normal ($DNI$), diffuse ($DHI$), and global horizontal ($GHI$) irradiance components:

$$G_{\text{poa}} = G_{\text{poa,direct}} + G_{\text{poa,diffuse}}$$

Cell operating temperature $T_{\text{cell}}$ is estimated using the **Faiman** thermal model:

$$T_{\text{cell}} = T_{\text{air}} + \frac{G_{\text{poa}}}{u_0 + u_1 \cdot v_{\text{wind}}}$$

Hourly DC generation is determined via **PVWatts**:

$$P_{\text{dc}} = P_{\text{dc0}} \cdot \frac{G_{\text{poa}}}{1000} \cdot \left[1 + \gamma_{\text{pdc}} \cdot (T_{\text{cell}} - 25.0)\right]$$

Hourly AC power $P_{\text{ac}}$ is converted through the inverter model with nominal 96% efficiency, and integrated across 24 hours to obtain clean daily yield $E_{\text{clean}}(t)$ in kWh.

---

### 2. Kimber Soiling Dynamics
Dust builds up each day at rate $s$ (default $0.0035$ = 0.35%/day for Egyptian industrial sites), up to a hard ceiling of 30% ($0.30$):

$$S(t) = \min\left(S(t-1) + s,\; 0.30\right)$$

If daily rainfall $R(t) > 5.0\text{ mm}$, the panels are naturally washed and dust resets:

$$S(t) = 0 \quad \text{if } R(t) > 5.0\text{ mm}$$

Actual daily yield:

$$E_{\text{actual}}(t) = E_{\text{clean}}(t) \cdot \left(1 - S(t)\right)$$

Monetary loss on day $t$:

$$\text{Loss EGP}(t) = \left(E_{\text{clean}}(t) - E_{\text{actual}}(t)\right) \cdot \text{Rate}_{\text{EGP}}$$

---

### 3. Economic Optimization & Closed-Form Parity

To identify the optimal cleaning day $t^* \in \{1, \dots, 90\}$, the optimizer searches for the day that minimizes the levelized cost rate:

$$\text{Cost Rate}(t) = \frac{\text{Cleaning Cost} + \sum_{\tau=1}^{t} \text{Loss EGP}(\tau)}{t}$$

#### Analytical Parity (Wilson Lot-Sizing Parity)
Under steady solar conditions ($\bar{V} = \bar{E}_{\text{clean}} \cdot \text{Rate}_{\text{EGP}}$, constant $s$, zero rain):

$$\text{Cost Rate}(t) = \frac{C_{\text{clean}}}{t} + \frac{\bar{V} \cdot s \cdot t}{2}$$

Differentiating with respect to $t$ and equating to 0 yields the closed-form optimal interval:

$$t^* \approx \sqrt{\frac{2 \times \text{Cleaning Cost}}{\text{Daily Value Loss EGP} \times \text{Soiling Rate}}}$$

Unit test `test_simulation_matches_analytical_parity` verifies that discrete simulation matches this analytical parity to the exact day.

---

### 4. Water Conservation Engine
Egyptian C&I operations traditionally clean panels every 14 days (~6 cleanings per 90-day cycle). HelioPulse recommends cleaning only when economically justified (typically 1 cleaning, or deferred if natural rain occurs).

$$\text{Water per clean (L)} = \text{Panel Area (m}^2\text{)} \times 3.0\text{ L/m}^2$$
$$\text{Water Saved (L)} = \left(\text{Unoptimized Cleanings} - \text{Optimal Cleanings}\right) \times \text{Water per clean}$$

---

## 🚀 Quick Start Guide

### Option A — One-Command Dev Launch (Windows)
```powershell
.\start_dev.ps1
```
Opens backend and frontend in separate terminal windows automatically.

---

### Option B — Manual Dev Setup

#### Step 1: Backend (Terminal 1)
```powershell
# Install dependencies
pip install -r requirements.txt

# Start FastAPI with hot-reload
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
| URL | Description |
|-----|-------------|
| `http://localhost:8000/docs` | Interactive Swagger UI |
| `http://localhost:8000/redoc` | ReDoc documentation |
| `http://localhost:8000/api/v1/health` | Health check |

#### Step 2: Frontend (Terminal 2)
```powershell
cd frontend
npm install        # first time only
npm run dev
```
- Dashboard: `http://localhost:3000`

#### Step 3: Run Unit Tests
```powershell
pytest -v
```
Expected: **22 passed** — physics, Pydantic boundaries, Kimber soiling dynamics, and Wilson analytical parity.

---

### Option C — Docker Compose (Full Stack, Production-like)
```bash
# Build and start both services
docker compose up --build

# Or run in background
docker compose up --build -d

# Stop everything
docker compose down
```
| Service | URL |
|---------|-----|
| Frontend | `http://localhost:3000` |
| Backend API | `http://localhost:8000/docs` |

> **Note:** Weather snapshots are persisted in a named Docker volume (`snapshots`) across container restarts for reproducibility.

---

## 🎨 UI Features (Sprint 2)

1. **Egyptian Industrial Presets:** 1-click loading for 10th of Ramadan, 6th of October, Sadat City, Borg El Arab, and Ain Sokhna.
2. **Interactive Capacity & Geometry Controls:** Sliders for 5.0 to 2000.0 kWp with live panel area auto-derivation ($5.0\text{ m}^2/\text{kWp}$), tilt ($0-60^\circ$), and azimuth ($0-360^\circ$).
3. **Primary KPI Hero Cards:**
   - **Optimal Cleaning Date** with urgency indicator (e.g., "In 18 days" or "Action Immediate").
   - **Net Financial Savings** in Egyptian Pounds (EGP).
   - **Nile Water Conserved** in Liters ($3.0\text{ L/m}^2$ standard).
   - **Wilson Parity Check** verifying mathematical consistency.
4. **Interactive Recharts Curve:** Soiling trajectory with intervention point and comparison against unmanaged 30% saturation ceiling.
5. **Sensitivity Matrix:** Toggle between Low Dust ($0.15\%$), Base Dust ($0.35\%$), and High Dust ($0.50\%$).
6. **Executive Dispatch Center:** 1-click bilingual (English / Arabic) WhatsApp and Email directive generation + simulated PDF report export.
