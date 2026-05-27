const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { checkTechnicianConflict, checkCustomerDuplicate } = require('../utils/conflictChecker');
const { logAction } = require('../utils/auditHelper');

exports.createAppointment = async (req, res) => {
  const { serviceId, date, time, notes, address, saveAddress } = req.body;
  const customerId = req.userId; // From auth middleware

  if (!serviceId || !date || !time || !address) {
    return res.status(400).json({ message: 'Please provide service, date, time, and address.' });
  }

  try {
    // Check for duplicate booking
    const duplicate = await checkCustomerDuplicate(customerId, serviceId, date);
    if (duplicate) {
      return res.status(409).json(duplicate);
    }

    // Combine date and time into a single DATETIME string
    const appointmentDate = `${date} ${time}:00`;

    // If saveAddress is true, save it to customer_addresses
    if (saveAddress) {
      // Check if address already exists to avoid duplicates (simple check)
      (req.db || db).query('SELECT * FROM customer_addresses WHERE user_id = ? AND address_line = ?', [customerId, address], (err, results) => {
          if (!err && results.length === 0) {
              (req.db || db).query('INSERT INTO customer_addresses (user_id, address_line, address_label) VALUES (?, ?, ?)', 
                  [customerId, address, 'Saved Address']);
          }
      });
    }

    const query = `
      INSERT INTO appointments (customer_id, service_id, appointment_date, customer_notes, service_address, status)
      VALUES (?, ?, ?, ?, ?, 'Pending')
    `;

    (req.db || db).query(query, [customerId, serviceId, appointmentDate, notes, address], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database error creating appointment.' });
      }
      res.status(201).json({ message: 'Appointment booked successfully.', appointmentId: result.insertId });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating appointment.' });
  }
};

