/*
 PostgreSQL 版建表语句（由 MySQL 8.0 的 amour 库转换）
 说明：
 1. 所有 id / 外键 id / created_by 字段均为 varchar(64)，不再自增，需由应用生成（UUID/雪花等）
 2. 表 user 改名为 app_user
 3. MySQL 的 ON UPDATE CURRENT_TIMESTAMP 通过触发器 set_update_time() 实现
 4. tinyint / tinyint(1) / bit(1) 统一用 smallint，保持 0/1 语义，兼容原有代码
*/

-- ----------------------------
-- 通用触发器函数：自动更新 update_time
-- ----------------------------
CREATE
OR REPLACE FUNCTION set_update_time() RETURNS trigger AS $$
BEGIN
  NEW.update_time
= CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$
LANGUAGE plpgsql;

-- ----------------------------
-- Table structure for anniversary
-- ----------------------------
DROP TABLE IF EXISTS anniversary CASCADE;
CREATE TABLE anniversary
(
    id               varchar(64)   NOT NULL,
    title            varchar(100)  NOT NULL,
    description      varchar(1000) NOT NULL DEFAULT '',
    anniversary_date date          NOT NULL,
    repeat_type      smallint      NOT NULL DEFAULT 1,
    category         varchar(32)   NOT NULL DEFAULT 'other',
    color_code       char(7)       NOT NULL DEFAULT '#D94F70',
    location         varchar(100)  NOT NULL DEFAULT '',
    sort_order       integer       NOT NULL DEFAULT 0,
    is_visible       smallint      NOT NULL DEFAULT 1,
    created_by       varchar(64)   NOT NULL DEFAULT '0',
    create_time      timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time      timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted       smallint      NOT NULL DEFAULT 0,
    PRIMARY KEY (id)
);
CREATE INDEX idx_anniversary_frontend ON anniversary (is_deleted, is_visible, sort_order, anniversary_date);
CREATE INDEX idx_anniversary_category ON anniversary (category, is_deleted);
CREATE TRIGGER trg_anniversary_update_time
    BEFORE UPDATE
    ON anniversary
    FOR EACH ROW EXECUTE FUNCTION set_update_time();

COMMENT
ON TABLE anniversary IS '恋爱纪念日表';
COMMENT
ON COLUMN anniversary.id IS '纪念日ID';
COMMENT
ON COLUMN anniversary.title IS '纪念日名称';
COMMENT
ON COLUMN anniversary.description IS '纪念日描述';
COMMENT
ON COLUMN anniversary.anniversary_date IS '纪念日期';
COMMENT
ON COLUMN anniversary.repeat_type IS '重复类型：0-不重复 1-每年重复';
COMMENT
ON COLUMN anniversary.category IS '分类：love/birthday/journey/memory/milestone/other';
COMMENT
ON COLUMN anniversary.color_code IS '卡片主题色，格式如 #D94F70';
COMMENT
ON COLUMN anniversary.location IS '纪念地点';
COMMENT
ON COLUMN anniversary.sort_order IS '排序值，越小越靠前';
COMMENT
ON COLUMN anniversary.is_visible IS '是否前台显示：1-显示 0-隐藏';
COMMENT
ON COLUMN anniversary.created_by IS '创建者用户ID，逻辑关联 app_user.id';
COMMENT
ON COLUMN anniversary.create_time IS '创建时间';
COMMENT
ON COLUMN anniversary.update_time IS '更新时间';
COMMENT
ON COLUMN anniversary.is_deleted IS '逻辑删除：0-未删除 1-已删除';

