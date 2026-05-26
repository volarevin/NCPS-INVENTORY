-- Seed inventory categories
INSERT IGNORE INTO inventory_categories (name, description) VALUES
  ('Cameras', 'CCTV cameras and imaging devices'),
  ('Recording & Storage', 'Recorders, drives, and storage media'),
  ('Cabling & Connectors', 'Cables, connectors, and terminations'),
  ('Power & Protection', 'Power supplies and protection devices'),
  ('Networking', 'Network switches, routers, and injectors'),
  ('Mounting & Accessories', 'Mounts, junction boxes, and conduits'),
  ('Computer Parts', 'PC components and replacements'),
  ('Tools & Consumables', 'Consumables and small shop items');

-- Seed inventory items (upsert by SKU)
INSERT INTO inventory_items (sku, name, category_id, unit, unit_cost, unit_price, reorder_level, is_active)
VALUES
  ('CAM-DOME-4MP', '4MP Dome Camera', (SELECT category_id FROM inventory_categories WHERE name = 'Cameras'), 'pcs', 1200.00, 1800.00, 5, 1),
  ('CAM-BULLET-4MP', '4MP Bullet Camera', (SELECT category_id FROM inventory_categories WHERE name = 'Cameras'), 'pcs', 1300.00, 1900.00, 5, 1),
  ('CAM-PTZ-2MP', '2MP PTZ Camera', (SELECT category_id FROM inventory_categories WHERE name = 'Cameras'), 'pcs', 4200.00, 5200.00, 2, 1),
  ('CAM-INDOOR-2MP', '2MP Indoor Camera', (SELECT category_id FROM inventory_categories WHERE name = 'Cameras'), 'pcs', 900.00, 1400.00, 3, 1),

  ('DVR-4CH', '4-Channel DVR', (SELECT category_id FROM inventory_categories WHERE name = 'Recording & Storage'), 'pcs', 2500.00, 3200.00, 2, 1),
  ('DVR-8CH', '8-Channel DVR', (SELECT category_id FROM inventory_categories WHERE name = 'Recording & Storage'), 'pcs', 3600.00, 4500.00, 2, 1),
  ('NVR-4CH', '4-Channel NVR', (SELECT category_id FROM inventory_categories WHERE name = 'Recording & Storage'), 'pcs', 3200.00, 4200.00, 2, 1),
  ('HDD-1TB', '1TB Surveillance HDD', (SELECT category_id FROM inventory_categories WHERE name = 'Recording & Storage'), 'pcs', 1400.00, 1900.00, 5, 1),
  ('HDD-2TB', '2TB Surveillance HDD', (SELECT category_id FROM inventory_categories WHERE name = 'Recording & Storage'), 'pcs', 2000.00, 2600.00, 4, 1),

  ('CABLE-RG59', 'RG59 Coax Cable', (SELECT category_id FROM inventory_categories WHERE name = 'Cabling & Connectors'), 'm', 20.00, 35.00, 50, 1),
  ('CABLE-CAT6', 'Cat6 UTP Cable', (SELECT category_id FROM inventory_categories WHERE name = 'Cabling & Connectors'), 'm', 18.00, 30.00, 50, 1),
  ('CONN-BNC', 'BNC Connector', (SELECT category_id FROM inventory_categories WHERE name = 'Cabling & Connectors'), 'pcs', 8.00, 15.00, 50, 1),
  ('CONN-RJ45', 'RJ45 Connector', (SELECT category_id FROM inventory_categories WHERE name = 'Cabling & Connectors'), 'pcs', 3.00, 8.00, 80, 1),
  ('CONN-DC', 'DC Barrel Connector', (SELECT category_id FROM inventory_categories WHERE name = 'Cabling & Connectors'), 'pcs', 5.00, 12.00, 30, 1),
  ('CABLE-POWER', '2-Core Power Cable', (SELECT category_id FROM inventory_categories WHERE name = 'Cabling & Connectors'), 'm', 10.00, 18.00, 40, 1),

  ('PSU-12V5A', '12V 5A Power Supply', (SELECT category_id FROM inventory_categories WHERE name = 'Power & Protection'), 'pcs', 180.00, 280.00, 5, 1),
  ('PSU-12V10A', '12V 10A Power Supply', (SELECT category_id FROM inventory_categories WHERE name = 'Power & Protection'), 'pcs', 320.00, 480.00, 3, 1),
  ('UPS-650VA', '650VA UPS', (SELECT category_id FROM inventory_categories WHERE name = 'Power & Protection'), 'pcs', 2200.00, 2800.00, 2, 1),
  ('POE-INJ', 'PoE Injector', (SELECT category_id FROM inventory_categories WHERE name = 'Networking'), 'pcs', 350.00, 500.00, 2, 1),

  ('SWITCH-8PORT', '8-Port Gigabit Switch', (SELECT category_id FROM inventory_categories WHERE name = 'Networking'), 'pcs', 900.00, 1300.00, 2, 1),
  ('ROUTER-AC', 'AC1200 Wi-Fi Router', (SELECT category_id FROM inventory_categories WHERE name = 'Networking'), 'pcs', 1000.00, 1500.00, 2, 1),

  ('BRACKET-WALL', 'Universal Wall Mount', (SELECT category_id FROM inventory_categories WHERE name = 'Mounting & Accessories'), 'pcs', 120.00, 200.00, 8, 1),
  ('JBOX-ROUND', 'Round Junction Box', (SELECT category_id FROM inventory_categories WHERE name = 'Mounting & Accessories'), 'pcs', 60.00, 120.00, 8, 1),
  ('CONDUIT-20MM', 'PVC Conduit 20mm', (SELECT category_id FROM inventory_categories WHERE name = 'Mounting & Accessories'), 'm', 15.00, 25.00, 30, 1),

  ('RAM-8GB-DDR4', '8GB DDR4 RAM', (SELECT category_id FROM inventory_categories WHERE name = 'Computer Parts'), 'pcs', 900.00, 1300.00, 3, 1),
  ('SSD-480GB', '480GB SATA SSD', (SELECT category_id FROM inventory_categories WHERE name = 'Computer Parts'), 'pcs', 1100.00, 1600.00, 2, 1),
  ('PSU-500W', '500W Power Supply', (SELECT category_id FROM inventory_categories WHERE name = 'Computer Parts'), 'pcs', 1200.00, 1700.00, 2, 1),
  ('FAN-120MM', '120mm Case Fan', (SELECT category_id FROM inventory_categories WHERE name = 'Computer Parts'), 'pcs', 150.00, 250.00, 4, 1),

  ('CABLE-TIE', 'Cable Ties (100 pack)', (SELECT category_id FROM inventory_categories WHERE name = 'Tools & Consumables'), 'pack', 80.00, 140.00, 3, 1),
  ('TAPE-INS', 'Electrical Tape', (SELECT category_id FROM inventory_categories WHERE name = 'Tools & Consumables'), 'roll', 25.00, 45.00, 8, 1),
  ('THERMAL-PASTE', 'Thermal Paste', (SELECT category_id FROM inventory_categories WHERE name = 'Tools & Consumables'), 'tube', 120.00, 180.00, 3, 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  category_id = VALUES(category_id),
  unit = VALUES(unit),
  unit_cost = VALUES(unit_cost),
  unit_price = VALUES(unit_price),
  reorder_level = VALUES(reorder_level),
  is_active = VALUES(is_active);

-- Seed inventory stock (idempotent)
INSERT INTO inventory_stock (item_id, quantity_on_hand)
SELECT item_id, 12 FROM inventory_items WHERE sku = 'CAM-DOME-4MP'
ON DUPLICATE KEY UPDATE quantity_on_hand = VALUES(quantity_on_hand);

INSERT INTO inventory_stock (item_id, quantity_on_hand)
SELECT item_id, 10 FROM inventory_items WHERE sku = 'CAM-BULLET-4MP'
ON DUPLICATE KEY UPDATE quantity_on_hand = VALUES(quantity_on_hand);

INSERT INTO inventory_stock (item_id, quantity_on_hand)
SELECT item_id, 4 FROM inventory_items WHERE sku = 'CAM-PTZ-2MP'
ON DUPLICATE KEY UPDATE quantity_on_hand = VALUES(quantity_on_hand);

INSERT INTO inventory_stock (item_id, quantity_on_hand)
SELECT item_id, 8 FROM inventory_items WHERE sku = 'CAM-INDOOR-2MP'
ON DUPLICATE KEY UPDATE quantity_on_hand = VALUES(quantity_on_hand);

INSERT INTO inventory_stock (item_id, quantity_on_hand)
SELECT item_id, 6 FROM inventory_items WHERE sku = 'DVR-4CH'
ON DUPLICATE KEY UPDATE quantity_on_hand = VALUES(quantity_on_hand);

INSERT INTO inventory_stock (item_id, quantity_on_hand)
SELECT item_id, 4 FROM inventory_items WHERE sku = 'DVR-8CH'
ON DUPLICATE KEY UPDATE quantity_on_hand = VALUES(quantity_on_hand);

INSERT INTO inventory_stock (item_id, quantity_on_hand)
SELECT item_id, 4 FROM inventory_items WHERE sku = 'NVR-4CH'
ON DUPLICATE KEY UPDATE quantity_on_hand = VALUES(quantity_on_hand);

INSERT INTO inventory_stock (item_id, quantity_on_hand)
SELECT item_id, 12 FROM inventory_items WHERE sku = 'HDD-1TB'
ON DUPLICATE KEY UPDATE quantity_on_hand = VALUES(quantity_on_hand);

INSERT INTO inventory_stock (item_id, quantity_on_hand)
SELECT item_id, 8 FROM inventory_items WHERE sku = 'HDD-2TB'
ON DUPLICATE KEY UPDATE quantity_on_hand = VALUES(quantity_on_hand);

INSERT INTO inventory_stock (item_id, quantity_on_hand)
SELECT item_id, 200 FROM inventory_items WHERE sku = 'CABLE-RG59'
ON DUPLICATE KEY UPDATE quantity_on_hand = VALUES(quantity_on_hand);

INSERT INTO inventory_stock (item_id, quantity_on_hand)
SELECT item_id, 200 FROM inventory_items WHERE sku = 'CABLE-CAT6'
ON DUPLICATE KEY UPDATE quantity_on_hand = VALUES(quantity_on_hand);

INSERT INTO inventory_stock (item_id, quantity_on_hand)
SELECT item_id, 150 FROM inventory_items WHERE sku = 'CONN-BNC'
ON DUPLICATE KEY UPDATE quantity_on_hand = VALUES(quantity_on_hand);

INSERT INTO inventory_stock (item_id, quantity_on_hand)
SELECT item_id, 200 FROM inventory_items WHERE sku = 'CONN-RJ45'
ON DUPLICATE KEY UPDATE quantity_on_hand = VALUES(quantity_on_hand);

INSERT INTO inventory_stock (item_id, quantity_on_hand)
SELECT item_id, 100 FROM inventory_items WHERE sku = 'CONN-DC'
ON DUPLICATE KEY UPDATE quantity_on_hand = VALUES(quantity_on_hand);

INSERT INTO inventory_stock (item_id, quantity_on_hand)
SELECT item_id, 150 FROM inventory_items WHERE sku = 'CABLE-POWER'
ON DUPLICATE KEY UPDATE quantity_on_hand = VALUES(quantity_on_hand);

INSERT INTO inventory_stock (item_id, quantity_on_hand)
SELECT item_id, 15 FROM inventory_items WHERE sku = 'PSU-12V5A'
ON DUPLICATE KEY UPDATE quantity_on_hand = VALUES(quantity_on_hand);

INSERT INTO inventory_stock (item_id, quantity_on_hand)
SELECT item_id, 8 FROM inventory_items WHERE sku = 'PSU-12V10A'
ON DUPLICATE KEY UPDATE quantity_on_hand = VALUES(quantity_on_hand);

INSERT INTO inventory_stock (item_id, quantity_on_hand)
SELECT item_id, 4 FROM inventory_items WHERE sku = 'UPS-650VA'
ON DUPLICATE KEY UPDATE quantity_on_hand = VALUES(quantity_on_hand);

INSERT INTO inventory_stock (item_id, quantity_on_hand)
SELECT item_id, 6 FROM inventory_items WHERE sku = 'POE-INJ'
ON DUPLICATE KEY UPDATE quantity_on_hand = VALUES(quantity_on_hand);

INSERT INTO inventory_stock (item_id, quantity_on_hand)
SELECT item_id, 6 FROM inventory_items WHERE sku = 'SWITCH-8PORT'
ON DUPLICATE KEY UPDATE quantity_on_hand = VALUES(quantity_on_hand);

INSERT INTO inventory_stock (item_id, quantity_on_hand)
SELECT item_id, 5 FROM inventory_items WHERE sku = 'ROUTER-AC'
ON DUPLICATE KEY UPDATE quantity_on_hand = VALUES(quantity_on_hand);

INSERT INTO inventory_stock (item_id, quantity_on_hand)
SELECT item_id, 20 FROM inventory_items WHERE sku = 'BRACKET-WALL'
ON DUPLICATE KEY UPDATE quantity_on_hand = VALUES(quantity_on_hand);

INSERT INTO inventory_stock (item_id, quantity_on_hand)
SELECT item_id, 20 FROM inventory_items WHERE sku = 'JBOX-ROUND'
ON DUPLICATE KEY UPDATE quantity_on_hand = VALUES(quantity_on_hand);

INSERT INTO inventory_stock (item_id, quantity_on_hand)
SELECT item_id, 120 FROM inventory_items WHERE sku = 'CONDUIT-20MM'
ON DUPLICATE KEY UPDATE quantity_on_hand = VALUES(quantity_on_hand);

INSERT INTO inventory_stock (item_id, quantity_on_hand)
SELECT item_id, 8 FROM inventory_items WHERE sku = 'RAM-8GB-DDR4'
ON DUPLICATE KEY UPDATE quantity_on_hand = VALUES(quantity_on_hand);

INSERT INTO inventory_stock (item_id, quantity_on_hand)
SELECT item_id, 6 FROM inventory_items WHERE sku = 'SSD-480GB'
ON DUPLICATE KEY UPDATE quantity_on_hand = VALUES(quantity_on_hand);

INSERT INTO inventory_stock (item_id, quantity_on_hand)
SELECT item_id, 5 FROM inventory_items WHERE sku = 'PSU-500W'
ON DUPLICATE KEY UPDATE quantity_on_hand = VALUES(quantity_on_hand);

INSERT INTO inventory_stock (item_id, quantity_on_hand)
SELECT item_id, 12 FROM inventory_items WHERE sku = 'FAN-120MM'
ON DUPLICATE KEY UPDATE quantity_on_hand = VALUES(quantity_on_hand);

INSERT INTO inventory_stock (item_id, quantity_on_hand)
SELECT item_id, 10 FROM inventory_items WHERE sku = 'CABLE-TIE'
ON DUPLICATE KEY UPDATE quantity_on_hand = VALUES(quantity_on_hand);

INSERT INTO inventory_stock (item_id, quantity_on_hand)
SELECT item_id, 20 FROM inventory_items WHERE sku = 'TAPE-INS'
ON DUPLICATE KEY UPDATE quantity_on_hand = VALUES(quantity_on_hand);

INSERT INTO inventory_stock (item_id, quantity_on_hand)
SELECT item_id, 10 FROM inventory_items WHERE sku = 'THERMAL-PASTE'
ON DUPLICATE KEY UPDATE quantity_on_hand = VALUES(quantity_on_hand);