exports.updateAppointmentStatus = (req, res) => {
  const { id } = req.params;
  const { status, reason, category, technicianId, overrideConflict, totalCost, additionalCost, costNotes, overrideEarlyStart } = req.body;
  const validStatuses = ['Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled', 'Rejected'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status.' });
  }

  if ((status === 'Cancelled' || status === 'Rejected') && !category) {
      return res.status(400).json({ message: 'Cancellation/Rejection category is required.' });
  }

  let finalTotalCost = totalCost;

  const proceedWithUpdate = () => {
    let query = 'UPDATE appointments SET status = ?';
    const params = [status];

    if (technicianId) {
      query += ', technician_id = ?';
      params.push(technicianId);
    }

    if (status === 'Completed' && finalTotalCost !== undefined) {
      query += ', total_cost = ?, cost_notes = ?';
      params.push(finalTotalCost, costNotes || null);
    }

    if (status === 'Cancelled' || status === 'Rejected') {
      if (reason) {
        query += ', cancellation_reason = ?';
        params.push(reason);
      }
      if (category) {
        query += ', cancellation_category = ?';
        params.push(category);
      }
      // Also track who cancelled it if we have user info in request (from middleware)
      if (req.userId) {
          query += ', cancelled_by = ?';
          params.push(req.userId);
      }
    }

    query += ' WHERE appointment_id = ?';
    params.push(id);

    (req.db || db).query(query, params, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database error updating appointment.' });
      }

      // If status is Completed, handle payment record and notification
      if (status === 'Completed') {
          // Create payment record if cost is provided
          if (finalTotalCost) {
            const paymentQuery = 'INSERT INTO payments (appointment_id, amount, status) VALUES (?, ?, ?)';
            (req.db || db).query(paymentQuery, [id, finalTotalCost, 'Pending'], (payErr) => {
                if (payErr) console.error('Error creating payment record:', payErr);
            });
          }

          // We need to fetch appointment details to get technician_id and service name
          const detailsQuery = `
              SELECT a.technician_id, s.name as service_name, u.first_name, u.last_name 
              FROM appointments a 
              JOIN services s ON a.service_id = s.service_id 
              JOIN users u ON a.customer_id = u.user_id
              WHERE a.appointment_id = ?
          `;
          (req.db || db).query(detailsQuery, [id], (detErr, detResults) => {
              if (!detErr && detResults.length > 0) {
                  const appt = detResults[0];
                  if (appt.technician_id) {
                      const notifQuery = 'INSERT INTO notifications (user_id, title, message, related_appointment_id) VALUES (?, ?, ?, ?)';
                        const message = `You marked "${appt.service_name}" for ${appt.first_name} ${appt.last_name} as completed. Total Cost: ${finalTotalCost || 'N/A'}`;
                      (req.db || db).query(notifQuery, [appt.technician_id, 'Job Completed', message, id], (notifErr) => {
                          if (notifErr) console.error('Error creating completion notification:', notifErr);
                      });
                  }
              }
          });
      }

      // Update Technician Availability Logic
      const getTechQuery = "SELECT technician_id FROM appointments WHERE appointment_id = ?";
      (req.db || db).query(getTechQuery, [id], (err, techRes) => {
          if (!err && techRes.length > 0 && techRes[0].technician_id) {
              const tId = techRes[0].technician_id;
              
              if (status === 'In Progress') {
                  (req.db || db).query("UPDATE technician_profiles SET availability_status = 'busy' WHERE user_id = ?", [tId]);
              } else {
                  // Check if they have OTHER in-progress appointments
                  const checkBusy = "SELECT COUNT(*) as count FROM appointments WHERE technician_id = ? AND status = 'In Progress' AND appointment_id != ?";
                  (req.db || db).query(checkBusy, [tId, id], (busyErr, busyRes) => {
                      if (!busyErr && busyRes[0].count === 0) {
                          // Not busy anymore. Check if online.
                          (req.db || db).query("SELECT is_online FROM users WHERE user_id = ?", [tId], (userErr, userRes) => {
                              if (!userErr && userRes.length > 0) {
                                  const newStatus = userRes[0].is_online ? 'available' : 'offline';
                                  (req.db || db).query("UPDATE technician_profiles SET availability_status = ? WHERE user_id = ?", [newStatus, tId]);
                              }
                          });
                      }
                  });
              }
          }
      });

      res.json({ message: 'Appointment status updated.' });
    });
  };

  const runEarlyStartCheck = () => {
    if (status === 'In Progress') {
      const checkDateQuery = 'SELECT appointment_date FROM appointments WHERE appointment_id = ?';
      (req.db || db).query(checkDateQuery, [id], (err, results) => {
          if (err) return res.status(500).json({ message: 'Database error.' });
          if (results.length === 0) return res.status(404).json({ message: 'Appointment not found.' });

          const apptDate = new Date(results[0].appointment_date);
          const now = new Date();
          // Allow start if within 30 mins before
          const windowStart = new Date(apptDate.getTime() - 30 * 60000); 
          
          if (now < windowStart && !overrideEarlyStart) {
               return res.status(409).json({ 
                   message: `This job is scheduled for ${apptDate.toLocaleString()}. Are you sure you want to start it now?`,
                   earlyStart: true,
                   appointmentDate: apptDate
               });
          }

          if (now < windowStart && overrideEarlyStart) {
              logAction(req.userId, 'Early Start Override', 'appointments', `Started appointment #${id} early. Scheduled: ${apptDate}, Started: ${now}`);
          }
          
          proceedWithUpdate();
      });
    } else {
      proceedWithUpdate();
    }
  };

  const computeTotalCostIfNeeded = (cb) => {
    if (status !== 'Completed' || totalCost !== undefined) {
      return cb();
    }

    const normalizedAdditional = Number(additionalCost || 0);
    if (!Number.isFinite(normalizedAdditional) || normalizedAdditional < 0) {
      return res.status(400).json({ message: 'Invalid additional cost.' });
    }

    const baseQuery = `
      SELECT COALESCE(s.estimated_price, 0) AS base_price
      FROM appointments a
      JOIN services s ON a.service_id = s.service_id
      WHERE a.appointment_id = ?
    `;

    (req.db || db).query(baseQuery, [id], (baseErr, baseRows) => {
      if (baseErr) {
        console.error(baseErr);
        return res.status(500).json({ message: 'Database error fetching service price.' });
      }

      const basePrice = baseRows.length > 0 ? Number(baseRows[0].base_price) || 0 : 0;
      const partsQuery = 'SELECT COALESCE(SUM(line_total), 0) AS parts_subtotal FROM appointment_parts WHERE appointment_id = ?';

      (req.db || db).query(partsQuery, [id], (partsErr, partsRows) => {
        if (partsErr) {
          console.error(partsErr);
          return res.status(500).json({ message: 'Database error fetching parts subtotal.' });
        }

        const partsSubtotal = partsRows.length > 0 ? Number(partsRows[0].parts_subtotal) || 0 : 0;
        finalTotalCost = basePrice + partsSubtotal + normalizedAdditional;
        cb();
      });
    });
  };

  if (technicianId && !overrideConflict) {
    const detailsQuery = `
      SELECT a.appointment_date, s.duration_minutes 
      FROM appointments a
      JOIN services s ON a.service_id = s.service_id
      WHERE a.appointment_id = ?
    `;
    (req.db || db).query(detailsQuery, [id], async (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error fetching details.' });
      if (results.length === 0) return res.status(404).json({ message: 'Appointment not found.' });

      const { appointment_date, duration_minutes } = results[0];
      try {
        const conflict = await checkTechnicianConflict(technicianId, appointment_date, duration_minutes, id);
        if (conflict) {
          return res.status(409).json({
            message: `Technician is occupied by appointment #${conflict.conflictAppointmentId}. Please choose another technician or time.`,
            conflictAppointmentId: conflict.conflictAppointmentId,
            conflict: conflict
          });
        }
        computeTotalCostIfNeeded(runEarlyStartCheck);
      } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error checking conflicts.' });
      }
    });
  } else {
    computeTotalCostIfNeeded(runEarlyStartCheck);
  }
};

