# 🚆 RailPulse — Smart Railway Management System

> A full-stack web application for managing railway complaints, crowd monitoring, and staff operations across the Indian rail network.

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [User Roles](#user-roles)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Getting Started](#getting-started)
9. [Environment Variables](#environment-variables)
10. [Running the Application](#running-the-application)
11. [Pages & Components](#pages--components)
12. [Screenshots & Flow](#screenshots--flow)

---

## 🌐 Project Overview

**RailPulse** is a smart railway management platform that enables passengers to file complaints about trains and stations, and allows railway staff (Station Masters, Ticket Examiners, Admins) to view, manage, and resolve those complaints. The system also provides real-time crowd monitoring and train occupancy analytics.

The project is split into two independently running services:

| Service  | Tech              | Port |
|----------|-------------------|------|
| Backend  | Node.js + Express | 5000 |
| Frontend | React 18          | 3000 |

---

## ✨ Features

### 🎫 Passenger Features
- **Register / Login** with role-based access
- **File Complaints** with:
  - Description (mandatory)
  - Photo proof upload (mandatory)
  - Optional PNR number
  - Tag complaint to a **Station** (by station code) or **Train** (by train number)
  - Validation against the database for valid station codes and train numbers
- **View Own Complaints** — status (Pending / Resolved), resolution details, and resolution proof image
- **Crowd Monitoring Dashboard** — visualize crowd levels at stations and train occupancy via charts
- **Public Complaints Gallery** — browse all complaints across the network (no login required)

### 🛡️ Admin Features
- Full system overview dashboard
- View and manage **all complaints** across the network
- Resolve complaints with description + photo proof

### 🏢 Station Master Features
- Dedicated portal showing **only Station-type complaints** (auto-filtered, no sorting required)
- Resolve complaints assigned to their jurisdiction
- Clear role-identifying banner on login

### 🚆 Ticket Examiner (TT) Features
- Dedicated portal showing **only Train-type complaints** (auto-filtered, no sorting required)
- Resolve complaints on assigned train routes
- Clear role-identifying banner on login

### 🌐 Public Features (No Login Required)
- Browse the **Public Complaint Repository**
- Search complaints by station code, train number, or keywords
- Filter by entity type (Station / Train / All)
- View resolution status, proof images, and resolution details

---

## 🛠️ Tech Stack

### Backend
| Technology     | Version   | Purpose                        |
|----------------|-----------|--------------------------------|
| Node.js        | ≥ 18.x    | Runtime environment            |
| Express.js     | ^4.18.2   | Web framework / REST API       |
| PostgreSQL      | ≥ 14.x    | Relational database            |
| pg             | ^8.11.3   | PostgreSQL client for Node.js  |
| bcryptjs       | ^2.4.3    | Password hashing               |
| jsonwebtoken   | ^9.0.2    | JWT authentication             |
| multer         | ^2.1.1    | File/image upload handling     |
| cors           | ^2.8.5    | Cross-Origin Resource Sharing  |
| dotenv         | ^16.3.1   | Environment variable management|

### Frontend
| Technology        | Version   | Purpose                        |
|-------------------|-----------|--------------------------------|
| React             | ^18.2.0   | UI library                     |
| React Router DOM  | ^7.13.1   | Client-side routing            |
| Axios             | ^1.5.0    | HTTP requests to backend       |
| Recharts          | ^3.8.0    | Data visualization charts      |
| react-scripts     | ^5.0.1    | CRA build tooling              |

---

## 🏗️ System Architecture

### Data Flow
 1. **Tickets & Crowd**: The system handles large volumes of ticket data. To keep the dashboard fast, we use **PostgreSQL Materialized Views** (`mv_station_crowd`, `mv_train_coach_crowd`) and **Summary Tables** (`crowd_daily_train`).
 2. **Maintenance Scripts**: The `backend/scripts/` directory contains tools to refresh these views and generate sample data. This is critical for performance in a new system setup.
 3. **Authentication**: Uses **JWT (JSON Web Tokens)**. Roles are assigned at registration and stored in the `users` table.
 4. **Image Storage**: Images are stored locally in `backend/uploads/` and served via Express static middleware.

---

## 📁 Project Structure

```
railpulse_full_project/
├── .env                          # Root environment variables (DATABASE_URL)
├── README.md                     # Project documentation
├── requirements.txt              # Node.js package requirements
├── package.json                  # Root package info
│
├── backend/
│   ├── server.js                 # Express server entry point (port 5000)
│   ├── package.json              # Backend dependencies
│   ├── config/
│   │   └── db.js                 # PostgreSQL connection pool (pg)
│   ├── controllers/
│   │   ├── authController.js     # Register & login logic
│   │   ├── complaintController.js# CRUD + staff/public complaint queries
│   │   ├── crowdController.js    # Station crowd & suggestions analytics
│   │   └── ticketController.js  # Ticket data
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT token verification
│   │   └── uploadMiddleware.js   # Multer file upload config
│   ├── models/
│   │   └── userModel.js          # User class model
│   ├── routes/
│   │   ├── authRoutes.js         # POST /api/auth/register|login
│   │   ├── complaintRoutes.js    # GET|POST /api/complaints, /staff, /all
│   │   └── crowdRoutes.js        # GET /api/crowd/analysis|suggestions
│   ├── scripts/                  # Database maintenance & utility scripts
│   └── uploads/                  # Uploaded proof images (served statically)
│
├── frontend/
│   ├── package.json              # Frontend dependencies
│   ├── public/
│   │   └── index.html            # HTML shell
│   └── src/
│       ├── App.js                # Root router (React Router)
│       ├── index.js              # React DOM render entry
│       ├── components/
│       │   ├── ComplaintForm.js      # Passenger complaint submission form
│       │   ├── ComplaintList.js      # Passenger own-complaint list
│       │   ├── CrowdChart.js         # Crowd monitoring charts (Recharts)
│       │   ├── CrowdDashboard.js     # Crowd dashboard layout
│       │   ├── Navbar.js             # Global sticky navbar (role-aware)
│       │   ├── StaffComplaintList.js # Staff complaint list + resolve form
│       │   └── TrainOccupancyChart.js# Train occupancy visualization
│       ├── pages/
│       │   ├── Auth.js               # Login / Register page (slide animation)
│       │   ├── Auth.css              # Auth page styles
│       │   ├── Dashboard.js          # Passenger dashboard
│       │   ├── AdminPanel.js         # Staff/Admin panel (role-aware)
│       │   └── PublicComplaints.js   # Public complaint gallery (no login)
│       ├── services/
│       │   └── api.js                # Centralized Axios API helpers
│       └── styles/
│           └── main.css              # Global styles, backgrounds, animations
│
└── database/
    ├── schema.sql                # Full DB schema (CREATE TABLE statements)
    ├── add_stations_trains.sql   # Seed: stations + train_details data
    └── add_train_stops.sql       # Seed: train stop schedules
```

---

## 👥 User Roles

| Role            | Dashboard        | Complaint View                                | Can Resolve |
|-----------------|------------------|-----------------------------------------------|-------------|
| **Passenger**   | `/dashboard`     | Own complaints only                           | ❌           |
| **Station Master** 🏛️ | `/admin`   | Station-type complaints only (auto-filtered)  | ✅           |
| **Section Engineer** 🔧 | `/admin` | Station-type complaints only (auto-filtered)  | ✅           |
| **TT** 🎟️       | `/admin`         | Train-type complaints only (auto-filtered)    | ✅           |
| **Loco Pilot** 🚂 | `/admin`        | Train-type complaints only (auto-filtered)    | ✅           |
| **Guard** 🦺    | `/admin`         | Train-type complaints only (auto-filtered)    | ✅           |
| **RPF Officer** 🔴 | `/admin`      | All complaints across network                 | ✅           |
| **Admin** 🛡️    | `/admin`         | All complaints across network                 | ✅           |
| **Guest**       | `/public-complaints` | All public complaints (read-only)         | ❌           |

---

## 🗄️ Database Schema

```sql
-- Users  (username is the unique login ID)
users (id, username [UNIQUE NOT NULL], name, email, password, role)

-- Complaints
complaints (
  id, user_id, pnr_number, entity_type [Station|Train],
  entity_id, description, image_url,
  status [Pending|Resolved],
  resolution_description, resolution_image_url, created_at
)

-- Stations reference data
stations (id, station_code, station_name, city, state)

-- Train reference data
train_details (
  id, train_no, train_name,
  source_station_code, destination_station_code,
  train_type, total_seats
)

-- Train stops / schedule (per-station stops for each train)
train_stops (
  id, train_no, station_code, stop_number,
  arrival_time, departure_time, halt_minutes, day_number
)

-- Tickets
tickets (id, train_no, source, destination, passenger_count)
```

---

## 🔌 API Endpoints

### Auth — `/api/auth`
| Method | Endpoint    | Auth | Description                            |
|--------|-------------|------|----------------------------------------|
| POST   | `/register` | ❌   | Register — requires `username` (unique User ID), `name`, `email`, `password`, `role` |
| POST   | `/login`    | ❌   | Login using `username` + `password`, returns JWT token |

### Complaints — `/api/complaints`
| Method | Endpoint        | Auth     | Description                                         |
|--------|-----------------|----------|-----------------------------------------------------|
| GET    | `/`             | ✅ JWT   | Get logged-in passenger's own complaints            |
| POST   | `/`             | ✅ JWT   | File a new complaint (multipart: description + image) |
| GET    | `/all`          | ❌       | Get all complaints (public gallery)                 |
| GET    | `/staff`        | ✅ JWT   | Get role-filtered complaints (Station/Train/All)    |
| PUT    | `/:id/resolve`  | ✅ JWT   | Resolve a complaint (with resolution image)         |

### Crowd — `/api/crowd`
| Method | Endpoint       | Auth | Description                  |
|--------|----------------|------|------------------------------|
| GET    | `/analysis`    | ❌   | Station crowd data / analytics|
| GET    | `/suggestions`  | ❌   | Crowd management suggestions |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.x — [Download](https://nodejs.org/)
- **PostgreSQL** ≥ 14.x — [Download](https://www.postgresql.org/download/)
- **npm** ≥ 9.x (bundled with Node.js)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd railpulse_full_project
```

### 2. Create the PostgreSQL Database

```sql
CREATE DATABASE railpulse;
```

### 3. Run the SQL Schema & Seed Files

Connect to your `railpulse` database and run in order:

```bash
psql -U postgres -d railpulse -f database/schema.sql
psql -U postgres -d railpulse -f database/add_stations_trains.sql
psql -U postgres -d railpulse -f database/add_train_stops.sql
```

> **Existing database only:** If upgrading from an older version, also run:
> ```bash
> psql -U postgres -d railpulse -f database/add_username.sql
> ```

### 4. Configure Environment Variables
 
 Copy the example environment file and update it with your database credentials:
 
 ```bash
 cp .env.example .env
 ```
 
 **Required Variables:**
 - `DATABASE_URL`: `postgresql://<user>:<password>@localhost:5432/railpulse`
 - `JWT_SECRET`: A secret string for authentication.
 
 ### 5. Install & Run
 
 **Backend:**
 ```bash
 cd backend
 npm install
 npm start
 ```
 
 **Frontend:**
 ```bash
 cd ../frontend
 npm install
 npm start
 ```
 
 > **Pro Tip**: Use the maintenance scripts in `backend/scripts/` to refresh the analytics data or re-generate sample tickets.

---

## ⚙️ Environment Variables

| Variable        | Location           | Description                           |
|-----------------|--------------------|---------------------------------------|
| `DATABASE_URL`  | `.env` (root)      | PostgreSQL connection string          |
| `JWT_SECRET`    | `.env` (root)      | Secret key for signing JWT tokens     |
| `PORT`          | `.env` (optional)  | Backend port (default: `5000`)        |

---

## ▶️ Running the Application

### Start the Backend

```bash
cd backend
npm start
```

> Server starts on **http://localhost:5000**

### Start the Frontend

```bash
cd frontend
npm start
```

> App opens on **http://localhost:3000**

Both servers must be running simultaneously for the app to work.

---

## 🖥️ Pages & Components

### Pages

| Page                  | Route                  | Access       | Description                                   |
|-----------------------|------------------------|--------------|-----------------------------------------------|
| `Auth.js`             | `/login`, `/register`  | Public       | Animated slide login/register form            |
| `Dashboard.js`        | `/dashboard`           | Passenger    | Complaint form + list + crowd monitoring      |
| `AdminPanel.js`       | `/admin`               | Staff/Admin  | Role-filtered complaint view + resolve tools  |
| `PublicComplaints.js` | `/public-complaints`   | Everyone     | Searchable public complaint repository        |

### Key Components

| Component              | Description                                                        |
|------------------------|--------------------------------------------------------------------|
| `Navbar.js`            | Sticky top bar with live clock, role badge, page title, nav links  |
| `ComplaintForm.js`     | Passenger complaint form with image upload, entity tagging         |
| `ComplaintList.js`     | Shows a passenger's own complaints with status badges              |
| `StaffComplaintList.js`| Staff complaint list with inline resolve form + image proof upload |
| `CrowdChart.js`        | Recharts bar/line chart for station crowd analysis                 |
| `TrainOccupancyChart.js` | Train-level occupancy visualization                              |

---

## 🔐 Authentication Flow

1. User registers with a **unique User ID (username)**, full name, email, password, and selects a **role**
2. Username must be unique — only letters, numbers, and underscores allowed
3. On login, user enters their **User ID** and password
4. A **JWT token** is issued and stored in `localStorage`
5. Protected routes check the token via the `authMiddleware`
6. Role-based routing:
   - `Passenger` → `/dashboard`
   - All other roles (`Admin`, `Station Master`, `TT`, `Loco Pilot`, `Guard`, `RPF Officer`, `Section Engineer`) → `/admin`

---

## 📸 Image Upload

- Complaints require a **mandatory photo proof** (uploaded via `multer`)
- Resolution requires a **mandatory resolution photo** from staff
- Images are stored in `backend/uploads/` and served at `http://localhost:5000/uploads/<filename>`

---

## 📊 Crowd Monitoring

- Available in the **Passenger Dashboard** under the "Crowd Monitoring" tab
- Fetches data from `GET /api/crowd/analysis`
- Displays station crowd levels and suggestions via Recharts visualizations

---

## 📝 License

This project is developed for academic/demonstration purposes.

---

*Built with ❤️ for Smart Railway Management — RailPulse v1.0.0*