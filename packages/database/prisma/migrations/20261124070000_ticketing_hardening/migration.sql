-- AlterTable: add percentage fee, fee payer, and promo columns to events (flat service_fee kept as deprecated)
ALTER TABLE `events`
  ADD COLUMN `service_fee_bps` INTEGER NOT NULL DEFAULT 350,
  ADD COLUMN `fee_payer` ENUM('BUYER', 'ORGANIZER') NOT NULL DEFAULT 'BUYER',
  ADD COLUMN `promo_fee_bps` INTEGER NULL,
  ADD COLUMN `promo_ends_at` DATETIME(3) NULL;

-- AlterTable: extend TicketOrderStatus with REFUND_PENDING and add fee snapshot + holder_names to ticket_orders
ALTER TABLE `ticket_orders`
  ADD COLUMN `service_fee_bps` INTEGER NOT NULL DEFAULT 350,
  ADD COLUMN `fee_payer` ENUM('BUYER', 'ORGANIZER') NOT NULL DEFAULT 'BUYER',
  ADD COLUMN `holder_names` JSON NULL,
  MODIFY COLUMN `status` ENUM('PENDING', 'PAID', 'EXPIRED', 'CANCELLED', 'REFUNDED', 'REFUND_PENDING') NOT NULL DEFAULT 'PENDING';

-- AlterTable: add access_token_hash and NEED_INFO status to eo_inquiries
ALTER TABLE `eo_inquiries`
  ADD COLUMN `access_token_hash` VARCHAR(191) NULL,
  MODIFY COLUMN `status` ENUM('PENDING', 'REVIEWED', 'NEED_INFO', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING';

-- DropIndex: remove duplicate non-unique indexes (unique indexes already exist)
DROP INDEX `ticket_orders_order_code_idx` ON `ticket_orders`;
DROP INDEX `issued_tickets_ticket_code_idx` ON `issued_tickets`;