exports.updateAppointment = (req, res) => {
  const { id } = req.params;
  const { serviceId, date, time, notes } = req.body;
  const userId = req.userId;

  // Only allow updating if status is Pending
  const checkQuery = 'SELECT status, customer_id FROM appointments WHERE appointment_id = ?';
  
  (req.db || db).query(checkQuery, [id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Database error checking appointment.' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    const appointment = results[0];
    
    if (appointment.customer_id !== userId) {
      return res.status(403).json({ message: 'Unauthorized to update this appointment.' });
    }

    if (appointment.status !== 'Pending') {
      return res.status(400).json({ message: 'Only pending appointments can be updated.' });
    }

    const appointmentDate = `${date} ${time}:00`;
    
    const updateQuery = `
      UPDATE appointments 
      SET service_id = ?, appointment_date = ?, customer_notes = ?
      WHERE appointment_id = ?
    `;

    (req.db || db).query(updateQuery, [serviceId, appointmentDate, notes, id], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database error updating appointment.' });
      }
      res.json({ message: 'Appointment updated successfully.' });
    });
  });
};

exports.getAppointmentParts = (req, res) => {
  const appointmentId = Number(req.params.id);
  if (!Number.isFinite(appointmentId)) {
    return res.status(400).json({ message: 'Invalid appointment id.' });
  }

  const query = `
    SELECT ap.item_id, ap.quantity, ap.unit_price, ap.line_total,
           i.name, i.unit
    FROM appointment_parts ap
    JOIN inventory_items i ON ap.item_id = i.item_id
    WHERE ap.appointment_id = ?
    ORDER BY i.name
  `;

  (req.db || db).query(query, [appointmentId], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Database error fetching parts.' });
    }

    const parts = rows || [];
    const subtotal = parts.reduce((sum, part) => {
      const lineTotal = Number(part.line_total) || (Number(part.unit_price) || 0) * (Number(part.quantity) || 0);
      return sum + lineTotal;
    }, 0);

    res.json({ parts, subtotal });
  });
};

