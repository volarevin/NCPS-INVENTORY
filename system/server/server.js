const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const db = require('./config/db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Debug logging for /api/admin
app.use('/api/admin', (req, res, next) => {
  console.log('Admin API Request:', req.method, req.path, new Date().toISOString());
  next();
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/customer', require('./routes/customerRoutes'));
app.use('/api/services', require('./routes/serviceRoutes'));
app.use('/api/appointments', require('./routes/appointmentRoutes'));
app.use('/api/technician', require('./routes/technicianRoutes'));
app.use('/api/receptionist', require('./routes/receptionistRoutes'));
app.use('/api/profile', require('./routes/profileRoutes'));
app.use('/api/public', require('./routes/publicRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));

app.get('/api/health', (req, res) => {
  db.query('SELECT 1 AS ok', (err) => {
    if (err) {
      return res.status(503).json({
        ok: false,
        db: false,
        message: err.message,
      });
    }
    res.json({ ok: true, db: true });
  });
});

// Basic Route
app.get('/', (req, res) => {
  res.send('NCPS Server is running');
});

// Serve built frontend when deployed as a single Node app
const frontendDist = path.join(__dirname, '..', 'main', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/^(?!\/api\/).*/, (req, res, next) => {
    if (req.method !== 'GET') return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});