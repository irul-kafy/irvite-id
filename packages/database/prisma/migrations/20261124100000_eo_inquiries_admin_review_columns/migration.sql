-- AlterTable: add admin review columns to eo_inquiries without overwriting applicant's notes
ALTER TABLE `eo_inquiries`
  ADD COLUMN `admin_notes` TEXT NULL,
  ADD COLUMN `reviewed_by` VARCHAR(191) NULL,
  ADD COLUMN `reviewed_at` DATETIME(3) NULL;
