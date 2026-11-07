CREATE TABLE `backup_runs` (
	`id` char(36) NOT NULL,
	`source` enum('schedule','manual') NOT NULL,
	`started_by` char(36),
	`status` enum('running','succeeded','failed') NOT NULL,
	`started_at` datetime(0) NOT NULL,
	`finished_at` datetime(0),
	`file_name` varchar(100),
	`size_bytes` int unsigned,
	`error` varchar(1000),
	`copied_at` datetime(0),
	CONSTRAINT `backup_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_backup_runs_started` ON `backup_runs` (`started_at`);