-- AlterTable: add is_walk_in flag to guests
ALTER TABLE `guests` ADD COLUMN `is_walk_in` BOOLEAN NOT NULL DEFAULT false;

-- Backfill is_walk_in = true for existing auto-created walk-in guests:
-- category = 'ON_THE_SPOT', has an Attendance with exactly 1 AttendanceCheckIn, and no RSVP
UPDATE `guests` g
INNER JOIN `invitations` i ON i.`guest_id` = g.`id`
INNER JOIN `attendances` a ON a.`invitation_id` = i.`id`
SET g.`is_walk_in` = true
WHERE UPPER(g.`category`) = 'ON_THE_SPOT'
  AND i.`status` NOT IN ('RSVP_YES', 'RSVP_NO')
  AND i.`rsvp_pax` IS NULL
  AND (
    SELECT COUNT(*)
    FROM `attendance_check_ins` aci
    WHERE aci.`attendance_id` = a.`id`
  ) = 1;
