CREATE TABLE `appointment_slots` (
	`slot_key` text PRIMARY KEY NOT NULL,
	`appointment_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_appointment_slots_appointment` ON `appointment_slots` (`appointment_id`);
--> statement-breakpoint
INSERT INTO `appointment_slots` (`slot_key`, `appointment_id`, `created_at`)
WITH RECURSIVE `occupied` (`appointment_id`, `appointment_date`, `minute`, `finish`, `created_at`) AS (
	SELECT
		`id`,
		`appointment_date`,
		CAST(substr(`start_time`, 1, 2) AS INTEGER) * 60 + CAST(substr(`start_time`, 4, 2) AS INTEGER),
		CAST(substr(`start_time`, 1, 2) AS INTEGER) * 60 + CAST(substr(`start_time`, 4, 2) AS INTEGER) + `duration_minutes` + COALESCE((SELECT CAST(`value` AS INTEGER) FROM `studio_settings` WHERE `key` = 'buffer_minutes'), 0),
		`created_at`
	FROM `appointments`
	WHERE `status` != 'cancelled'
	UNION ALL
	SELECT `appointment_id`, `appointment_date`, `minute` + 30, `finish`, `created_at`
	FROM `occupied`
	WHERE `minute` + 30 < `finish`
)
SELECT
	`appointment_date` || '|' || printf('%02d:%02d', CAST(`minute` / 60 AS INTEGER), `minute` % 60) || '|staff_owner',
	`appointment_id`,
	`created_at`
FROM `occupied`;
