# TailorPro Management System

TailorPro is a modern, production-ready ERP system designed specifically for professional tailoring businesses. It features a complete full-stack architecture with a FastAPI backend and a Next.js (App Router) frontend, backed by a PostgreSQL database.

## Architecture

*   **Backend:** FastAPI (Python), SQLAlchemy 2.0, Alembic, PostgreSQL, JWT Authentication.
*   **Frontend:** Next.js (React 19), Tailwind CSS v4, Shadcn UI, TypeScript.
*   **Deployment:** Docker Compose for easy local database provisioning and deployment.

## Features

*   **Authentication & RBAC:** Secure JWT-based login with roles (Super Admin, Manager, Cashier, Measurement Staff, Tailor).
*   **Customer Management:** Track customer profiles, measurements, and order history.
*   **Dynamic Measurements:** Measurement templates adapted for different clothing types (Men, Ladies, Kids) using flexible JSON schemas.
*   **Order Workflow:** Track orders through stages (Confirmed -> Measurement Taken -> Stitching -> Fitting -> Ready -> Delivered).
*   **Invoicing & Payments:** Manage partial payments, advance payments, and auto-calculate balances.
*   **Dashboard & Analytics:** View key performance metrics, daily sales, pending orders, and tailor workloads.

## Getting Started (Local Development)

You can run the entire application locally using Docker Compose (recommended). The compose file defines `db`, `backend`, and `frontend` services.

### Run Entire App with Docker

Start all services (database, backend, frontend):

```bash
docker compose up -d
```

> Note: the frontend app runs in the browser, so API requests should use the host URL `http://localhost:8000`, not Docker service hostnames like `http://backend:8000`.

Run database migrations inside the `backend` container:

```bash
docker compose exec backend bash -c "alembic upgrade head"
```

Seed the database (creates roles and the initial Super Admin user):

```bash
docker compose exec backend bash -c "python seed.py"
```

Open the apps in your browser:

- Backend API: http://localhost:8000
- API docs (Swagger): http://localhost:8000/docs
- Frontend: http://localhost:3000

If you need to rebuild images (for Dockerfile changes) use:

```bash
docker compose up -d --build
```

Stop and remove containers (optionally remove volumes):

```bash
docker compose down
# or to remove volumes as well:
docker compose down -v
```

### Run only specific services

Start only the backend:

```bash
docker compose up -d backend
```

Start only the frontend:

```bash
docker compose up -d frontend
```

### Traditional local development (optional)

If you prefer to run services outside Docker (for development), follow the old manual steps below.

#### Backend (manual)

```bash
cd Backend
python -m venv venv
# Activate venv: `venv\Scripts\activate` on Windows or `source venv/bin/activate` on Mac/Linux
pip install -r requirements.txt
alembic upgrade head
python seed.py
uvicorn app.main:app --reload
```

#### Frontend (manual)

```bash
cd frontend
npm install
npm run dev
```

## Production Deployment
(Instructions for building Docker images and deploying to a cloud provider like AWS/Vercel will go here.)

## Default Login Credentials

- **Email:** admin@tailorpro.com
- **Password:** admin123

Use these credentials to log in to the application.
