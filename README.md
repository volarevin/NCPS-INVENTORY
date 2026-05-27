# NCPS - Network Computer Professional Services

## Manual Setup (First Time Only)

If this is your first time running the application, install dependencies first:

### 1. Install Backend Dependencies
```bash
cd system/server
npm install
```

### 2. Install Frontend Dependencies
```bash
cd system/main
npm install
```

### 3. Database Setup
1. Import the database schema from `system/database/ncps_db.sql` into your MySQL server
2. Copy `system/server/.env.example` to `system/server/.env` and set database credentials
3. Copy `system/main/.env.example` to `system/main/.env` (defaults to `http://localhost:5000` for local API)

---

## Hostinger / Production Deployment

### Backend env vars (Node app — `system/server`)
Set in Hostinger **Environment variables** (not only in local `.env`):

| Variable | Example |
|----------|---------|
| `DB_HOST` | `mysql123.hostinger.com` (from hPanel, **not** `localhost`) |
| `DB_USER` | Your MySQL username |
| `DB_PASSWORD` | Your MySQL password |
| `DB_NAME` | Your MySQL database name |
| `JWT_SECRET` | Long random string (required for login) |
| `NODE_ENV` | `production` |

### Frontend build env (`system/main`)
Set **`VITE_API_URL`** when building the frontend to your live API URL (no trailing slash):

```
VITE_API_URL=https://yourdomain.com
```

Then build and deploy:

```bash
cd system/main && npm install && npm run build
cd ../server && npm install && npm start
```

The server serves `system/main/dist` automatically when that folder exists.

### Health check
After deploy, visit `https://yourdomain.com/api/health` — should return `{"ok":true,"db":true}`.

If login returns **500**, check Hostinger logs for `Database error` or `JWT_SECRET missing`.

---

## Manual Start (Alternative Method)

### Start Backend
```bash
cd system/server
npm start
```

### Start Frontend
```bash
cd system/main
npm run dev
```

---

## Access Points

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

---

## Default Test Accounts

After importing the database, you can login with:

- **Admin**: `admin` / `admin123`
- **Receptionist**: `receptionist` / `receptionist123`
- **Technician**: `technician` / `technician123`
- **Customer**: `customer` / `customer123`

---

## Troubleshooting

### Database Connection Error
1. Make sure MySQL is running
2. Check credentials in `system/server/.env`
3. Verify the database `ncps_db` exists

### Node Modules Missing
Run the installation commands in the "Manual Setup" section above.

---

## Development

- Frontend uses **Vite + React + TypeScript**
- Backend uses **Node.js + Express**
- Database: **MySQL/MariaDB**