-- ----------------------------
-- Table structure for message
-- ----------------------------
DROP TABLE IF EXISTS message CASCADE;
CREATE TABLE message
(
    id          varchar(64) NOT NULL,
    user_id     varchar(64) NOT NULL,
    content     text        NOT NULL,
    create_time timestamp DEFAULT CURRENT_TIMESTAMP,
    update_time timestamp DEFAULT CURRENT_TIMESTAMP,
    is_deleted  smallint  DEFAULT 0,
    PRIMARY KEY (id)
);
CREATE INDEX idx_user_time ON message (user_id, create_time);
CREATE TRIGGER trg_message_update_time
    BEFORE UPDATE
    ON message
    FOR EACH ROW EXECUTE FUNCTION set_update_time();

COMMENT
ON COLUMN message.id IS '留言ID';
COMMENT
ON COLUMN message.user_id IS '留言人ID';
COMMENT
ON COLUMN message.content IS '留言内容';
COMMENT
ON COLUMN message.create_time IS '留言时间';
COMMENT
ON COLUMN message.update_time IS '更新时间';
COMMENT
ON COLUMN message.is_deleted IS '是否删除 0否1是';

-- ----------------------------
-- Table structure for message_reply
-- ----------------------------
DROP TABLE IF EXISTS message_reply CASCADE;
CREATE TABLE message_reply
(
    id              varchar(64) NOT NULL,
    message_id      varchar(64) NOT NULL,
    parent_reply_id varchar(64) DEFAULT NULL,
    from_user_id    varchar(64) NOT NULL,
    to_user_id      varchar(64) NOT NULL,
    content         text        NOT NULL,
    create_time     timestamp   DEFAULT CURRENT_TIMESTAMP,
    is_deleted      smallint    DEFAULT 0,
    PRIMARY KEY (id)
);
CREATE INDEX idx_message_time ON message_reply (message_id, create_time);
CREATE INDEX idx_parent_reply_id ON message_reply (parent_reply_id);

COMMENT
ON COLUMN message_reply.id IS '回复ID';
COMMENT
ON COLUMN message_reply.message_id IS '留言ID';
COMMENT
ON COLUMN message_reply.parent_reply_id IS '父回复ID，NULL表示直接回复留言';
COMMENT
ON COLUMN message_reply.from_user_id IS '回复人';
COMMENT
ON COLUMN message_reply.to_user_id IS '被回复人';
COMMENT
ON COLUMN message_reply.content IS '回复内容';
COMMENT
ON COLUMN message_reply.create_time IS '回复时间';
COMMENT
ON COLUMN message_reply.is_deleted IS '是否删除';

-- ----------------------------
-- Table structure for permission
-- ----------------------------
DROP TABLE IF EXISTS permission CASCADE;
CREATE TABLE permission
(
    id             varchar(64)  NOT NULL,
    parent_id      varchar(64)  NOT NULL DEFAULT '0',
    name           varchar(16)  NOT NULL,
    type           smallint     NOT NULL,
    menu_url       varchar(32)  NOT NULL DEFAULT '',
    menu_icon      varchar(255) NOT NULL DEFAULT '',
    sort           integer      NOT NULL DEFAULT 0,
    permission_key varchar(64)  NOT NULL,
    status         smallint     NOT NULL DEFAULT 0,
    create_time    timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time    timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted     smallint     NOT NULL DEFAULT 0,
    PRIMARY KEY (id)
);

COMMENT
ON TABLE permission IS '权限表';
COMMENT
ON COLUMN permission.id IS '主键ID';
COMMENT
ON COLUMN permission.parent_id IS '父ID';
COMMENT
ON COLUMN permission.name IS '权限名称';
COMMENT
ON COLUMN permission.type IS '类型(1：目录 2：菜单 3：按钮)';
COMMENT
ON COLUMN permission.menu_url IS '菜单路由';
COMMENT
ON COLUMN permission.menu_icon IS '菜单图标';
COMMENT
ON COLUMN permission.sort IS '管理系统中的显示顺序';
COMMENT
ON COLUMN permission.permission_key IS '权限标识';
COMMENT
ON COLUMN permission.status IS '状态(0：启用；1：禁用)';
COMMENT
ON COLUMN permission.create_time IS '创建时间';
COMMENT
ON COLUMN permission.update_time IS '更新时间';
COMMENT
ON COLUMN permission.is_deleted IS '逻辑删除(0：未删除 1：已删除)';

