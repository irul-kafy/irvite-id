-- DropForeignKey: allow issued_ticket_id to be nullable so INVALID/rejected check-in attempts are audited
ALTER TABLE `ticket_check_in_logs`
  DROP FOREIGN KEY `ticket_check_in_logs_issued_ticket_id_fkey`;

-- AlterTable: add actor_user_id, reason, sync_op_id (idempotency key), and make issued_ticket_id nullable
ALTER TABLE `ticket_check_in_logs`
  MODIFY COLUMN `issued_ticket_id` VARCHAR(191) NULL,
  ADD COLUMN `actor_user_id` VARCHAR(191) NULL,
  ADD COLUMN `reason` VARCHAR(300) NULL,
  ADD COLUMN `sync_op_id` VARCHAR(191) NULL;

-- CreateIndex: enforce unique sync_op_id for ticket offline sync idempotency
CREATE UNIQUE INDEX `ticket_check_in_logs_sync_op_id_key`
  ON `ticket_check_in_logs`(`sync_op_id`);

-- AddForeignKey
ALTER TABLE `ticket_check_in_logs`
  ADD CONSTRAINT `ticket_check_in_logs_issued_ticket_id_fkey`
  FOREIGN KEY (`issued_ticket_id`) REFERENCES `issued_tickets`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
