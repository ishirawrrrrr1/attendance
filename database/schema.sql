CREATE DATABASE IF NOT EXISTS `rfid_attendance`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `rfid_attendance`;

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(120) NOT NULL,
  `uid` VARCHAR(100) NOT NULL,
  `pin` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'staff') NOT NULL DEFAULT 'staff',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_users_uid` (`uid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `attendance` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `date` DATE NOT NULL,
  `time_in` TIME NOT NULL,
  `time_out` TIME DEFAULT NULL,
  `status` ENUM('Present', 'Late', 'Absent') NOT NULL DEFAULT 'Present',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_date` (`user_id`, `date`),
  KEY `idx_attendance_date` (`date`),
  CONSTRAINT `fk_attendance_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `users` (`name`, `uid`, `pin`, `role`)
VALUES
  ('System Administrator', 'admin', '$2y$10$4TVz6Py8WjB7XkXSsBIRzuevUkPmk8tYqFAbBGTUXlPlF158CUFP6', 'admin'),
  ('Sample Staff', 'STAFF001', '$2y$10$WITgV05C.4qTSVNosCtMKu2b8Va3xzIFcV9F6yfVG9JGZTDg3UtyG', 'staff')
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `uid` = VALUES(`uid`),
  `pin` = VALUES(`pin`),
  `role` = VALUES(`role`);
