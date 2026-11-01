# Clinic Management System

Full-stack system for running a clinic: patients, doctors, appointments, a live queue, and
automatic **SMS / WhatsApp** confirmations (Twilio).

| Layer    | Tech                                                     |
| -------- | -------------------------------------------------------- |
| Frontend | React 18, Vite, Tailwind CSS (responsive), React Router  |
| Backend  | Node.js, Express, Mongoose                               |
| Database | MongoDB                                                  |
| Auth     | JWT + role-based access (admin, receptionist, doctor, patient) |
| Messages | Twilio SMS and/or WhatsApp                               |

## Folder structure

```
clinic-management-system
├── backend
│   ├── controllers   authController, patientController, doctorController,
│   │                 appointmentController (queue logic), notificationController
│   ├── middleware    auth.js  (protect + authorize roles)
│   ├── models        User, Patient, Doctor, Appointment, Counter
│   ├── routes        auth, patients, doctors, appointments, notifications
│   ├── utils         smsService.js (Twilio SMS/WhatsApp), dates.js, seed.js, asyncHandler.js
│   ├── server.js
│   └── package.json
└── frontend
    ├── src
    │   ├── components  Navbar, Sidebar, Layout, ProtectedRoute, QueueWidget,
    │   │               BookingForm, BookingSuccess, StatusBadge
    │   ├── context     AuthContext.jsx
    │   ├── pages       Login, AdminDashboard, DoctorDashboard, PatientPortal
    │   ├── api.js      App.jsx      index.jsx      index.css
    └── package.json
```

## Run it

Requirements: Node.js 18+, MongoDB running locally (or a MongoDB Atlas URI).
Quick local MongoDB: `docker run -d -p 27017:27017 --name clinic-mongo mongo:7`

```bash
# 1) Backend
cd backend
cp .env.example .env        # then set JWT_SECRET (and MONGO_URI if not local)
npm install
npm run seed                # optional: demo users (see below)
npm run dev                 # http://localhost:5000

# 2) Frontend (new terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

### Demo logins (after `npm run seed`)

| Role         | Email                 | Password        |
| ------------ | --------------------- | --------------- |
| Admin        | admin@clinic.com      | Admin@123       |
| Receptionist | reception@clinic.com  | Reception@123   |
| Doctor       | doctor@clinic.com     | Doctor@123      |
| Patient      | patient@clinic.com    | Patient@123     |

Change these passwords before any real use. New patients can also self-register on the login page.

## SMS / WhatsApp notifications

`backend/utils/smsService.js` sends a message automatically when:

| Event                                  | Message                                   |
| -------------------------------------- | ----------------------------------------- |
| Appointment booked / queue ticket taken | Queue number, doctor, date and time       |
| Doctor calls the patient               | "It is your turn, go to room X"           |
| The patient behind them                | "You are next"                            |
| Staff cancels an appointment           | Cancellation notice                       |

**Simulation mode:** while `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` are empty, nothing is
sent. Messages are printed in the server console and shown as "Tijaabo" in the UI, so you can
test the whole flow for free.

**Going live:**
1. Create a Twilio account; copy the Account SID and Auth Token into `backend/.env`.
2. SMS: buy/verify a Twilio number and set `TWILIO_PHONE_NUMBER`.
   WhatsApp: for testing use the Twilio WhatsApp Sandbox (each phone must first join the sandbox);
   for production register a WhatsApp sender and set `TWILIO_WHATSAPP_NUMBER=whatsapp:+...`.
3. Choose the channel with `NOTIFY_CHANNEL=sms | whatsapp | both`.
4. Messages are Somali by default; set `MESSAGE_LANG=en` for English.
5. Local numbers are converted automatically using `DEFAULT_COUNTRY_CODE` (252 = Somalia),
   so `0615123456` becomes `+252615123456`.

Note: some countries / Twilio accounts need sender registration before SMS is delivered, and
trial accounts can message verified numbers only.

## Roles and permissions

| Action                          | Admin | Receptionist | Doctor | Patient |
| ------------------------------- | :---: | :----------: | :----: | :-----: |
| Create / delete doctors         |   ✓   |              |        |         |
| Register / edit patients        |   ✓   |      ✓       |        |         |
| Delete patients                 |   ✓   |              |        |         |
| Book appointments               |   ✓   |      ✓       |        |   ✓ (own) |
| View queue                      |   ✓   |      ✓       | ✓ (own) | ✓ (numbers only) |
| Call next / change status       |   ✓   |      ✓       | ✓ (own) | cancel own |
| Send custom SMS / WhatsApp      |   ✓   |      ✓       |        |         |

## How the queue works

- Queue numbers are **per doctor, per day** (1, 2, 3 ...) and generated atomically, so two
  simultaneous bookings can never receive the same number.
- Leave the time empty for a walk-in ticket, or set a time for a scheduled slot
  (a doctor cannot be double-booked at the same time).
- Statuses: `waiting → in_progress → completed`, plus `cancelled` and `no_show`.
- The doctor's **"Wac bukaanka xiga"** button completes the current patient, calls the next
  one and sends the "your turn" / "you are next" messages.
- Patients see only queue numbers (never other patients' names); their own ticket is highlighted.
- "Today" is decided by `CLINIC_TIMEZONE` (default `Africa/Mogadishu`).

## API summary

```
POST   /api/auth/register            public (creates a patient)
POST   /api/auth/login
GET    /api/auth/me
POST   /api/auth/staff               admin: create admin / receptionist

GET    /api/patients?q=              staff     POST /api/patients      PUT/DELETE /api/patients/:id
GET    /api/patients/me              patient
GET    /api/doctors                  POST /api/doctors (admin)   PUT /api/doctors/:id (admin)
GET    /api/doctors/me               doctor

POST   /api/appointments             book (admin, receptionist, patient)
GET    /api/appointments             scoped by role; filters: date, doctorId, status, patientId
GET    /api/appointments/queue       ?doctorId=&date=
POST   /api/appointments/queue/call-next
PATCH  /api/appointments/:id/status  { status }
GET    /api/appointments/stats

GET    /api/notifications/status
POST   /api/notifications/send       { phone | patientId, message, channel? }
POST   /api/notifications/appointments/:id/resend
```

## Production notes

- Set a strong `JWT_SECRET`, `NODE_ENV=production`, and `CLIENT_URL` to your frontend origin.
- Build the frontend with `npm run build` and serve `dist/` from any static host; set
  `VITE_API_URL` to the public API URL (e.g. `https://api.example.com/api`).
- Serve the API over HTTPS. Back up MongoDB regularly: it contains medical data.

## Deploy: GitHub + Cloudflare (frontend)

1. Push this whole folder to GitHub (`package.json`, `wrangler.jsonc`, `frontend/`, `backend/` at the repo root).
2. Cloudflare -> your Worker -> Settings -> Build:
   - **Root directory:** leave EMPTY (or `/`)   (do NOT put `backend`)
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy`
   - **Variable:** `VITE_API_URL` = your public API URL, e.g. `https://your-api.onrender.com/api`
3. `wrangler.jsonc` publishes `frontend/dist` and handles page refreshes on `/admin`, `/doctor` ...
   Its `name` must match your Worker's name.
   (If you prefer Root directory = `frontend`, `frontend/wrangler.jsonc` works too.)
4. The backend (Express + MongoDB) cannot run on Cloudflare static hosting. Host it on Render / Railway / a VPS
   with MongoDB Atlas, and set `CLIENT_URL` on the backend to your Cloudflare site URL (CORS).