-- ----------------------------
-- Table structure for photo
-- ----------------------------
DROP TABLE IF EXISTS photo CASCADE;
CREATE TABLE photo
(
    id                varchar(64)   NOT NULL,
    title             varchar(100)  NOT NULL,
    description       varchar(1000) NOT NULL DEFAULT '',
    photo_category_id varchar(64)   NOT NULL,
    url               varchar(500)  NOT NULL,
    taken_time        timestamp              DEFAULT NULL,
    location          varchar(100)  NOT NULL DEFAULT '',
    sort_order        integer       NOT NULL DEFAULT 0,
    is_cover          smallint      NOT NULL DEFAULT 0,
    is_visible        smallint      NOT NULL DEFAULT 1,
    created_by        varchar(64)   NOT NULL DEFAULT '0',
    create_time       timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time       timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted        smallint      NOT NULL DEFAULT 0,
    PRIMARY KEY (id)
);
CREATE INDEX idx_photo_list ON photo (is_deleted, is_visible, sort_order, taken_time, id);
CREATE INDEX idx_photo_category_id ON photo (photo_category_id);
CREATE TRIGGER trg_photo_update_time
    BEFORE UPDATE
    ON photo
    FOR EACH ROW EXECUTE FUNCTION set_update_time();

COMMENT
ON TABLE photo IS '恋爱相册照片表';
COMMENT
ON COLUMN photo.id IS '照片ID';
COMMENT
ON COLUMN photo.title IS '照片标题';
COMMENT
ON COLUMN photo.description IS '照片描述';
COMMENT
ON COLUMN photo.photo_category_id IS '照片分类ID';
COMMENT
ON COLUMN photo.url IS '照片URL';
COMMENT
ON COLUMN photo.taken_time IS '拍摄时间';
COMMENT
ON COLUMN photo.location IS '拍摄地点';
COMMENT
ON COLUMN photo.sort_order IS '排序值，越小越靠前';
COMMENT
ON COLUMN photo.is_cover IS '是否首页封面：1-是 0-否';
COMMENT
ON COLUMN photo.is_visible IS '是否前台显示：1-显示 0-隐藏';
COMMENT
ON COLUMN photo.created_by IS '创建者用户ID';
COMMENT
ON COLUMN photo.create_time IS '创建时间';
COMMENT
ON COLUMN photo.update_time IS '更新时间';
COMMENT
ON COLUMN photo.is_deleted IS '逻辑删除：0-未删除 1-已删除';

-- ----------------------------
-- Table structure for photo_category
-- ----------------------------
DROP TABLE IF EXISTS photo_category CASCADE;
CREATE TABLE photo_category
(
    id            varchar(64)  NOT NULL,
    category_name varchar(100) NOT NULL,
    sort_order    integer      NOT NULL DEFAULT 0,
    is_enabled    smallint     NOT NULL DEFAULT 1,
    remark        varchar(255) NOT NULL DEFAULT '',
    created_by    varchar(64)  NOT NULL DEFAULT '0',
    create_time   timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time   timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uk_photo_category_name UNIQUE (category_name)
);
CREATE INDEX idx_photo_category_enabled_sort ON photo_category (is_enabled, sort_order, id);
CREATE TRIGGER trg_photo_category_update_time
    BEFORE UPDATE
    ON photo_category
    FOR EACH ROW EXECUTE FUNCTION set_update_time();

