# NITA CMMS — RT Knits Maintenance Portal

NITA (Next-generation Intelligent Triage Assistant) is a modern, responsive, and secure CMMS solution replacing legacy FileMaker coordinator bottlenecks with a highly scalable, automated AI routing assistant.

This repository hosts the secure Actix-web server gateway (built in **Rust**) and the interactive portal frontend.

---

## Solution Architecture

```
[ Frontend Portal ] → Hosted on Vercel (serves from public/)
       ↓ (Standard REST API Fetch Requests)
[ Database Layer ] → Hosted on Supabase (PostgreSQL with PostgREST REST API)
       ↓ (Database Webhooks on task_request INSERT/UPDATE events)
[ AI & Automation ] → Orchestrated on n8n (Creol translation, NER slots, WhatsApp dispatch)
```

* **Vercel**: Serves the clean-URL portal instantly from `public/`.
* **Supabase**: Handles relational database hosting, connection pools, and security policies out-of-the-box.
* **n8n**: Integrates LLMs (Gemini/GPT) to triage incoming Mauritian Creole/English voice messages and manage the Twilio/WhatsApp notifications.

---

## Security Features

* **Environment Variable Isolation**: JWT secrets, server port, and CORS origins loaded from `.env` (never hardcoded).
* **Static File Isolation**: Web assets served exclusively from `public/` — source code, `.git/`, and config files are not exposed over HTTP.
* **Rate Limiting**: Login endpoint limited to 5 attempts per minute per IP.
* **JWT Authentication**: Tokens signed with HMAC-SHA256, configurable secret via `JWT_SECRET`.
* **OWASP Security Headers**: CSP, HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, X-XSS-Protection, Permissions-Policy, Referrer-Policy.
* **Input Validation**: E.164 phone format and SHA-256 hash length validated on login.
* **Role-Based Access**: Coordinator, Operator, and Technician roles with PIN-based authentication.

---

## Project Repository Structure

```
RT_Knits/
├── public/              ← Web assets served by Rust server & Vercel
│   ├── index.html       ← Main dashboard portal interface
│   ├── app.js           ← Core application logic
│   ├── config.js        ← Toggle switch and API credential bindings
│   └── styles.css       ← Modern styling
├── src/
│   └── main.rs          ← Rust Actix secure server gateway
├── wasm-security/       ← WASM security module (SHA-256, AES-GCM)
├── Cargo.toml           ← Rust package manifest
├── .env                 ← Server configuration (NOT committed to git)
├── .env.example         ← Template for .env
├── .gitignore           ← Excludes secrets, build artifacts
├── vercel.json          ← Vercel deployment config
└── supabase_schema.sql  ← Database schema and seed data
```

---

## Getting Started

### 1. Configure Environment

```bash
cp .env.example .env
# Edit .env and set a secure JWT_SECRET:
# JWT_SECRET=$(openssl rand -hex 32)
```

### 2. Run the Portal Locally (Rust Server)

```bash
cargo run --release
```

Open **`http://localhost:8080`** in your browser.

### 3. Connect to Your Supabase Instance

1. Log into your Supabase Dashboard and run the contents of `supabase_schema.sql` in the **SQL Editor**.
2. Open `public/config.js` in your editor.
3. Change `USE_REAL_SUPABASE` to `true`.
4. Copy your **Project URL** and **Anon API Key** from Supabase settings and paste them into `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
5. Reload the portal. It will query and write directly to your Postgres database in real-time.

### 4. Health Check

```bash
curl http://localhost:8080/api/health
# Returns: {"status":"healthy","service":"nita-cmms-secure-server","version":"0.2.0",...}
```

---

## Default Test Credentials

| Role | Phone | PIN |
|------|-------|-----|
| Coordinator | +23054737266 | 1234 |
| Operator | +23052000101 | 1111 |
| Technician | +23057551012 | 2222 |
