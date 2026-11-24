-- AlterTable: add sequence_number to issued_tickets
ALTER TABLE `issued_tickets`
  ADD COLUMN `sequence_number` INTEGER NOT NULL DEFAULT 1;

-- Backfill existing issued_tickets with ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY created_at, id)
UPDATE `issued_tickets` it
INNER JOIN (
  SELECT
    `id`,
    ROW_NUMBER() OVER (PARTITION BY `order_id` ORDER BY `created_at` ASC, `id` ASC) AS `seq`
  FROM `issued_tickets`
) ranked ON it.`id` = ranked.`id`
SET it.`sequence_number` = ranked.`seq`;

-- CreateIndex: enforce unique (order_id, sequence_number) on issued_tickets
CREATE UNIQUE INDEX `issued_tickets_order_id_sequence_number_key`
  ON `issued_tickets`(`order_id`, `sequence_number`);

-- CreateTable: payment_events for webhook audit, replay detection, and money reconciliation
CREATE TABLE `payment_events` (
  `id` VARCHAR(191) NOT NULL,
  `order_code` VARCHAR(64) NOT NULL,
  `provider` VARCHAR(40) NOT NULL,
  `provider_event_id` VARCHAR(191) NULL,
  `raw_status` VARCHAR(40) NOT NULL,
  `gross_amount` INTEGER NULL,
  `signature_valid` BOOLEAN NOT NULL,
  `outcome` VARCHAR(40) NOT NULL,
  `payload` JSON NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `payment_events_provider_event_id_key`(`provider_event_id`),
  INDEX `payment_events_order_code_created_at_idx`(`order_code`, `created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
