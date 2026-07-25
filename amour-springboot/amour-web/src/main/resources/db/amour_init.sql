-- ============================================================
-- Amour 数据库完整初始化脚本
-- 适用版本：MySQL 8.x
--
-- 说明：
-- 1. 本文件包含建库、全部建表语句和初始化数据。
-- 2. 执行时会删除 amour 库中的同名表，请勿直接用于需要保留数据的环境。
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `amour`
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE `amour`;

DROP TABLE IF EXISTS `message_reply`;
DROP TABLE IF EXISTS `message`;
DROP TABLE IF EXISTS `anniversary`;
DROP TABLE IF EXISTS `photo`;
DROP TABLE IF EXISTS `photo_category`;
DROP TABLE IF EXISTS `story_node_image`;
DROP TABLE IF EXISTS `story_node`;
DROP TABLE IF EXISTS `story_chapter`;
DROP TABLE IF EXISTS `site_config`;
DROP TABLE IF EXISTS `role_permission_rel`;
DROP TABLE IF EXISTS `user_role_rel`;
DROP TABLE IF EXISTS `permission`;
DROP TABLE IF EXISTS `role`;
DROP TABLE IF EXISTS `user`;

-- ============================================================
-- 账号与权限
-- ============================================================

CREATE TABLE `user`
(
    `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'id',
    `username`     VARCHAR(60)      NOT NULL COMMENT '用户名',
    `password`     VARCHAR(60)      NOT NULL COMMENT 'BCrypt 密码',
    `display_name` VARCHAR(60)      NOT NULL DEFAULT '恋人' COMMENT '前台展示名称',
    `avatar`       VARCHAR(500)     NOT NULL DEFAULT '' COMMENT '用户头像 URL',
    `create_time`  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time`  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后一次更新时间',
    `is_deleted`   TINYINT          NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除 1-已删除',
    PRIMARY KEY (`id`) USING BTREE,
    UNIQUE KEY `uk_username` (`username`) USING BTREE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci
  COMMENT = '用户表';

CREATE TABLE `role`
(
    `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `role_name`   VARCHAR(32)     NOT NULL COMMENT '角色名',
    `role_key`    VARCHAR(32)     NOT NULL COMMENT '角色唯一标识',
    `status`      TINYINT         NOT NULL DEFAULT 0 COMMENT '状态(0：启用 1：禁用)',
    `sort`        INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '管理系统中的显示顺序',
    `remark`      VARCHAR(255)             DEFAULT NULL COMMENT '备注',
    `create_time` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后一次更新时间',
    `is_deleted`  BIT(1)          NOT NULL DEFAULT b'0' COMMENT '逻辑删除(0：未删除 1：已删除)',
    PRIMARY KEY (`id`) USING BTREE,
    UNIQUE KEY `uk_role_key` (`role_key`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = '角色表';

CREATE TABLE `permission`
(
    `id`             BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `parent_id`      BIGINT UNSIGNED  NOT NULL DEFAULT 0 COMMENT '父ID',
    `name`           VARCHAR(16)      NOT NULL COMMENT '权限名称',
    `type`           TINYINT UNSIGNED NOT NULL COMMENT '类型(1：目录 2：菜单 3：按钮)',
    `menu_url`       VARCHAR(32)      NOT NULL DEFAULT '' COMMENT '菜单路由',
    `menu_icon`      VARCHAR(255)     NOT NULL DEFAULT '' COMMENT '菜单图标',
    `sort`           INT UNSIGNED     NOT NULL DEFAULT 0 COMMENT '管理系统中的显示顺序',
    `permission_key` VARCHAR(64)      NOT NULL COMMENT '权限标识',
    `status`         TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '状态(0：启用；1：禁用)',
    `create_time`    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time`    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '更新时间',
    `is_deleted`     BIT(1)           NOT NULL DEFAULT b'0' COMMENT '逻辑删除(0：未删除 1：已删除)',
    PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = '权限表';

CREATE TABLE `user_role_rel`
(
    `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `user_id`     BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
    `role_id`     BIGINT UNSIGNED NOT NULL COMMENT '角色ID',
    `create_time` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '更新时间',
    `is_deleted`  BIT(1)          NOT NULL DEFAULT b'0' COMMENT '逻辑删除(0：未删除 1：已删除)',
    PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = '用户角色表';

CREATE TABLE `role_permission_rel`
(
    `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `role_id`       BIGINT UNSIGNED NOT NULL COMMENT '角色ID',
    `permission_id` BIGINT UNSIGNED NOT NULL COMMENT '权限ID',
    `create_time`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '更新时间',
    `is_deleted`    BIT(1)          NOT NULL DEFAULT b'0' COMMENT '逻辑删除(0：未删除 1：已删除)',
    PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = '角色权限表';

-- ============================================================
-- 网站配置与故事
-- ============================================================

CREATE TABLE `site_config`
(
    `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `config_key`   VARCHAR(64)     NOT NULL COMMENT '配置唯一标识',
    `config_name`  VARCHAR(64)     NOT NULL COMMENT '配置名称',
    `config_value` TEXT            NOT NULL COMMENT '配置值',
    `value_type`   VARCHAR(20)     NOT NULL DEFAULT 'text' COMMENT '值类型：text-文本 datetime-日期时间 image-图片',
    `sort_order`   INT             NOT NULL DEFAULT 0 COMMENT '后台显示顺序',
    `remark`       VARCHAR(255)    NOT NULL DEFAULT '' COMMENT '备注',
    `create_time`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_config_key` (`config_key`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci
  COMMENT = '网站配置表';

CREATE TABLE `story_chapter`
(
    `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '章节ID',
    `name`        VARCHAR(50)     NOT NULL COMMENT '章节名称',
    `color_code`  VARCHAR(20)     NOT NULL DEFAULT '' COMMENT '章节主题色',
    `sort_order`  INT             NOT NULL DEFAULT 0 COMMENT '章节排列顺序，升序',
    `is_visible`  TINYINT(1)      NOT NULL DEFAULT 1 COMMENT '是否显示：1-显示 0-隐藏',
    `create_time` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci
  COMMENT = '故事章节表，对故事节点进行阶段性分组';

CREATE TABLE `story_node`
(
    `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '节点ID',
    `chapter_id`    BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '所属章节ID，0表示未分类',
    `title`         VARCHAR(100)    NOT NULL COMMENT '节点标题',
    `summary`       VARCHAR(160)    NOT NULL COMMENT '故事节点摘要',
    `content`       TEXT                     DEFAULT NULL COMMENT '节点正文',
    `happened_time` DATETIME        NOT NULL COMMENT '事件发生日期',
    `location`      VARCHAR(100)    NOT NULL DEFAULT '' COMMENT '发生地点',
    `cover_image`   VARCHAR(500)    NOT NULL DEFAULT '' COMMENT '封面图片URL',
    `tag_label`     VARCHAR(30)     NOT NULL DEFAULT '' COMMENT '标签文字',
    `tag_color`     VARCHAR(20)     NOT NULL DEFAULT '' COMMENT '标签背景色',
    `sort_order`    INT             NOT NULL DEFAULT 0 COMMENT '同章节内排列顺序，升序',
    `is_milestone`  TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '是否里程碑：1-是 0-否',
    `is_visible`    TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '是否显示：1-显示 0-隐藏',
    `is_deleted`    TINYINT         NOT NULL DEFAULT 0 COMMENT '删除标志位：0-未删除 1-已删除',
    `created_by`    BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '创建者用户ID',
    `create_time`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY `idx_chapter_sort` (`chapter_id`, `sort_order`),
    KEY `idx_happened_at` (`happened_time`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci
  COMMENT = '故事节点表，时间轴上每个事件的主体内容，仅管理员可写';

CREATE TABLE `story_node_image`
(
    `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '图片ID',
    `node_id`     BIGINT UNSIGNED NOT NULL COMMENT '所属节点ID',
    `url`         VARCHAR(500)    NOT NULL COMMENT '图片URL',
    `alt_text`    VARCHAR(100)    NOT NULL DEFAULT '' COMMENT '图片描述文字',
    `sort_order`  INT             NOT NULL DEFAULT 0 COMMENT '同节点内图片排列顺序，升序',
    `create_time` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
    PRIMARY KEY (`id`),
    KEY `idx_node_sort` (`node_id`, `sort_order`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci
  COMMENT = '故事节点图片表，每个节点可关联多张照片';

-- ============================================================
-- 相册与纪念日
-- ============================================================

CREATE TABLE `photo_category`
(
    `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '照片分类ID',
    `category_name` VARCHAR(100)    NOT NULL COMMENT '分类名称',
    `sort_order`    INT             NOT NULL DEFAULT 0 COMMENT '排序值，越小越靠前',
    `is_enabled`    TINYINT(1)      NOT NULL DEFAULT 1 COMMENT '是否启用：1-启用 0-停用',
    `remark`        VARCHAR(255)    NOT NULL DEFAULT '' COMMENT '备注',
    `created_by`    BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '创建者用户ID',
    `create_time`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_photo_category_name` (`category_name`),
    KEY `idx_photo_category_enabled_sort` (`is_enabled`, `sort_order`, `id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci
  COMMENT = '恋爱相册照片分类表';

CREATE TABLE `photo`
(
    `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '照片ID',
    `title`             VARCHAR(100)    NOT NULL COMMENT '照片标题',
    `description`       VARCHAR(1000)   NOT NULL DEFAULT '' COMMENT '照片描述',
    `photo_category_id` BIGINT UNSIGNED NOT NULL COMMENT '照片分类ID',
    `url`               VARCHAR(500)    NOT NULL COMMENT '照片URL',
    `taken_time`        DATETIME                 DEFAULT NULL COMMENT '拍摄时间',
    `location`          VARCHAR(100)    NOT NULL DEFAULT '' COMMENT '拍摄地点',
    `sort_order`        INT             NOT NULL DEFAULT 0 COMMENT '排序值，越小越靠前',
    `is_cover`          TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '是否首页封面：1-是 0-否',
    `is_visible`        TINYINT(1)      NOT NULL DEFAULT 1 COMMENT '是否前台显示：1-显示 0-隐藏',
    `created_by`        BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '创建者用户ID',
    `create_time`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `is_deleted`        TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除 1-已删除',
    PRIMARY KEY (`id`),
    KEY `idx_photo_list` (`is_deleted`, `is_visible`, `sort_order`, `taken_time`, `id`),
    KEY `idx_photo_category_id` (`photo_category_id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci
  COMMENT = '恋爱相册照片表';

CREATE TABLE `anniversary`
(
    `id`               BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT COMMENT '纪念日ID',
    `title`            VARCHAR(100)     NOT NULL COMMENT '纪念日名称',
    `description`      VARCHAR(1000)    NOT NULL DEFAULT '' COMMENT '纪念日描述',
    `anniversary_date` DATE             NOT NULL COMMENT '纪念日期',
    `repeat_type`      TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '重复类型：0-不重复 1-每年重复',
    `category`         VARCHAR(32)      NOT NULL DEFAULT 'other' COMMENT '分类：love/birthday/journey/memory/milestone/other',
    `color_code`       CHAR(7)          NOT NULL DEFAULT '#D94F70' COMMENT '卡片主题色',
    `location`         VARCHAR(100)     NOT NULL DEFAULT '' COMMENT '纪念地点',
    `sort_order`       INT              NOT NULL DEFAULT 0 COMMENT '排序值，越小越靠前',
    `is_visible`       TINYINT(1)       NOT NULL DEFAULT 1 COMMENT '是否前台显示：1-显示 0-隐藏',
    `created_by`       BIGINT UNSIGNED  NOT NULL DEFAULT 0 COMMENT '创建者用户ID',
    `create_time`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `is_deleted`       TINYINT(1)       NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除 1-已删除',
    PRIMARY KEY (`id`),
    KEY `idx_anniversary_frontend` (`is_deleted`, `is_visible`, `sort_order`, `anniversary_date`),
    KEY `idx_anniversary_category` (`category`, `is_deleted`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci
  COMMENT = '恋爱纪念日表';

-- ============================================================
-- 留言板
-- ============================================================

CREATE TABLE `message`
(
    `id`          BIGINT   NOT NULL AUTO_INCREMENT COMMENT '留言ID',
    `user_id`     BIGINT   NOT NULL COMMENT '留言人ID',
    `content`     TEXT     NOT NULL COMMENT '留言内容',
    `create_time` DATETIME          DEFAULT CURRENT_TIMESTAMP COMMENT '留言时间',
    `update_time` DATETIME          DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `is_deleted`  TINYINT           DEFAULT 0 COMMENT '是否删除 0否1是',
    PRIMARY KEY (`id`),
    KEY `idx_user_time` (`user_id`, `create_time`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_bin
  COMMENT = '留言表';

CREATE TABLE `message_reply`
(
    `id`              BIGINT   NOT NULL AUTO_INCREMENT COMMENT '回复ID',
    `message_id`      BIGINT   NOT NULL COMMENT '留言ID',
    `parent_reply_id` BIGINT            DEFAULT NULL COMMENT '父回复ID，NULL表示直接回复留言',
    `from_user_id`    BIGINT   NOT NULL COMMENT '回复人',
    `to_user_id`      BIGINT   NOT NULL COMMENT '被回复人',
    `content`         TEXT     NOT NULL COMMENT '回复内容',
    `create_time`     DATETIME          DEFAULT CURRENT_TIMESTAMP COMMENT '回复时间',
    `is_deleted`      TINYINT           DEFAULT 0 COMMENT '是否删除',
    PRIMARY KEY (`id`),
    KEY `idx_message_time` (`message_id`, `create_time`),
    KEY `idx_parent_reply_id` (`parent_reply_id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_bin
  COMMENT = '留言回复表';
