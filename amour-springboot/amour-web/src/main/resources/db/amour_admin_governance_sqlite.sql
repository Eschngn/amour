-- Amour 管理台治理能力数据库初始化/迁移（SQLite 3）
-- 可重复执行：只创建缺失的表和索引，不对既有表做破坏性变更。
-- 已有 SQLite 库升级时直接执行本脚本即可。

CREATE TABLE IF NOT EXISTS `content_report_handle` (
    `id` INTEGER PRIMARY KEY AUTOINCREMENT,
    `report_id` INTEGER NOT NULL,
    `admin_user_id` INTEGER NOT NULL,
    `action` TEXT NOT NULL,
    `note` TEXT NOT NULL,
    `create_time` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS `uk_content_report_handle_report` ON `content_report_handle` (`report_id`);
CREATE INDEX IF NOT EXISTS `idx_content_report_handle_admin_time` ON `content_report_handle` (`admin_user_id`, `create_time`);

CREATE TABLE IF NOT EXISTS `admin_audit_log` (
    `id` INTEGER PRIMARY KEY AUTOINCREMENT,
    `admin_user_id` INTEGER NOT NULL,
    `action` TEXT NOT NULL,
    `target_type` TEXT NOT NULL DEFAULT '',
    `target_space_id` INTEGER DEFAULT NULL,
    `target_content_type` TEXT DEFAULT NULL,
    `target_content_id` INTEGER DEFAULT NULL,
    `target_user_id` INTEGER DEFAULT NULL,
    `target_report_id` INTEGER DEFAULT NULL,
    `reason` TEXT NOT NULL DEFAULT '',
    `result` TEXT NOT NULL DEFAULT 'SUCCESS',
    `detail` TEXT NOT NULL DEFAULT '',
    `create_time` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS `idx_admin_audit_action_time` ON `admin_audit_log` (`action`, `create_time`);
CREATE INDEX IF NOT EXISTS `idx_admin_audit_space_time` ON `admin_audit_log` (`target_space_id`, `create_time`);
CREATE INDEX IF NOT EXISTS `idx_admin_audit_admin_time` ON `admin_audit_log` (`admin_user_id`, `create_time`);

-- 管理员账号初始化：平台管理员由 user.is_platform_admin 标识，不建角色/权限表。
-- 默认账号 admin / Admin@123456，仅用于首次初始化，部署后请立即修改密码。
INSERT OR IGNORE INTO `user`
    (`amour_id`, `username`, `password`, `display_name`, `avatar`, `wechat_openid`,
     `create_time`, `update_time`, `is_deleted`, `is_platform_admin`)
VALUES
    ('LYADMIN001', 'admin',
     '$2a$10$sIvjF5pqaZUtKQW4bVXB0ubKWZQDxu3ZdZsHS6jdBpCFOPJehf0ea',
     '平台管理员', '', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 1);
