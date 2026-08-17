# 🏥 DokitaAI – Full-Stack Medical Triage Platform & WhatsApp Integration

DokitaAI is a modern, full-stack, clinical-grade medical triage and telehealth assistance platform. It empowers patients with evidence-based symptom analysis, emergency triage ratings, live hospital directory searches, doctor-ready PDF export summaries, and automated 24/7 WhatsApp consultation.

---

## 🌟 Key Features

1. **Intelligent Clinical Medical Triage (`/chat`)**:
   - Classifies symptoms dynamically into **EMERGENCY**, **URGENT**, **ROUTINE**, or **SELF-CARE**.
   - Identifies clinical red flag warning signs requiring immediate emergency room dispatch.
   - Embeds peer-reviewed citations to WHO, CDC, Mayo Clinic, and NHS.
   - Features top-pinned statutory medical disclaimer banners and interactive quick symptom chips.
2. **Export for Doctor (PDF Consultation Briefing)**:
   - One-click generated PDF report containing patient info, clinical symptoms, AI triage analysis, cited references, physician sign-off stamp box, and statutory disclaimer.
3. **Verified 24/7 Hospital Directory (`/hospitals`)**:
   - Search by hospital name, city, state, and 24/7 emergency room filter.
   - Emergency hotline callout banners (112, 767, 911) with one-click direct dialing.
4. **WhatsApp Meta Cloud API Integration (`/api/webhook/whatsapp`)**:
   - Automated webhook handshake verification (`GET`) and real-time medical triage response dispatch (`POST`).
5. **Role-Based Access Control (RBAC)**:
   - Strict separation between `'user'` and `'admin'` roles.
   - Admins can manage hospital directory entries (Add/Delete) and review patient feedback logs.
   - Non-admin users are strictly rejected with HTTP `403 Forbidden` on protected admin endpoints.
6. **Strict Zero-Hardcoding Rule**:
   - All roles, JWT secrets, AI model endpoints, database URIs, WhatsApp webhook credentials, and environment parameters are loaded dynamically from `process.env`.

---

## 🛠️ Technology Stack

* **Frontend (`/client`)**: React 18, Vite, TypeScript, Tailwind CSS, Lucide React, Axios, jsPDF, jsPDF-autotable.
* **Backend (`/server`)**: Node.js, Express, MongoDB (Mongoose), JSON Web Tokens (JWT), bcryptjs, CORS, Dotenv, Express-Rate-Limit.

---

## ⚙️ Environment Configuration

### Backend Configuration (`server/.env`)

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/dokita_ai
JWT_SECRET=dokita_medical_jwt_secret_key_change_in_production_2026
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173

# Dynamic AI Configuration
AI_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

# WhatsApp Meta Cloud API Credentials
WHATSAPP_VERIFY_TOKEN=dokita_whatsapp_verify_token_2026
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_API_URL=https://graph.facebook.com/v20.0

# Initial Admin Credentials (Optional Seed)
ADMIN_INIT_EMAIL=admin@dokita.ai
ADMIN_INIT_PASSWORD=AdminSecure123!
ADMIN_REGISTRATION_KEY=dokita_master_admin_secret_key_2026
```

### Frontend Configuration (`client/.env`)

```env
VITE_API_BASE_URL=/api
VITE_WHATSAPP_NUMBER=+2348003654824
VITE_APP_NAME=DokitaAI
```

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
# Install root, backend, and frontend dependencies
npm install --prefix server
npm install --prefix client
```

### 2. Run Test Suite
Run the automated verification suite to validate all 12 backend endpoints, RBAC permissions, and triage responses:
```bash
npm run test:api
```

### 3. Run Development Servers
```bash
# Run backend (Port 5000)
npm run dev:server

# Run frontend (Port 5173)
npm run dev:client
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📋 API Endpoints

### Authentication (`/api/auth`)
* `POST /api/auth/register` — Register a new patient (role: `user`, zero OTP).
* `POST /api/auth/login` — Login and receive signed JWT.
* `GET /api/auth/me` — Protected profile endpoint.

### Medical Triage (`/api/chat`)
* `POST /api/chat/ask` — Submit symptoms for dynamic AI medical triage, urgency assessment, and citations.
* `GET /api/chat/sessions` — Retrieve user session history.

### Hospital Directory (`/api/hospitals`)
* `GET /api/hospitals` — Public directory with `?city=`, `?state=`, and `?is24Hours=` filters.
* `POST /api/hospitals` — Add new hospital entry (**Admin Only: HTTP 403 for standard users**).
* `DELETE /api/hospitals/:id` — Delete hospital record (**Admin Only**).

### Feedback & Ratings (`/api/feedback`)
* `POST /api/feedback` — Submit 1–5 star patient feedback.
* `GET /api/feedback` — View all feedback logs (**Admin Only**).

### WhatsApp Webhook (`/api/webhook`)
* `GET /api/webhook/whatsapp` — Meta Cloud API verification handshake.
* `POST /api/webhook/whatsapp` — Ingest inbound patient messages and dispatch triage responses.

---

## 📄 Medical Disclaimer
> DokitaAI provides clinical information for educational and preliminary triage guidance only. It is not a substitute for professional medical diagnosis, personalized treatment, or emergency care. In acute emergencies, always call **112 / 767 / 911** or visit the nearest emergency room.
