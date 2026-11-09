# 🎭 CineBook / Theatre Booking Mobile Application

A full-stack, cross-platform mobile application designed for real-time movie & theatre seat reservations, featuring secure authentication and robust seat concurrency management.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React Native + Expo |
| **Backend** | Node.js + Express.js |
| **Database** | MariaDB |
| **Authentication** | JWT (Access & Refresh Tokens) + bcrypt |
| **HTTP Client** | Axios (with custom interceptors) |
| **Token Storage** | `expo-secure-store` / `localStorage` |

---

## 🌟 Key Features

### 🔐 Authentication & Security
- User registration with **bcrypt** password hashing.
- **JWT-based authentication** with short-lived Access Tokens (1 hour).
- Automatic token renewal mechanism via **Refresh Tokens** (7 days).
- Secure logout with server-side token revocation.

### 🎬 Movie & Show Exploration
- Interactive homepage with featured titles carousel.
- Real-time search and detailed view (duration, category, plot, posters).
- 14-day booking calendar with per-day showtime selection.
- Screen room details (DOLBY, IMAX, etc.).

### 🎫 Seat Reservation & Concurrency Handling
- Tiered ticket pricing (Adult €9.50 / Student €7.00 / Child €6.00).
- Interactive visual seat map.
- **Row-level locking database architecture** to prevent race conditions and double bookings.
- Dynamic sold-out status updates.

### 📋 Booking Management
- User dashboard with full booking history.
- Real-time status tracking (*Confirmed / Completed / Cancelled*).
- Future reservation cancellation with automated seat release back to inventory.

---

## 📡 API Endpoints

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| **POST** | `/auth/register` | User registration | ❌ |
| **POST** | `/auth/login` | User authentication | ❌ |
| **POST** | `/auth/refresh` | Renew access token | ❌ |
| **GET** | `/theatres` | List available cinemas | ❌ |
| **GET** | `/shows` | Fetch movies list | ❌ |
| **GET** | `/shows/:id` | Get movie details & showtimes | ❌ |
| **POST** | `/reservations` | Create new seat booking | ✅ |
| **GET** | `/user/reservations` | Fetch user reservation history | ✅ |
| **DELETE** | `/reservations/:id` | Cancel active reservation | ✅ |

---

## 🚀 Installation & Setup Guide

### Prerequisites
- **Node.js**: `v18+`
- **MariaDB**: `v10.6+`
- **HeidiSQL / DBeaver**: Database client
- **Expo CLI**: `npm install -g expo-cli`

---

### 1. Database Setup
1. Open your database client and connect to `localhost:3306`.
2. Execute `schema.sql` to generate tables.
3. Execute `seed.sql` to populate initial data.

---

### 2. Backend Installation

```bash
cd theatre-booking/backend
npm install

```

Create a `.env` file in the `backend` folder:

```env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=1234
DB_NAME=theatre_booking
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

```

Start the server:

```bash
npm run dev
# ✅ Server running on http://localhost:3000

```

---

### 3. Frontend Installation

```bash
cd theatre-booking/frontend
npm install
npx expo start

```

Press `w` to launch the app in your browser (`http://localhost:8081`).

> 💡 **Android Emulator Note:** If running on Android Studio, update `frontend/src/services/api.js`:
> ```javascript
> export const API_BASE = '[http://10.0.2.2:3000/api](http://10.0.2.2:3000/api)';
> 
> ```
> 
> 

```

```