COMMENT
ON TABLE photo_category IS '恋爱相册照片分类表';
COMMENT
ON COLUMN photo_category.id IS '照片分类ID';
COMMENT
ON COLUMN photo_category.category_name IS '分类名称';
COMMENT
ON COLUMN photo_category.sort_order IS '排序值，越小越靠前';
COMMENT
ON COLUMN photo_category.is_enabled IS '是否启用：1-启用 0-停用';
COMMENT
ON COLUMN photo_category.remark IS '备注';
COMMENT
ON COLUMN photo_category.created_by IS '创建者用户ID';
COMMENT
ON COLUMN photo_category.create_time IS '创建时间';
COMMENT
ON COLUMN photo_category.update_time IS '更新时间';

-- ----------------------------
-- Table structure for role
-- ----------------------------
DROP TABLE IF EXISTS role CASCADE;
CREATE TABLE role
(
    id          varchar(64) NOT NULL,
    role_name   varchar(32) NOT NULL,
    role_key    varchar(32) NOT NULL,
    status      smallint    NOT NULL DEFAULT 0,
    sort        integer     NOT NULL DEFAULT 0,
    remark      varchar(255)         DEFAULT NULL,
    create_time timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted  smallint    NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT uk_role_key UNIQUE (role_key)
);

COMMENT
ON TABLE role IS '角色表';
COMMENT
ON COLUMN role.id IS '主键ID';
COMMENT
ON COLUMN role.role_name IS '角色名';
COMMENT
ON COLUMN role.role_key IS '角色唯一标识';
COMMENT
ON COLUMN role.status IS '状态(0：启用 1：禁用)';
COMMENT
ON COLUMN role.sort IS '管理系统中的显示顺序';
COMMENT
ON COLUMN role.remark IS '备注';
COMMENT
ON COLUMN role.create_time IS '创建时间';
COMMENT
ON COLUMN role.update_time IS '最后一次更新时间';
COMMENT
ON COLUMN role.is_deleted IS '逻辑删除(0：未删除 1：已删除)';

-- ----------------------------
-- Table structure for role_permission_rel
-- ----------------------------
DROP TABLE IF EXISTS role_permission_rel CASCADE;
CREATE TABLE role_permission_rel
(
    id            varchar(64) NOT NULL,
    role_id       varchar(64) NOT NULL,
    permission_id varchar(64) NOT NULL,
    create_time   timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time   timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted    smallint    NOT NULL DEFAULT 0,
    PRIMARY KEY (id)
);

COMMENT
ON TABLE role_permission_rel IS '用户权限表';
COMMENT
ON COLUMN role_permission_rel.id IS '主键ID';
COMMENT
ON COLUMN role_permission_rel.role_id IS '角色ID';
COMMENT
ON COLUMN role_permission_rel.permission_id IS '权限ID';
COMMENT
ON COLUMN role_permission_rel.create_time IS '创建时间';
COMMENT
ON COLUMN role_permission_rel.update_time IS '更新时间';
COMMENT
ON COLUMN role_permission_rel.is_deleted IS '逻辑删除(0：未删除 1：已删除)';

-- ----------------------------
-- Table structure for site_config
-- ----------------------------
DROP TABLE IF EXISTS site_config CASCADE;
CREATE TABLE site_config
(
    id           varchar(64)  NOT NULL,
    config_key   varchar(64)  NOT NULL,
    config_name  varchar(64)  NOT NULL,
    config_value text         NOT NULL,
    value_type   varchar(20)  NOT NULL DEFAULT 'text',
    sort_order   integer      NOT NULL DEFAULT 0,
    remark       varchar(255) NOT NULL DEFAULT '',
    create_time  timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time  timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uk_config_key UNIQUE (config_key)
);
CREATE TRIGGER trg_site_config_update_time
    BEFORE UPDATE
    ON site_config
    FOR EACH ROW EXECUTE FUNCTION set_update_time();

