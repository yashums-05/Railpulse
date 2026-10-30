# 🚆 RailPulse — System Architecture & Flow Report

This document outlines the detailed system architecture, user workflows, authentication routing, and data processing flows for the **RailPulse Smart Railway Management System**.

---

## 1. System Architecture & Data Flow

The RailPulse platform consists of a React Single Page Application (SPA) on the frontend, communicating with a Node.js + Express backend. Data is persisted in a PostgreSQL database utilizing materialized views for performance optimizations on crowd monitoring data.

```mermaid
graph TD
    %% Define styles and classes
    classDef client fill:#f9fbfd,stroke:#3b82f6,stroke-width:2px,color:#1e3a8a;
    classDef server fill:#f5f3ff,stroke:#8b5cf6,stroke-width:2px,color:#4c1d95;
    classDef db fill:#f0fdf4,stroke:#22c55e,stroke-width:2px,color:#14532d;
    classDef storage fill:#fffbeb,stroke:#f59e0b,stroke-width:2px,color:#78350f;

    subgraph Client ["Client Side (React SPA)"]
        A[React Frontend]:::client --> B(Axios API Service):::client
        B --> C{Route Guard}:::client
        C -->|Passenger| D[/dashboard]:::client
        C -->|Staff/Admin| E[/admin]:::client
        C -->|Public/Guest| F[/public-complaints]:::client
    end

    subgraph Server ["Server Side (Node.js + Express)"]
        G(Express Server):::server --> H{JWT Authentication}:::server
        G --> I[Multer Middleware]:::server
        
        %% Controllers
        H --> J[Auth Controller]:::server
        H --> K[Complaint Controller]:::server
        H --> L[Crowd Controller]:::server
    end

    subgraph Storage ["Storage Layer"]
        M[(PostgreSQL Database)]:::db
        N[(Materialized Views)]:::db
        O[Local uploads/ directory]:::storage
    end

    %% Flow lines
    B <-->|HTTP Request / JWT Auth Header| G
    J <-->|Query/Insert Users| M
    K <-->|Query/Insert/Update Complaints| M
    L <-->|Query Crowd Data| N
    I -->|Save Photo Proofs| O
    A <-->|Fetch Static Assets| O
```

---

## 2. Authentication & Role-Based Routing Flow

User access is protected via role-based JWT authentication. Depending on the assigned role stored in the token payload, users are automatically directed to their designated portal.

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Staff
    participant FE as React Frontend (App.js)
    participant BE as Express Backend (authController)
    participant DB as PostgreSQL (users table)

    User->>FE: Enters credentials & role selection
    FE->>BE: POST /api/auth/login (username, password)
    BE->>DB: Query user by username
    DB-->>BE: User data (including hashed password, role)
    
    alt Password matches
        BE->>BE: Sign JWT token (expires in 24h)
        BE-->>FE: HTTP 200 { token, user: { id, name, role } }
        FE->>FE: Store token & role in localStorage
        FE->>FE: Evaluate getDashboardRoute()
        
        alt role === 'Passenger'
            FE->>User: Redirect to /dashboard
        else role in [Admin, Station Master, TT, etc.]
            FE->>User: Redirect to /admin (Staff Dashboard)
        end
    else Invalid credentials
        BE-->>FE: HTTP 400 { message: 'Invalid Credentials' }
        FE->>User: Show login error alert
    end
```

---

## 3. Complaint Lifecycle Flow

Complaints submitted by passengers go through validation, photo attachment handling, automatic assignment based on entity tagging (Station/Train), role-based staff filtering, and mandatory-proof resolution.

```mermaid
flowchart TD
    classDef passenger fill:#eff6ff,stroke:#2563eb,stroke-width:2px;
    classDef backend fill:#faf5ff,stroke:#7c3aed,stroke-width:2px;
    classDef staff fill:#fef2f2,stroke:#dc2626,stroke-width:2px;
    classDef db fill:#f0fdf4,stroke:#16a34a,stroke-width:2px;

    %% Steps
    subgraph Sub1 [1. Complaint Submission]
        A[Passenger logs in]:::passenger --> B[Completes Complaint Form]:::passenger
        B --> C{Selects Entity Type}:::passenger
        C -->|Station| D[Enter Station Code]:::passenger
        C -->|Train| E[Enter Train Number]:::passenger
        D & E --> F[Upload photo proof + details]:::passenger
        F --> G[Submit Form]:::passenger
    end

    subgraph Sub2 [2. Backend Validation & Storage]
        G --> H[Check description & photo uploaded]:::backend
        H --> I{Verify Entity Code in DB}:::backend
        I -->|Invalid Code| J[Return Error 400]:::backend
        I -->|Valid Code| K[Save Image to uploads/]:::backend
        K --> L[Insert into complaints table<br/>status: Pending]:::db
    end

    subgraph Sub3 [3. Staff Fetching & Routing]
        L --> M[Staff loads /admin dashboard]:::staff
        M --> N{Identify Staff Role}:::staff
        N -->|Station Master / Section Engineer| O[Filter: Entity Type = Station]:::staff
        N -->|TT / Loco Pilot / Guard| P[Filter: Entity Type = Train]:::staff
        N -->|Admin / RPF Officer| Q[Filter: Show All Complaints]:::staff
        O & P & Q --> R[Render Role-Filtered Complaint List]:::staff
    end

    subgraph Sub4 [4. Resolution & Update]
        R --> S[Staff enters resolution description<br/>+ Uploads resolution photo proof]:::staff
        S --> T[Validate resolution image & details]:::backend
        T --> U[Update DB status = Resolved<br/>& save resolution image]:::db
        U --> V[Passenger & Public views resolved status<br/>with resolution proof]:::passenger
    end
```

---

## 4. Crowd Monitoring & Analytics Pipeline

To provide lightning-fast query times on ticket and occupant analytics, the database leverages PostgreSQL materialized views which are periodically refreshed via server maintenance scripts.

```mermaid
graph LR
    classDef src fill:#eff6ff,stroke:#2563eb,stroke-dasharray: 5 5;
    classDef process fill:#f5f3ff,stroke:#8b5cf6;
    classDef dest fill:#f0fdf4,stroke:#22c55e;

    A[(Tickets Table)]:::src -->|Hourly/Daily| B{Materialized Views<br/>Refresh Script}:::process
    C[(Stations Table)]:::src -->|Join Codes| B
    D[(Train Details)]:::src -->|Join Capacity| B
    
    B -->|Populate/Update| E[(mv_station_crowd)]:::dest
    B -->|Populate/Update| F[(mv_train_coach_crowd)]:::dest

    E & F -->|GET /api/crowd/analysis| G[Crowd Analytics API]:::process
    G -->|Recharts| H[Passenger Crowd Dashboard]:::process
```