-- Inventory categories
CREATE TABLE IF NOT EXISTS inventory_categories (
  category_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_inventory_category_name (name)
);

-- Inventory items
CREATE TABLE IF NOT EXISTS inventory_items (
  item_id INT AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(50) NULL,
  name VARCHAR(150) NOT NULL,
  category_id INT NULL,
  unit VARCHAR(20) DEFAULT 'pcs',
  unit_cost DECIMAL(10,2) DEFAULT 0.00,
  unit_price DECIMAL(10,2) DEFAULT 0.00,
  reorder_level DECIMAL(10,2) DEFAULT 0.00,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_inventory_sku (sku),
  INDEX idx_inventory_category (category_id),
  INDEX idx_inventory_name (name)
);

-- Current stock per item (single location)
CREATE TABLE IF NOT EXISTS inventory_stock (
  item_id INT PRIMARY KEY,
  quantity_on_hand DECIMAL(10,2) DEFAULT 0.00,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Stock transactions (audit trail)
CREATE TABLE IF NOT EXISTS inventory_transactions (
  transaction_id INT AUTO_INCREMENT PRIMARY KEY,
  item_id INT NOT NULL,
  change_qty DECIMAL(10,2) NOT NULL,
  transaction_type ENUM('adjustment','usage','restock','correction') NOT NULL,
  reference_type VARCHAR(50) NULL,
  reference_id INT NULL,
  note TEXT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_inventory_tx_item (item_id),
  INDEX idx_inventory_tx_created (created_at)
);

-- Parts used per appointment
CREATE TABLE IF NOT EXISTS appointment_parts (
  appointment_id INT NOT NULL,
  item_id INT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) DEFAULT 0.00,
  line_total DECIMAL(10,2) DEFAULT 0.00,
  note TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (appointment_id, item_id),
  INDEX idx_appt_parts_item (item_id)
);
