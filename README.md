# CRM / ERP System

A full-stack CRM and ERP application designed for paper bag manufacturing. It handles sales pipelines, order workflows, production status, inventory alerts, invoicing, and employee attendance tracking.

## Tech Stack
- **Frontend**: ReactJS (Vite)
- **Backend**: FastAPI (Python), PostgreSQL, JWT Auth

## Project Structure
- `CRM-FRONTEND/`: React web interface.
- `CRM_BACKEND/`: FastAPI server, database logic, and API endpoints.

## Local Setup

### Prerequisites
- Node.js (v18+)
- Python 3.10+

### Backend Setup (Windows)

1. Navigate to the backend directory:
   ```bash
   cd CRM_BACKEND
   ```

2. Environment variables:
   The original `.env` file is already included in the `CRM_BACKEND/` directory. No additional setup is required.


3. Install dependencies directly:
   ```bash
   pip3 install -r requirements.txt
   ```

4. Run the backend server:
   ```bash
   python main.py
   ```
   The API server will run at `http://localhost:8000`.

### Frontend Setup (Windows)

1. Navigate to the frontend directory:
   ```bash
   cd ../CRM-FRONTEND
   ```

2. Install npm packages:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   The application will run at `http://localhost:5173`.