exports.rateAppointment = (req, res) => {
  const { id } = req.params;
  const { rating, feedback } = req.body;
  const userId = req.userId;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Please provide a valid rating (1-5).' });
  }

  // Check appointment validity
  const checkQuery = 'SELECT * FROM appointments WHERE appointment_id = ?';
  (req.db || db).query(checkQuery, [id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Database error.' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    const appointment = results[0];

    if (appointment.customer_id !== userId) {
      return res.status(403).json({ message: 'Unauthorized.' });
    }

    if (appointment.status !== 'Completed') {
      return res.status(400).json({ message: 'You can only rate completed appointments.' });
    }

    // Check if already rated
    const checkRatingQuery = 'SELECT * FROM reviews WHERE appointment_id = ?';
    (req.db || db).query(checkRatingQuery, [id], (err, ratingResults) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database error.' });
      }

      if (ratingResults.length > 0) {
        return res.status(400).json({ message: 'You have already rated this appointment.' });
      }

      // Insert review
      const insertQuery = `
        INSERT INTO reviews (appointment_id, customer_id, technician_id, rating, feedback_text)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      (req.db || db).query(insertQuery, [id, userId, appointment.technician_id, rating, feedback], (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: 'Database error saving review.' });
        }

        // Manually update technician rating to ensure it syncs (in case trigger is missing/broken)
        const updateRatingQuery = `
          UPDATE technician_profiles 
          SET average_rating = (SELECT AVG(rating) FROM reviews WHERE technician_id = ?)
          WHERE user_id = ?
        `;

        (req.db || db).query(updateRatingQuery, [appointment.technician_id, appointment.technician_id], (updateErr) => {
          if (updateErr) {
            console.error('Error updating technician rating:', updateErr);
          }

          // Notify Technician about the review
          const notifQuery = 'INSERT INTO notifications (user_id, title, message, related_appointment_id) VALUES (?, ?, ?, ?)';
          const message = `New ${rating}-star rating received from a customer.`;
          (req.db || db).query(notifQuery, [appointment.technician_id, 'New Rating Received', message, id], (notifErr) => {
              if (notifErr) console.error('Error creating review notification:', notifErr);
          });

          res.status(201).json({ message: 'Rating submitted successfully.' });
        });
      });
    });
  });
};

exports.createWalkInAppointment = async (req, res) => {
  const { 
    customerId, 
    newUser, 
    walkinDetails, 
    serviceId, 
    technicianId,
    date, 
    time, 
    address, 
    notes,
    overrideConflict
  } = req.body;

  if (!serviceId || !date || !time || !address) {
    return res.status(400).json({ message: 'Please provide service, date, time, and address.' });
  }

  const appointmentDate = `${date} ${time}:00`;
  const connection = req.db || db;

  // Check conflict before transaction
  if (technicianId && technicianId !== 'unassigned' && !overrideConflict) {
      try {
          const simpleQuery = (sql, args) => {
              return new Promise((resolve, reject) => {
                  (req.db || db).query(sql, args, (err, rows) => {
                      if (err) return reject(err);
                      resolve(rows);
                  });
              });
          };
          
          const serviceRows = await simpleQuery('SELECT duration_minutes FROM services WHERE service_id = ?', [serviceId]);
          if (serviceRows.length > 0) {
              const duration = serviceRows[0].duration_minutes;
              const conflict = await checkTechnicianConflict(technicianId, appointmentDate, duration);
              if (conflict) {
                  return res.status(409).json({
                      message: `Technician is occupied by appointment #${conflict.conflictAppointmentId}. Please choose another technician or time.`,
                      conflictAppointmentId: conflict.conflictAppointmentId,
                      conflict: conflict
                  });
              }
          }
      } catch (err) {
          console.error('Conflict check error:', err);
          return res.status(500).json({ message: 'Error checking conflicts.' });
      }
  }

  const runTransaction = async () => {
    const query = (sql, args) => {
      return new Promise((resolve, reject) => {
        connection.query(sql, args, (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        });
      });
    };

    try {
      await query('START TRANSACTION', []);

      let finalCustomerId = customerId;

      // 1. Handle New User Creation
      if (newUser) {
        const { firstName, lastName, email, phone } = newUser;
        // Generate username and password
        const username = email.split('@')[0] + Math.floor(Math.random() * 10000);
        const password = Math.random().toString(36).slice(-8) + "1!"; // Simple random password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const userResult = await query(
          `INSERT INTO users (username, first_name, last_name, email, phone_number, password_hash, role, status)
           VALUES (?, ?, ?, ?, ?, ?, 'Customer', 'Active')`,
          [username, firstName, lastName, email, phone, hashedPassword]
        );
        finalCustomerId = userResult.insertId;
      }

      // 2. Create Appointment
      let insertQuery = '';
      let params = [];

      // Handle "unassigned" string from frontend
      const finalTechnicianId = (technicianId && technicianId !== 'unassigned') ? technicianId : null;

      if (finalCustomerId) {
        insertQuery = `
          INSERT INTO appointments (customer_id, service_id, technician_id, appointment_date, customer_notes, service_address, status, is_walk_in)
          VALUES (?, ?, ?, ?, ?, ?, 'Pending', 1)
        `;
        params = [finalCustomerId, serviceId, finalTechnicianId, appointmentDate, notes, address];
      } else if (walkinDetails) {
        // Guest Walk-in
        insertQuery = `
          INSERT INTO appointments (customer_id, service_id, technician_id, appointment_date, customer_notes, service_address, status, is_walk_in, walkin_name, walkin_phone, walkin_email)
          VALUES (NULL, ?, ?, ?, ?, ?, 'Pending', 1, ?, ?, ?)
        `;
        params = [serviceId, finalTechnicianId, appointmentDate, notes, address, walkinDetails.name, walkinDetails.phone, walkinDetails.email];
      } else {
        throw new Error('No customer information provided.');
      }

      const apptResult = await query(insertQuery, params);

      await query('COMMIT', []);
      
      res.status(201).json({ 
        message: 'Walk-in appointment created successfully.', 
        appointmentId: apptResult.insertId,
        userId: finalCustomerId 
      });

    } catch (error) {
      await query('ROLLBACK', []);
      console.error('Walk-in creation error:', error);
      res.status(500).json({ message: error.message || 'Database error.' });
    }
  };

  runTransaction();
};

