const db = require('../config/db');

const parseNumber = (value, fallback) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const toInteger = (value) => {
  return Math.round(value);
};

const getConnection = (req, res, cb) => {
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

const getCategoryId = (conn, name, cb) => {
  if (!name) {
    return cb(null, null);
  }

  conn.query('SELECT category_id FROM inventory_categories WHERE name = ?', [name], (err, rows) => {
    if (err) return cb(err);
    if (rows.length > 0) return cb(null, rows[0].category_id);

    conn.query('INSERT INTO inventory_categories (name) VALUES (?)', [name], (insertErr, result) => {
      if (insertErr) return cb(insertErr);
      cb(null, result.insertId);
    });
  });
};

exports.getCategories = (req, res) => {
  (req.db || db).query(
    'SELECT category_id, name FROM inventory_categories ORDER BY name',
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'Database error.' });
      res.json(rows);
    }
  );
};

exports.getItems = (req, res) => {
  const query = `
    SELECT
      i.item_id,
      i.sku,
      i.image_path,
      i.name,
      i.unit,
      i.unit_cost,
      i.unit_price,
      i.reorder_level,
      i.is_active,
      c.name AS category_name,
      IFNULL(s.quantity_on_hand, 0) AS quantity_on_hand
    FROM inventory_items i
    LEFT JOIN inventory_categories c ON i.category_id = c.category_id
    LEFT JOIN inventory_stock s ON i.item_id = s.item_id
    ORDER BY i.name
  `;

  (req.db || db).query(query, (err, rows) => {
    if (err) return res.status(500).json({ message: 'Database error.' });
    res.json(rows);
  });
};

