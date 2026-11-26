-- AlterTable: add options JSON and pricing_version INT to orders without modifying existing order rows
ALTER TABLE `orders`
  ADD COLUMN `options` JSON NULL,
  ADD COLUMN `pricing_version` INT NOT NULL DEFAULT 1;
