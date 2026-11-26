-- Backfill is_walk_in = true for legacy walk-in guests with category ON_THE_SPOT
-- that have an Attendance record but ZERO attendance_check_ins rows (created before check-in audit rows existed)
UPDATE `guests` g
INNER JOIN `invitations` i ON i.`guest_id` = g.`id`
INNER JOIN `attendances` a ON a.`invitation_id` = i.`id`
SET g.`is_walk_in` = true
WHERE UPPER(TRIM(g.`category`)) IN ('ON_THE_SPOT', 'ON THE SPOT')
  AND i.`status` NOT IN ('RSVP_YES', 'RSVP_NO')
  AND i.`rsvp_pax` IS NULL
  AND (
    SELECT COUNT(*)
    FROM `attendance_check_ins` aci
    WHERE aci.`attendance_id` = a.`id`
  ) = 0;