exports.createItem = (req, res) => {
  const name = (req.body.name || '').trim();
  const sku = (req.body.sku || '').trim();
  const imagePath = (req.body.imagePath || req.body.image_path || '').trim();
  const category = (req.body.category || '').trim();
  const unit = (req.body.unit || 'pcs').trim();
  const unitCost = parseNumber(req.body.unitCost, 0);
  const unitPrice = parseNumber(req.body.unitPrice, 0);
  const reorderLevel = parseNumber(req.body.reorderLevel, 0);
  const initialQuantity = parseNumber(req.body.initialQuantity, 0);

  if (!name) {
    return res.status(400).json({ message: 'Item name is required.' });
  }

  if (initialQuantity < 0) {
    return res.status(400).json({ message: 'Initial quantity cannot be negative.' });
  }

  getConnection(req, res, (conn, shouldRelease) => {
    conn.beginTransaction((err) => {
      if (err) {
        if (shouldRelease) conn.release();
        return res.status(500).json({ message: 'Database transaction error.' });
      }

      getCategoryId(conn, category, (catErr, categoryId) => {
        if (catErr) {
          return conn.rollback(() => {
            if (shouldRelease) conn.release();
            res.status(500).json({ message: 'Error resolving category.' });
          });
        }

        const insertItemQuery = `
          INSERT INTO inventory_items
            (sku, name, image_path, category_id, unit, unit_cost, unit_price, reorder_level, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        conn.query(
          insertItemQuery,
          [sku || null, name, imagePath || null, categoryId, unit, unitCost, unitPrice, reorderLevel, 1],
          (itemErr, result) => {
            if (itemErr) {
              return conn.rollback(() => {
                if (shouldRelease) conn.release();
                res.status(500).json({ message: 'Error creating item.' });
              });
            }

            const itemId = result.insertId;

            conn.query(
              'INSERT INTO inventory_stock (item_id, quantity_on_hand) VALUES (?, ?)',
              [itemId, initialQuantity],
              (stockErr) => {
                if (stockErr) {
                  return conn.rollback(() => {
                    if (shouldRelease) conn.release();
                    res.status(500).json({ message: 'Error creating stock record.' });
                  });
                }

                const logInitialStock = initialQuantity > 0;
                if (!logInitialStock) {
                  return conn.commit((commitErr) => {
                    if (commitErr) {
                      return conn.rollback(() => {
                        if (shouldRelease) conn.release();
                        res.status(500).json({ message: 'Error committing transaction.' });
                      });
                    }
                    if (shouldRelease) conn.release();
                    res.status(201).json({ message: 'Item created successfully', itemId });
                  });
                }

                const txQuery = `
                  INSERT INTO inventory_transactions
                    (item_id, change_qty, transaction_type, reference_type, reference_id, note, created_by)
                  VALUES (?, ?, 'restock', 'initial', NULL, 'Initial stock', ?)
                `;

                conn.query(txQuery, [itemId, initialQuantity, req.userId || null], (txErr) => {
                  if (txErr) {
                    return conn.rollback(() => {
                      if (shouldRelease) conn.release();
                      res.status(500).json({ message: 'Error logging initial stock.' });
                    });
                  }

                  conn.commit((commitErr) => {
                    if (commitErr) {
                      return conn.rollback(() => {
                        if (shouldRelease) conn.release();
                        res.status(500).json({ message: 'Error committing transaction.' });
                      });
                    }
                    if (shouldRelease) conn.release();
                    res.status(201).json({ message: 'Item created successfully', itemId });
                  });
                });
              }
            );
          }
        );
      });
    });
  });
};

exports.updateItem = (req, res) => {
  const { id } = req.params;
  const name = (req.body.name || '').trim();
  const sku = (req.body.sku || '').trim();
  const imagePath = (req.body.imagePath || req.body.image_path || '').trim();
  const category = (req.body.category || '').trim();
  const unit = (req.body.unit || 'pcs').trim();
  const unitCost = parseNumber(req.body.unitCost, 0);
  const unitPrice = parseNumber(req.body.unitPrice, 0);
  const reorderLevel = parseNumber(req.body.reorderLevel, 0);
  const isActive = req.body.isActive === false ? 0 : 1;

  if (!name) {
    return res.status(400).json({ message: 'Item name is required.' });
  }

  getConnection(req, res, (conn, shouldRelease) => {
    conn.beginTransaction((err) => {
      if (err) {
        if (shouldRelease) conn.release();
        return res.status(500).json({ message: 'Database transaction error.' });
      }

      getCategoryId(conn, category, (catErr, categoryId) => {
        if (catErr) {
          return conn.rollback(() => {
            if (shouldRelease) conn.release();
            res.status(500).json({ message: 'Error resolving category.' });
          });
        }

        const updateQuery = `
          UPDATE inventory_items
          SET sku = ?, name = ?, image_path = ?, category_id = ?, unit = ?, unit_cost = ?, unit_price = ?, reorder_level = ?, is_active = ?
          WHERE item_id = ?
        `;

        conn.query(
          updateQuery,
          [sku || null, name, imagePath || null, categoryId, unit, unitCost, unitPrice, reorderLevel, isActive, id],
          (updateErr) => {
            if (updateErr) {
              return conn.rollback(() => {
                if (shouldRelease) conn.release();
                res.status(500).json({ message: 'Error updating item.' });
              });
            }

            conn.commit((commitErr) => {
              if (commitErr) {
                return conn.rollback(() => {
                  if (shouldRelease) conn.release();
                  res.status(500).json({ message: 'Error committing transaction.' });
                });
              }
              if (shouldRelease) conn.release();
              res.json({ message: 'Item updated successfully' });
            });
          }
        );
      });
    });
  });
};

exports.adjustStock = (req, res) => {
  const { id } = req.params;
  const rawDelta = parseNumber(req.body.delta, null);
  const reason = (req.body.reason || '').trim();
  const transactionType = ['adjustment', 'restock', 'correction'].includes(req.body.transactionType)
    ? req.body.transactionType
    : 'adjustment';

  const delta = Number.isFinite(rawDelta) ? toInteger(rawDelta) : rawDelta;

  if (!Number.isFinite(delta) || delta === 0) {
    return res.status(400).json({ message: 'Stock change amount is required.' });
  }

  getConnection(req, res, (conn, shouldRelease) => {
    conn.beginTransaction((err) => {
      if (err) {
        if (shouldRelease) conn.release();
        return res.status(500).json({ message: 'Database transaction error.' });
      }

      conn.query('SELECT quantity_on_hand FROM inventory_stock WHERE item_id = ? FOR UPDATE', [id], (selectErr, rows) => {
        if (selectErr) {
          return conn.rollback(() => {
            if (shouldRelease) conn.release();
            res.status(500).json({ message: 'Error reading stock.' });
          });
        }

        const currentQty = rows.length > 0 ? toInteger(Number(rows[0].quantity_on_hand)) : 0;
        const newQty = toInteger(currentQty + delta);

        if (newQty < 0) {
          return conn.rollback(() => {
            if (shouldRelease) conn.release();
            res.status(400).json({ message: 'Insufficient stock for this adjustment.' });
          });
        }

        const ensureStock = rows.length > 0
          ? (cb) => cb(null)
          : (cb) => conn.query('INSERT INTO inventory_stock (item_id, quantity_on_hand) VALUES (?, ?)', [id, 0], cb);

        ensureStock((ensureErr) => {
          if (ensureErr) {
            return conn.rollback(() => {
              if (shouldRelease) conn.release();
              res.status(500).json({ message: 'Error preparing stock record.' });
            });
          }

          conn.query(
            'UPDATE inventory_stock SET quantity_on_hand = ? WHERE item_id = ?',
            [newQty, id],
            (updateErr) => {
              if (updateErr) {
                return conn.rollback(() => {
                  if (shouldRelease) conn.release();
                  res.status(500).json({ message: 'Error updating stock.' });
                });
              }

              const txQuery = `
                INSERT INTO inventory_transactions
                  (item_id, change_qty, transaction_type, reference_type, reference_id, note, created_by)
                VALUES (?, ?, ?, 'manual', NULL, ?, ?)
              `;

              conn.query(txQuery, [id, delta, transactionType, reason || null, req.userId || null], (txErr) => {
                if (txErr) {
                  return conn.rollback(() => {
                    if (shouldRelease) conn.release();
                    res.status(500).json({ message: 'Error logging stock transaction.' });
                  });
                }

                conn.commit((commitErr) => {
                  if (commitErr) {
                    return conn.rollback(() => {
                      if (shouldRelease) conn.release();
                      res.status(500).json({ message: 'Error committing transaction.' });
                    });
                  }
                  if (shouldRelease) conn.release();
                  res.json({ message: 'Stock adjusted successfully', quantity_on_hand: newQty });
                });
              });
            }
          );
        });
      });
    });
  });
};

exports.getItemTransactions = (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT transaction_id, item_id, change_qty, transaction_type, reference_type, reference_id, note, created_by, created_at
    FROM inventory_transactions
    WHERE item_id = ?
    ORDER BY created_at DESC
    LIMIT 200
  `;

  (req.db || db).query(query, [id], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Database error.' });
    res.json(rows);
  });
};

exports.deleteItem = (req, res) => {
  const { id } = req.params;

  getConnection(req, res, (conn, shouldRelease) => {
    conn.beginTransaction((err) => {
      if (err) {
        if (shouldRelease) conn.release();
        return res.status(500).json({ message: 'Database transaction error.' });
      }

      const cleanupQueries = [
        ['DELETE FROM inventory_transactions WHERE item_id = ?', [id]],
        ['DELETE FROM appointment_parts WHERE item_id = ?', [id]],
        ['DELETE FROM inventory_stock WHERE item_id = ?', [id]],
        ['DELETE FROM inventory_items WHERE item_id = ?', [id]],
      ];

      const runNext = (index) => {
        if (index >= cleanupQueries.length) {
          return conn.commit((commitErr) => {
            if (commitErr) {
              return conn.rollback(() => {
                if (shouldRelease) conn.release();
                res.status(500).json({ message: 'Error committing delete.' });
              });
            }
            if (shouldRelease) conn.release();
            res.json({ message: 'Item deleted successfully.' });
          });
        }

        const [sql, params] = cleanupQueries[index];
        conn.query(sql, params, (queryErr, result) => {
          if (queryErr) {
            return conn.rollback(() => {
              if (shouldRelease) conn.release();
              res.status(500).json({ message: 'Database error or item is referenced elsewhere.' });
            });
          }

          if (index === cleanupQueries.length - 1 && result.affectedRows === 0) {
            return conn.rollback(() => {
              if (shouldRelease) conn.release();
              res.status(404).json({ message: 'Item not found.' });
            });
          }

          runNext(index + 1);
        });
      };

      runNext(0);
    });
  });
};