exports.setAppointmentParts = (req, res) => {
  const appointmentId = Number(req.params.id);
  if (!Number.isFinite(appointmentId)) {
    return res.status(400).json({ message: 'Invalid appointment id.' });
  }

  const rawParts = Array.isArray(req.body.parts) ? req.body.parts : [];
  const partsMap = new Map();

  for (const part of rawParts) {
    const itemId = Number(part.itemId ?? part.item_id);
    const quantity = Number(part.quantity);

    if (!Number.isFinite(itemId) || itemId <= 0 || !Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({ message: 'Invalid parts payload.' });
    }

    partsMap.set(itemId, (partsMap.get(itemId) || 0) + quantity);
  }

  const parts = Array.from(partsMap.entries()).map(([itemId, quantity]) => ({ itemId, quantity }));

  const withConnection = (cb) => {
    if (req.db && typeof req.db.beginTransaction === 'function') {
      return cb(req.db, false);
    }

    db.getConnection((err, conn) => {
      if (err) {
        return res.status(500).json({ message: 'Database connection error.' });
      }
      cb(conn, true);
    });
  };

  withConnection(async (conn, shouldRelease) => {
    const query = (sql, params = []) => {
      return new Promise((resolve, reject) => {
        conn.query(sql, params, (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        });
      });
    };

    const begin = () => new Promise((resolve, reject) => conn.beginTransaction((err) => (err ? reject(err) : resolve())));
    const commit = () => new Promise((resolve, reject) => conn.commit((err) => (err ? reject(err) : resolve())));
    const rollback = () => new Promise((resolve) => conn.rollback(() => resolve()));

    try {
      await begin();

      const appointmentRows = await query('SELECT appointment_id FROM appointments WHERE appointment_id = ?', [appointmentId]);
      if (appointmentRows.length === 0) {
        throw { status: 404, message: 'Appointment not found.' };
      }

      const existingParts = await query(
        'SELECT item_id, quantity FROM appointment_parts WHERE appointment_id = ? FOR UPDATE',
        [appointmentId]
      );

      const deltaMap = new Map();
      existingParts.forEach((row) => {
        const itemId = row.item_id;
        const qty = Number(row.quantity) || 0;
        deltaMap.set(itemId, (deltaMap.get(itemId) || 0) + qty);
      });

      parts.forEach((part) => {
        deltaMap.set(part.itemId, (deltaMap.get(part.itemId) || 0) - part.quantity);
      });

      const allItemIds = Array.from(deltaMap.keys());
      const newItemIds = parts.map((part) => part.itemId);
      const priceMap = new Map();

      if (newItemIds.length > 0) {
        const itemRows = await query('SELECT item_id, unit_price FROM inventory_items WHERE item_id IN (?)', [newItemIds]);
        if (itemRows.length !== newItemIds.length) {
          throw { status: 400, message: 'One or more items were not found.' };
        }
        itemRows.forEach((row) => priceMap.set(row.item_id, Number(row.unit_price) || 0));
      }

      if (allItemIds.length > 0) {
        const stockRows = await query(
          'SELECT item_id, quantity_on_hand FROM inventory_stock WHERE item_id IN (?) FOR UPDATE',
          [allItemIds]
        );
        const stockMap = new Map();
        stockRows.forEach((row) => stockMap.set(row.item_id, Number(row.quantity_on_hand) || 0));

        const missingIds = allItemIds.filter((id) => !stockMap.has(id));
        for (const id of missingIds) {
          await query('INSERT INTO inventory_stock (item_id, quantity_on_hand) VALUES (?, 0)', [id]);
          stockMap.set(id, 0);
        }

        for (const id of allItemIds) {
          const currentQty = stockMap.get(id) || 0;
          const delta = deltaMap.get(id) || 0;
          const newQty = currentQty + delta;
          if (newQty < 0) {
            throw { status: 400, message: `Insufficient stock for item ${id}.` };
          }
        }

        for (const id of allItemIds) {
          const currentQty = stockMap.get(id) || 0;
          const delta = deltaMap.get(id) || 0;
          const newQty = currentQty + delta;
          await query('UPDATE inventory_stock SET quantity_on_hand = ? WHERE item_id = ?', [newQty, id]);
        }
      }

      await query('DELETE FROM appointment_parts WHERE appointment_id = ?', [appointmentId]);

      if (parts.length > 0) {
        for (const part of parts) {
          const unitPrice = priceMap.get(part.itemId) || 0;
          const lineTotal = unitPrice * part.quantity;
          await query(
            'INSERT INTO appointment_parts (appointment_id, item_id, quantity, unit_price, line_total) VALUES (?, ?, ?, ?, ?)',
            [appointmentId, part.itemId, part.quantity, unitPrice, lineTotal]
          );
        }
      }

      for (const [itemId, delta] of deltaMap.entries()) {
        if (!delta) continue;
        const txType = delta < 0 ? 'usage' : 'correction';
        const note = delta < 0 ? 'Parts used for appointment' : 'Appointment parts updated';
        await query(
          'INSERT INTO inventory_transactions (item_id, change_qty, transaction_type, reference_type, reference_id, note, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [itemId, delta, txType, 'appointment', appointmentId, note, req.userId || null]
        );
      }

      await commit();
      if (shouldRelease) conn.release();
      res.json({ message: 'Appointment parts updated.' });
    } catch (error) {
      await rollback();
      if (shouldRelease) conn.release();
      if (error && error.status) {
        return res.status(error.status).json({ message: error.message });
      }
      console.error('Error updating appointment parts:', error);
      res.status(500).json({ message: 'Error updating appointment parts.' });
    }
  });
};