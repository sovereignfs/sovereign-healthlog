CREATE TABLE `healthlog_lab_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`collected_at` text NOT NULL,
	`reported_at` text,
	`provider` text,
	`notes` text,
	`attachment_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `healthlog_lab_groups_tenant_user_idx` ON `healthlog_lab_groups` (`tenant_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `healthlog_lab_results` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL,
	`group_id` text NOT NULL,
	`test_name` text NOT NULL,
	`normalized_test_name` text NOT NULL,
	`value_kind` text NOT NULL,
	`numeric_value` real,
	`text_value` text,
	`unit` text,
	`reference_low` real,
	`reference_high` real,
	`reference_text` text,
	`flag` text,
	`tracked` integer DEFAULT false NOT NULL,
	`note` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `healthlog_lab_groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `healthlog_lab_results_group_idx` ON `healthlog_lab_results` (`group_id`);--> statement-breakpoint
CREATE INDEX `healthlog_lab_results_tenant_user_name_idx` ON `healthlog_lab_results` (`tenant_id`,`user_id`,`normalized_test_name`);--> statement-breakpoint
CREATE INDEX `healthlog_lab_results_tenant_user_tracked_idx` ON `healthlog_lab_results` (`tenant_id`,`user_id`,`tracked`);--> statement-breakpoint
CREATE TABLE `healthlog_measurements` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`measured_at` integer NOT NULL,
	`value` real NOT NULL,
	`value2` real,
	`unit` text NOT NULL,
	`context` text,
	`note` text,
	`source` text DEFAULT 'manual' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `healthlog_measurements_tenant_user_idx` ON `healthlog_measurements` (`tenant_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `healthlog_measurements_tenant_user_type_idx` ON `healthlog_measurements` (`tenant_id`,`user_id`,`type`);--> statement-breakpoint
CREATE TABLE `healthlog_medications` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL,
	`series_id` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`dose` text,
	`dose_unit` text,
	`route` text,
	`frequency_text` text,
	`start_date` text,
	`end_date` text,
	`prescribing_clinician` text,
	`pharmacy` text,
	`status` text NOT NULL,
	`notes` text,
	`version_reason` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `healthlog_medications_tenant_user_series_idx` ON `healthlog_medications` (`tenant_id`,`user_id`,`series_id`);--> statement-breakpoint
CREATE INDEX `healthlog_medications_tenant_user_status_idx` ON `healthlog_medications` (`tenant_id`,`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `healthlog_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL,
	`noted_at` integer NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`linked_type` text,
	`linked_id` text,
	`attachment_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `healthlog_notes_tenant_user_idx` ON `healthlog_notes` (`tenant_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `healthlog_profiles` (
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL,
	`display_name` text,
	`date_of_birth` text,
	`sex_at_birth` text,
	`gender_identity` text,
	`blood_type` text,
	`preferred_units` text NOT NULL,
	`allergies` text,
	`conditions` text,
	`emergency_contact_name` text,
	`emergency_contact_phone` text,
	`primary_clinician` text,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`tenant_id`, `user_id`)
);