COMMENT
ON TABLE site_config IS '网站配置表';
COMMENT
ON COLUMN site_config.id IS '主键ID';
COMMENT
ON COLUMN site_config.config_key IS '配置唯一标识';
COMMENT
ON COLUMN site_config.config_name IS '配置名称';
COMMENT
ON COLUMN site_config.config_value IS '配置值';
COMMENT
ON COLUMN site_config.value_type IS '值类型：text-文本 datetime-日期时间 image-图片';
COMMENT
ON COLUMN site_config.sort_order IS '后台显示顺序';
COMMENT
ON COLUMN site_config.remark IS '备注';
COMMENT
ON COLUMN site_config.create_time IS '创建时间';
COMMENT
ON COLUMN site_config.update_time IS '更新时间';

-- ----------------------------
-- Table structure for story_chapter
-- ----------------------------
DROP TABLE IF EXISTS story_chapter CASCADE;
CREATE TABLE story_chapter
(
    id          varchar(64) NOT NULL,
    name        varchar(50) NOT NULL,
    color_code  varchar(20) NOT NULL DEFAULT '',
    sort_order  integer     NOT NULL DEFAULT 0,
    is_visible  smallint    NOT NULL DEFAULT 1,
    create_time timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);
CREATE TRIGGER trg_story_chapter_update_time
    BEFORE UPDATE
    ON story_chapter
    FOR EACH ROW EXECUTE FUNCTION set_update_time();

COMMENT
ON TABLE story_chapter IS '故事章节表，对故事节点进行阶段性分组';
COMMENT
ON COLUMN story_chapter.id IS '章节ID';
COMMENT
ON COLUMN story_chapter.name IS '章节名称，如"初见"';
COMMENT
ON COLUMN story_chapter.color_code IS '章节主题色，十六进制，如 #D4537E，用于前端渲染';
COMMENT
ON COLUMN story_chapter.sort_order IS '章节排列顺序，升序';
COMMENT
ON COLUMN story_chapter.is_visible IS '是否显示：1-显示 0-隐藏';
COMMENT
ON COLUMN story_chapter.create_time IS '创建时间';
COMMENT
ON COLUMN story_chapter.update_time IS '更新时间';

-- ----------------------------
-- Table structure for story_node
-- ----------------------------
DROP TABLE IF EXISTS story_node CASCADE;
CREATE TABLE story_node
(
    id            varchar(64)  NOT NULL,
    chapter_id    varchar(64)  NOT NULL DEFAULT '0',
    title         varchar(100) NOT NULL,
    summary       varchar(160) NOT NULL,
    content       text,
    happened_time timestamp    NOT NULL,
    location      varchar(100) NOT NULL DEFAULT '',
    cover_image   varchar(500) NOT NULL DEFAULT '',
    tag_label     varchar(30)  NOT NULL DEFAULT '',
    tag_color     varchar(20)  NOT NULL DEFAULT '',
    sort_order    integer      NOT NULL DEFAULT 0,
    is_milestone  smallint     NOT NULL DEFAULT 0,
    is_visible    smallint     NOT NULL DEFAULT 0,
    is_deleted    smallint     NOT NULL DEFAULT 0,
    created_by    varchar(64)  NOT NULL DEFAULT '0',
    create_time   timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time   timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);
CREATE INDEX idx_chapter_sort ON story_node (chapter_id, sort_order);
CREATE INDEX idx_happened_at ON story_node (happened_time);
CREATE TRIGGER trg_story_node_update_time
    BEFORE UPDATE
    ON story_node
    FOR EACH ROW EXECUTE FUNCTION set_update_time();

