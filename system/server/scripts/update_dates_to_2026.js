require('dotenv').config({ path: '../.env' });
const pool = require('../config/db');

async function updateDates() {
  const promisePool = pool.promise();

  try {
    console.log('Fetching 2025 appointments...');
    const [appointments] = await promisePool.query('SELECT appointment_id, appointment_date, created_at, updated_at FROM appointments WHERE YEAR(appointment_date) = 2025');

    // Pick 80% of them
    const amountToUpdate = Math.floor(appointments.length * 0.8);
    const shuffled = appointments.sort(() => 0.5 - Math.random());
    const toUpdate = shuffled.slice(0, amountToUpdate);

    console.log(`Updating ${toUpdate.length} appointments from 2025 to 2026...`);

    for (const appt of toUpdate) {
      // Add 1 year
      const apptDate = new Date(appt.appointment_date);
      apptDate.setFullYear(apptDate.getFullYear() + 1);

      const createdAt = new Date(appt.created_at);
      createdAt.setFullYear(createdAt.getFullYear() + 1);

      const updatedAt = new Date(appt.updated_at);
      updatedAt.setFullYear(updatedAt.getFullYear() + 1);

      await promisePool.query(
        'UPDATE appointments SET appointment_date = ?, created_at = ?, updated_at = ? WHERE appointment_id = ?',
        [apptDate, createdAt, updatedAt, appt.appointment_id]
      );

      // Now updating payments
      await promisePool.query(
        'UPDATE payments SET created_at = ? WHERE appointment_id = ? AND YEAR(created_at) = 2025',
        [createdAt, appt.appointment_id]
      );

      // Now updating reviews
      await promisePool.query(
        'UPDATE reviews SET created_at = ? WHERE appointment_id = ? AND YEAR(created_at) = 2025',
        [createdAt, appt.appointment_id]
      );
      
      // Update appointment_parts
      await promisePool.query(
        'UPDATE appointment_parts SET created_at = ? WHERE appointment_id = ? AND YEAR(created_at) = 2025',
        [createdAt, appt.appointment_id]
      );
    }

    console.log('Update finished.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

updateDates();