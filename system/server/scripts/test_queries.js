require('dotenv').config({ path: '../.env' });
const db = require('../config/db');

const startBound = '2025-01-01 00:00:00';
const endBound = '2025-12-31 23:59:59';
const dateWhere = "WHERE a.appointment_date BETWEEN ? AND ?";
const dateAnd = "AND a.appointment_date BETWEEN ? AND ?";
const joinCondition = "AND a.appointment_date BETWEEN ? AND ?";
const queryParams = [startBound, endBound];

const queries = {
  monthly: `
      SELECT 
          DATE_FORMAT(a.appointment_date, '%Y-%m') as month,
          COUNT(*) as appointments,
          SUM(CASE WHEN a.status = 'Completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN a.status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled,
          COALESCE(SUM(CASE WHEN a.status = 'Completed' THEN COALESCE(a.total_cost, s.estimated_price) ELSE 0 END), 0) as revenue
      FROM appointments a
      JOIN services s ON a.service_id = s.service_id
      ${dateWhere || "WHERE a.appointment_date >= DATE_SUB((SELECT COALESCE(MAX(appointment_date), NOW()) FROM appointments), INTERVAL 12 MONTH)"}
      GROUP BY DATE_FORMAT(a.appointment_date, '%Y-%m')
      ORDER BY DATE_FORMAT(a.appointment_date, '%Y-%m')
    `,
  peakHours: `
      SELECT 
        DATE_FORMAT(a.appointment_date, '%H:00') as hour, 
        COUNT(*) as bookings 
      FROM appointments a
      ${dateWhere}
      GROUP BY DATE_FORMAT(a.appointment_date, '%H')
      ORDER BY DATE_FORMAT(a.appointment_date, '%H')
    `,
  peakDays: `
      SELECT 
        DATE_FORMAT(a.appointment_date, '%w') as day, 
        COUNT(*) as bookings 
      FROM appointments a
      ${dateWhere}
      GROUP BY DATE_FORMAT(a.appointment_date, '%w')
      ORDER BY DATE_FORMAT(a.appointment_date, '%w')
    `,
};

function runQuery(name, sql) {
  return new Promise((resolve) => {
    db.query(sql, queryParams, (err, res) => {
      if (err) {
        console.log(`Failed ${name}:`, err.message);
      } else {
        console.log(`Passed ${name}`);
      }
      resolve();
    });
  });
}

async function run() {
  for (const [name, sql] of Object.entries(queries)) {
    await runQuery(name, sql);
  }
  db.end();
}

run();