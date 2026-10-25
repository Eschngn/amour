-- PostgreSQL 12+ schema for the amour database.
-- Connect to the target database before running this script.
-- Existing tables and data are preserved; create the database separately if needed.

DO $$
BEGIN
    IF to_regclass('app_user') IS NULL AND to_regclass('"user"') IS NOT NULL THEN
        ALTER TABLE "user" RENAME TO app_user;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS app_user (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(60) NOT NULL CONSTRAINT uk_username UNIQUE,
    password VARCHAR(60),
    display_name VARCHAR(60) NOT NULL DEFAULT '恋人',
    avatar VARCHAR(500) NOT NULL DEFAULT '',
    wechat_openid VARCHAR(128) CONSTRAINT uk_wechat_openid UNIQUE,
    username_update_time TIMESTAMP,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS role (
    id VARCHAR(64) PRIMARY KEY,
    role_name VARCHAR(32) NOT NULL,
    role_key VARCHAR(32) NOT NULL CONSTRAINT uk_role_key UNIQUE,
    status SMALLINT NOT NULL DEFAULT 0,
    sort INT NOT NULL DEFAULT 0,
    remark VARCHAR(255),
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS permission (
    id VARCHAR(64) PRIMARY KEY,
    parent_id VARCHAR(64) NOT NULL,
    name VARCHAR(16) NOT NULL,
    type SMALLINT NOT NULL,
    menu_url VARCHAR(32) NOT NULL DEFAULT '',
    menu_icon VARCHAR(255) NOT NULL DEFAULT '',
    sort INT NOT NULL DEFAULT 0,
    permission_key VARCHAR(64) NOT NULL,
    status SMALLINT NOT NULL DEFAULT 0,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS user_role_rel (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    role_id VARCHAR(64) NOT NULL,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS role_permission_rel (
    id VARCHAR(64) PRIMARY KEY,
    role_id VARCHAR(64) NOT NULL,
    permission_id VARCHAR(64) NOT NULL,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS site_config (
    id VARCHAR(64) PRIMARY KEY,
    config_key VARCHAR(64) NOT NULL CONSTRAINT uk_config_key UNIQUE,
    config_name VARCHAR(64) NOT NULL,
    config_value TEXT NOT NULL,
    value_type VARCHAR(20) NOT NULL DEFAULT 'text',
    sort_order INT NOT NULL DEFAULT 0,
    remark VARCHAR(255) NOT NULL DEFAULT '',
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS story_chapter (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    color_code VARCHAR(20) NOT NULL DEFAULT '',
    sort_order INT NOT NULL DEFAULT 0,
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS story_node (
    id VARCHAR(64) PRIMARY KEY,
    chapter_id VARCHAR(64) NOT NULL,
    title VARCHAR(100) NOT NULL,
    summary VARCHAR(160) NOT NULL,
    content TEXT,
    happened_time TIMESTAMP NOT NULL,
    location VARCHAR(100) NOT NULL DEFAULT '',
    cover_image VARCHAR(500) NOT NULL DEFAULT '',
    tag_label VARCHAR(30) NOT NULL DEFAULT '',
    tag_color VARCHAR(20) NOT NULL DEFAULT '',
    sort_order INT NOT NULL DEFAULT 0,
    is_milestone BOOLEAN NOT NULL DEFAULT FALSE,
    is_visible BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_by VARCHAR(64) NOT NULL,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_chapter_sort ON story_node (chapter_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_happened_at ON story_node (happened_time);

CREATE TABLE IF NOT EXISTS story_node_image (
    id VARCHAR(64) PRIMARY KEY,
    node_id VARCHAR(64) NOT NULL,
    url VARCHAR(500) NOT NULL,
    alt_text VARCHAR(100) NOT NULL DEFAULT '',
    sort_order INT NOT NULL DEFAULT 0,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_node_sort ON story_node_image (node_id, sort_order);

CREATE TABLE IF NOT EXISTS photo_category (
    id VARCHAR(64) PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL CONSTRAINT uk_photo_category_name UNIQUE,
    sort_order INT NOT NULL DEFAULT 0,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    remark VARCHAR(255) NOT NULL DEFAULT '',
    created_by VARCHAR(64) NOT NULL,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_photo_category_enabled_sort ON photo_category (is_enabled, sort_order, id);

CREATE TABLE IF NOT EXISTS photo (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description VARCHAR(1000) NOT NULL DEFAULT '',
    photo_category_id VARCHAR(64) NOT NULL,
    url VARCHAR(500) NOT NULL,
    taken_time TIMESTAMP,
    location VARCHAR(100) NOT NULL DEFAULT '',
    sort_order INT NOT NULL DEFAULT 0,
    is_cover BOOLEAN NOT NULL DEFAULT FALSE,
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(64) NOT NULL,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_photo_list ON photo (is_deleted, is_visible, sort_order, taken_time, id);
CREATE INDEX IF NOT EXISTS idx_photo_category_id ON photo (photo_category_id);

CREATE TABLE IF NOT EXISTS anniversary (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description VARCHAR(1000) NOT NULL DEFAULT '',
    anniversary_date DATE NOT NULL,
    repeat_type SMALLINT NOT NULL DEFAULT 1,
    category VARCHAR(32) NOT NULL DEFAULT 'other',
    color_code CHAR(7) NOT NULL DEFAULT '#D94F70',
    location VARCHAR(100) NOT NULL DEFAULT '',
    sort_order INT NOT NULL DEFAULT 0,
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(64) NOT NULL,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_anniversary_frontend ON anniversary (is_deleted, is_visible, sort_order, anniversary_date);
CREATE INDEX IF NOT EXISTS idx_anniversary_category ON anniversary (category, is_deleted);

CREATE TABLE IF NOT EXISTS message (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    content TEXT NOT NULL,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_user_time ON message (user_id, create_time);

CREATE TABLE IF NOT EXISTS message_reply (
    id VARCHAR(64) PRIMARY KEY,
    message_id VARCHAR(64) NOT NULL,
    parent_reply_id VARCHAR(64),
    from_user_id VARCHAR(64) NOT NULL,
    to_user_id VARCHAR(64) NOT NULL,
    content TEXT NOT NULL,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_message_time ON message_reply (message_id, create_time);
CREATE INDEX IF NOT EXISTS idx_parent_reply_id ON message_reply (parent_reply_id);

-- Convert IDs from imported MySQL schemas while preserving their existing values.
ALTER TABLE app_user ALTER COLUMN id DROP DEFAULT;
ALTER TABLE role ALTER COLUMN id DROP DEFAULT;
ALTER TABLE permission ALTER COLUMN id DROP DEFAULT;
ALTER TABLE permission ALTER COLUMN parent_id DROP DEFAULT;
ALTER TABLE user_role_rel ALTER COLUMN id DROP DEFAULT;
ALTER TABLE user_role_rel ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE user_role_rel ALTER COLUMN role_id DROP DEFAULT;
ALTER TABLE role_permission_rel ALTER COLUMN id DROP DEFAULT;
ALTER TABLE role_permission_rel ALTER COLUMN role_id DROP DEFAULT;
ALTER TABLE role_permission_rel ALTER COLUMN permission_id DROP DEFAULT;
ALTER TABLE site_config ALTER COLUMN id DROP DEFAULT;
ALTER TABLE story_chapter ALTER COLUMN id DROP DEFAULT;
ALTER TABLE story_node ALTER COLUMN id DROP DEFAULT;
ALTER TABLE story_node ALTER COLUMN chapter_id DROP DEFAULT;
ALTER TABLE story_node ALTER COLUMN created_by DROP DEFAULT;
ALTER TABLE story_node_image ALTER COLUMN id DROP DEFAULT;
ALTER TABLE story_node_image ALTER COLUMN node_id DROP DEFAULT;
ALTER TABLE photo_category ALTER COLUMN id DROP DEFAULT;
ALTER TABLE photo_category ALTER COLUMN created_by DROP DEFAULT;
ALTER TABLE photo ALTER COLUMN id DROP DEFAULT;
ALTER TABLE photo ALTER COLUMN photo_category_id DROP DEFAULT;
ALTER TABLE photo ALTER COLUMN created_by DROP DEFAULT;
ALTER TABLE anniversary ALTER COLUMN id DROP DEFAULT;
ALTER TABLE anniversary ALTER COLUMN created_by DROP DEFAULT;
ALTER TABLE message ALTER COLUMN id DROP DEFAULT;
ALTER TABLE message ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE message_reply ALTER COLUMN id DROP DEFAULT;
ALTER TABLE message_reply ALTER COLUMN message_id DROP DEFAULT;
ALTER TABLE message_reply ALTER COLUMN parent_reply_id DROP DEFAULT;
ALTER TABLE message_reply ALTER COLUMN from_user_id DROP DEFAULT;
ALTER TABLE message_reply ALTER COLUMN to_user_id DROP DEFAULT;
ALTER TABLE app_user ALTER COLUMN id TYPE VARCHAR(64) USING id::text;
ALTER TABLE role ALTER COLUMN id TYPE VARCHAR(64) USING id::text;
ALTER TABLE permission ALTER COLUMN id TYPE VARCHAR(64) USING id::text;
ALTER TABLE permission ALTER COLUMN parent_id TYPE VARCHAR(64) USING parent_id::text;
ALTER TABLE user_role_rel ALTER COLUMN id TYPE VARCHAR(64) USING id::text;
ALTER TABLE user_role_rel ALTER COLUMN user_id TYPE VARCHAR(64) USING user_id::text;
ALTER TABLE user_role_rel ALTER COLUMN role_id TYPE VARCHAR(64) USING role_id::text;
ALTER TABLE role_permission_rel ALTER COLUMN id TYPE VARCHAR(64) USING id::text;
ALTER TABLE role_permission_rel ALTER COLUMN role_id TYPE VARCHAR(64) USING role_id::text;
ALTER TABLE role_permission_rel ALTER COLUMN permission_id TYPE VARCHAR(64) USING permission_id::text;
ALTER TABLE site_config ALTER COLUMN id TYPE VARCHAR(64) USING id::text;
ALTER TABLE story_chapter ALTER COLUMN id TYPE VARCHAR(64) USING id::text;
ALTER TABLE story_node ALTER COLUMN id TYPE VARCHAR(64) USING id::text;
ALTER TABLE story_node ALTER COLUMN chapter_id TYPE VARCHAR(64) USING chapter_id::text;
ALTER TABLE story_node ALTER COLUMN created_by TYPE VARCHAR(64) USING created_by::text;
ALTER TABLE story_node_image ALTER COLUMN id TYPE VARCHAR(64) USING id::text;
ALTER TABLE story_node_image ALTER COLUMN node_id TYPE VARCHAR(64) USING node_id::text;
ALTER TABLE photo_category ALTER COLUMN id TYPE VARCHAR(64) USING id::text;
ALTER TABLE photo_category ALTER COLUMN created_by TYPE VARCHAR(64) USING created_by::text;
ALTER TABLE photo ALTER COLUMN id TYPE VARCHAR(64) USING id::text;
ALTER TABLE photo ALTER COLUMN photo_category_id TYPE VARCHAR(64) USING photo_category_id::text;
ALTER TABLE photo ALTER COLUMN created_by TYPE VARCHAR(64) USING created_by::text;
ALTER TABLE anniversary ALTER COLUMN id TYPE VARCHAR(64) USING id::text;
ALTER TABLE anniversary ALTER COLUMN created_by TYPE VARCHAR(64) USING created_by::text;
ALTER TABLE message ALTER COLUMN id TYPE VARCHAR(64) USING id::text;
ALTER TABLE message ALTER COLUMN user_id TYPE VARCHAR(64) USING user_id::text;
ALTER TABLE message_reply ALTER COLUMN id TYPE VARCHAR(64) USING id::text;
ALTER TABLE message_reply ALTER COLUMN message_id TYPE VARCHAR(64) USING message_id::text;
ALTER TABLE message_reply ALTER COLUMN parent_reply_id TYPE VARCHAR(64) USING parent_reply_id::text;
ALTER TABLE message_reply ALTER COLUMN from_user_id TYPE VARCHAR(64) USING from_user_id::text;
ALTER TABLE message_reply ALTER COLUMN to_user_id TYPE VARCHAR(64) USING to_user_id::text;

