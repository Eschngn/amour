-- Amour 管理台治理能力数据库初始化/迁移（MySQL 8.x）
-- 可重复执行：CREATE TABLE IF NOT EXISTS / 条件插入，不删除既有数据。
-- 后台管理员由 user.is_platform_admin 标识，不建角色/权限表。

SET NAMES utf8mb4;

-- 旧库补齐平台管理员标识字段（已有则跳过）。
SET @has_platform_admin_column = (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'user' AND column_name = 'is_platform_admin'
);
SET @add_platform_admin_column_sql = IF(
    @has_platform_admin_column > 0,
    'SELECT 1',
    'ALTER TABLE `user` ADD COLUMN `is_platform_admin` TINYINT NOT NULL DEFAULT 0 '
    'COMMENT ''是否平台管理员：0-否 1-是'' AFTER `is_deleted`'
);
PREPARE add_platform_admin_column_stmt FROM @add_platform_admin_column_sql;
EXECUTE add_platform_admin_column_stmt;
DEALLOCATE PREPARE add_platform_admin_column_stmt;

-- 管理员账号初始化。默认账号 admin / Admin@123456，部署后请立即修改密码。
INSERT INTO `user`
    (`amour_id`, `username`, `password`, `display_name`, `avatar`, `wechat_openid`,
     `create_time`, `update_time`, `is_deleted`, `is_platform_admin`)
SELECT 'LYADMIN001', 'admin',
       '$2a$10$sIvjF5pqaZUtKQW4bVXB0ubKWZQDxu3ZdZsHS6jdBpCFOPJehf0ea',
       '平台管理员', '', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 1
WHERE NOT EXISTS (
    SELECT 1 FROM `user` u WHERE u.username = 'admin' AND u.is_deleted = 0
);

CREATE TABLE IF NOT EXISTS `content_report_handle` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '举报处理记录ID',
    `report_id` BIGINT UNSIGNED NOT NULL COMMENT '被处理的举报ID',
    `admin_user_id` BIGINT UNSIGNED NOT NULL COMMENT '处理管理员用户ID',
    `action` VARCHAR(16) NOT NULL COMMENT 'reject/confirm',
    `note` VARCHAR(1000) NOT NULL COMMENT '处理备注',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '处理时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_content_report_handle_report` (`report_id`),
    KEY `idx_content_report_handle_admin_time` (`admin_user_id`, `create_time`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '内容举报处理记录';

CREATE TABLE IF NOT EXISTS `admin_audit_log` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '审计ID',
    `admin_user_id` BIGINT UNSIGNED NOT NULL COMMENT '操作管理员用户ID',
    `action` VARCHAR(64) NOT NULL COMMENT '动作标识',
    `target_type` VARCHAR(32) NOT NULL DEFAULT '' COMMENT '目标类型',
    `target_space_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '目标空间ID',
    `target_content_type` VARCHAR(32) DEFAULT NULL COMMENT '目标内容类型',
    `target_content_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '目标内容ID',
    `target_user_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '目标用户ID',
    `target_report_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '目标举报ID',
    `reason` VARCHAR(1000) NOT NULL DEFAULT '' COMMENT '操作原因',
    `result` VARCHAR(16) NOT NULL DEFAULT 'SUCCESS' COMMENT 'SUCCESS/FAILURE',
    `detail` VARCHAR(1000) NOT NULL DEFAULT '' COMMENT '状态摘要，不含正文',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
    PRIMARY KEY (`id`),
    KEY `idx_admin_audit_action_time` (`action`, `create_time`),
    KEY `idx_admin_audit_space_time` (`target_space_id`, `create_time`),
    KEY `idx_admin_audit_admin_time` (`admin_user_id`, `create_time`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '后台管理操作审计';
