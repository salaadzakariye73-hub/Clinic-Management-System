# CarePoint Clinic Management System

A full-stack starter project for patient registration and clinic queue management.

## Technology
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js + Express REST API
- Database: SQLite (created automatically in `data/clinic.db`)

## Run locally
1. Install Node.js (18+ recommended).
2. Open a terminal in this project folder.
3. Run `npm install`.
4. Run `npm start`.
5. Open `http://localhost:3000` in your browser.

## Features
- Register patients and generate daily queue numbers (T001, T002...).
- View today's patients and queue.
- Call the next waiting patient / move a patient to consultation.
- Mark a consultation completed.
- Dashboard counters update from the database.

## API
- `GET /api/patients`
- `POST /api/patients`
- `PATCH /api/patients/:id/status`
- `GET /api/stats`

This is a learning/demo starter, not a production clinical record system. Add authentication, role permissions, audit logs, backups, validation, and privacy/security controls before real clinic use. It does not include diagnosis or prescription management.