COMMENT
ON TABLE story_node IS '故事节点表，时间轴上每个事件的主体内容，仅管理员可写';
COMMENT
ON COLUMN story_node.id IS '节点ID';
COMMENT
ON COLUMN story_node.chapter_id IS '所属章节ID，逻辑关联 story_chapter.id，0表示未分类';
COMMENT
ON COLUMN story_node.title IS '节点标题，如"第一次看电影"';
COMMENT
ON COLUMN story_node.summary IS '故事节点摘要';
COMMENT
ON COLUMN story_node.content IS '节点正文，支持较长的叙述内容';
COMMENT
ON COLUMN story_node.happened_time IS '事件发生日期';
COMMENT
ON COLUMN story_node.location IS '发生地点，如"万达影城"，可为空';
COMMENT
ON COLUMN story_node.cover_image IS '封面图片URL（OSS路径），可为空';
COMMENT
ON COLUMN story_node.tag_label IS '标签文字，如"✨ 初见"，直接存在节点上';
COMMENT
ON COLUMN story_node.tag_color IS '标签背景色，十六进制，如 #FBEAF0';
COMMENT
ON COLUMN story_node.sort_order IS '同章节内排列顺序，升序';
COMMENT
ON COLUMN story_node.is_milestone IS '是否里程碑：1-是（如在一起那天） 0-否，里程碑前端加重展示';
COMMENT
ON COLUMN story_node.is_visible IS '是否显示：1-显示 0-隐藏，隐藏后前端不渲染';
COMMENT
ON COLUMN story_node.is_deleted IS '删除标志位：0：未删除 1：已删除';
COMMENT
ON COLUMN story_node.created_by IS '创建者用户ID，逻辑关联 app_user.id';
COMMENT
ON COLUMN story_node.create_time IS '创建时间';
COMMENT
ON COLUMN story_node.update_time IS '更新时间';

-- ----------------------------
-- Table structure for story_node_image
-- ----------------------------
DROP TABLE IF EXISTS story_node_image CASCADE;
CREATE TABLE story_node_image
(
    id          varchar(64)  NOT NULL,
    node_id     varchar(64)  NOT NULL,
    url         varchar(500) NOT NULL,
    alt_text    varchar(100) NOT NULL DEFAULT '',
    sort_order  integer      NOT NULL DEFAULT 0,
    create_time timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);
CREATE INDEX idx_node_sort ON story_node_image (node_id, sort_order);

COMMENT
ON TABLE story_node_image IS '故事节点图片表，每个节点可关联多张照片';
COMMENT
ON COLUMN story_node_image.id IS '图片ID';
COMMENT
ON COLUMN story_node_image.node_id IS '所属节点ID，逻辑关联 story_node.id';
COMMENT
ON COLUMN story_node_image.url IS '图片URL（OSS路径）';
COMMENT
ON COLUMN story_node_image.alt_text IS '图片描述文字，用于 img alt 属性';
COMMENT
ON COLUMN story_node_image.sort_order IS '同节点内图片排列顺序，升序';
COMMENT
ON COLUMN story_node_image.create_time IS '上传时间';

-- ----------------------------
-- Table structure for app_user
-- ----------------------------
DROP TABLE IF EXISTS app_user CASCADE;
CREATE TABLE app_user
(
    id                   varchar(64)  NOT NULL,
    username             varchar(60)  NOT NULL,
    password             varchar(60)           DEFAULT NULL,
    display_name         varchar(60)  NOT NULL DEFAULT '恋人',
    avatar               varchar(500) NOT NULL DEFAULT '',
    wechat_openid        varchar(128)          DEFAULT NULL,
    create_time          timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time          timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted           smallint     NOT NULL DEFAULT 0,
    username_update_time timestamp             DEFAULT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_username UNIQUE (username),
    CONSTRAINT uk_wechat_openid UNIQUE (wechat_openid)
);

COMMENT
ON TABLE app_user IS '用户表';
COMMENT
ON COLUMN app_user.id IS 'id';
COMMENT
ON COLUMN app_user.username IS '用户名';
COMMENT
ON COLUMN app_user.password IS '密码';
COMMENT
ON COLUMN app_user.display_name IS '前台展示名称';
COMMENT
ON COLUMN app_user.avatar IS '用户头像 URL';
COMMENT
ON COLUMN app_user.wechat_openid IS '微信小程序用户唯一标识(openid)';
COMMENT
ON COLUMN app_user.create_time IS '创建时间';
COMMENT
ON COLUMN app_user.update_time IS '最后一次更新时间';
COMMENT
ON COLUMN app_user.is_deleted IS '逻辑删除：0：未删除 1：已删除';
COMMENT
ON COLUMN app_user.username_update_time IS '用户名最近修改时间';

