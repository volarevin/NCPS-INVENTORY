-- Add image_path to inventory_items (idempotent)
DROP PROCEDURE IF EXISTS AddInventoryImagePath;

DELIMITER //
CREATE PROCEDURE AddInventoryImagePath()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'inventory_items'
      AND column_name = 'image_path'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN image_path VARCHAR(255) NULL AFTER name;
  END IF;
END //
DELIMITER ;

CALL AddInventoryImagePath();
DROP PROCEDURE AddInventoryImagePath;

-- Seed default image paths based on SKU
UPDATE inventory_items
SET image_path = CONCAT('/uploads/inventory/', sku, '.jpg')
WHERE image_path IS NULL AND sku IS NOT NULL;