-- ----------------------------
-- Table structure for user_role_rel
-- ----------------------------
DROP TABLE IF EXISTS user_role_rel CASCADE;
CREATE TABLE user_role_rel
(
    id          varchar(64) NOT NULL,
    user_id     varchar(64) NOT NULL,
    role_id     varchar(64) NOT NULL,
    create_time timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted  smallint    NOT NULL DEFAULT 0,
    PRIMARY KEY (id)
);

COMMENT
ON TABLE user_role_rel IS '用户角色表';
COMMENT
ON COLUMN user_role_rel.id IS '主键ID';
COMMENT
ON COLUMN user_role_rel.user_id IS '用户ID';
COMMENT
ON COLUMN user_role_rel.role_id IS '角色ID';
COMMENT
ON COLUMN user_role_rel.create_time IS '创建时间';
COMMENT
ON COLUMN user_role_rel.update_time IS '更新时间';
COMMENT
ON COLUMN user_role_rel.is_deleted IS '逻辑删除(0：未删除 1：已删除)';

-- ----------------------------
-- Table structure for ai_customer_service_md_storage
-- ----------------------------
CREATE TABLE ai_customer_service_md_storage
(
    id                 VARCHAR(64) PRIMARY KEY,
    original_file_name VARCHAR(160) NOT NULL,
    new_file_name      VARCHAR(160) NOT NULL,
    file_path          VARCHAR(500) NOT NULL,
    file_size          BIGINT       NOT NULL,
    status             SMALLINT  DEFAULT 0,
    remark             VARCHAR(200),
    create_time        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 添加表注释
COMMENT
ON TABLE ai_customer_service_md_storage IS '问答 Markdown 文件存储表';

-- 添加字段注释
COMMENT
ON COLUMN ai_customer_service_md_storage.id IS '主键ID';
COMMENT
ON COLUMN ai_customer_service_md_storage.original_file_name IS '原始文件名称';
COMMENT
ON COLUMN ai_customer_service_md_storage.new_file_name IS '新命名文件名称（防止名称相同导致覆盖）';
COMMENT
ON COLUMN ai_customer_service_md_storage.file_path IS '文件存储路径';
COMMENT
ON COLUMN ai_customer_service_md_storage.file_size IS '文件大小(字节)';
COMMENT
ON COLUMN ai_customer_service_md_storage.status IS '处理状态：0-待处理 1-向量化中 2-已完成 3-失败';
COMMENT
ON COLUMN ai_customer_service_md_storage.remark IS '备注信息';
COMMENT
ON COLUMN ai_customer_service_md_storage.create_time IS '创建时间';
COMMENT
ON COLUMN ai_customer_service_md_storage.update_time IS '更新时间';

-- 创建索引
CREATE INDEX idx_ai_customer_service_md_storage_status ON ai_customer_service_md_storage (status);
CREATE INDEX idx_ai_customer_service_md_storage_created_time ON ai_customer_service_md_storage (create_time);
CREATE INDEX idx_ai_customer_service_md_storage_original_file_name ON ai_customer_service_md_storage (original_file_name);

-- ----------------------------
-- Table structure for t_vector_store
-- ----------------------------
-- 启用扩展
CREATE
EXTENSION IF NOT EXISTS vector;
CREATE
EXTENSION IF NOT EXISTS hstore;
CREATE
EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS t_vector_store
(
    id
    uuid
    DEFAULT
    uuid_generate_v4
(
) PRIMARY KEY,
    content text,
    metadata json,
    embedding vector
(
    1536
)
    );

-- 创建索引
CREATE INDEX ON t_vector_store USING HNSW (embedding vector_cosine_ops);
