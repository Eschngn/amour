-- Amour multi-user platform schema for SQLite 3.
-- Fresh-install DDL only. No ALTER, DROP, INSERT, or FOREIGN KEY statements.
-- SQLite has no column COMMENT syntax; each field description is a SQL line comment.
-- Application services enforce relationships and update update_time on writes.

CREATE TABLE `user` (
    -- 用户主键ID
    `id` INTEGER PRIMARY KEY AUTOINCREMENT,
    -- 恋语ID，系统随机生成且对外展示，类似平台用户号
    `amour_id` TEXT NOT NULL,
    -- 登录用户名
    `username` TEXT NOT NULL,
    -- BCrypt加密密码，微信用户可为空
    `password` TEXT DEFAULT NULL,
    -- 用户展示昵称
    `display_name` TEXT NOT NULL DEFAULT '恋人',
    -- 用户头像URL
    `avatar` TEXT NOT NULL DEFAULT '',
    -- 微信小程序用户唯一标识
    `wechat_openid` TEXT DEFAULT NULL,
    -- 用户名最近修改时间
    `username_update_time` TEXT DEFAULT NULL,
    -- 注册时间
    `create_time` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- 最后更新时间，由应用在更新时维护
    `update_time` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- 逻辑删除：0-未删除 1-已删除
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    -- 是否为平台管理员：0-否 1-是
    `is_platform_admin` INTEGER NOT NULL DEFAULT 0,
    UNIQUE (`amour_id`),
    UNIQUE (`username`),
    UNIQUE (`wechat_openid`)
);
CREATE INDEX `idx_user_deleted_admin` ON `user` (`is_deleted`, `is_platform_admin`);

CREATE TABLE `couple_space` (
    -- 情侣空间主键ID
    `id` INTEGER PRIMARY KEY AUTOINCREMENT,
    -- 情侣空间公开标识
    `space_code` TEXT NOT NULL UNIQUE,
    -- 情侣空间名称
    `space_name` TEXT NOT NULL DEFAULT '我们的故事',
    -- 情侣空间简介
    `description` TEXT NOT NULL DEFAULT '',
    -- 情侣空间封面图片URL
    `cover_image` TEXT NOT NULL DEFAULT '',
    -- 空间状态：0-等待绑定 1-正常 2-冻结 3-历史归档 4-删除等待期 5-已解绑（逻辑删除）
    `status` INTEGER NOT NULL DEFAULT 0,
    -- 空间可见性：0-私密 1-公开到恋爱广场
    `visibility` INTEGER NOT NULL DEFAULT 0,
    -- 恋爱开始时间
    `love_start_time` TEXT DEFAULT NULL,
    -- 首次公开时间
    `public_at` TEXT DEFAULT NULL,
    -- 归档时间
    `archived_at` TEXT DEFAULT NULL,
    -- 永久删除等待期结束时间
    `delete_after` TEXT DEFAULT NULL,
    -- 完成解绑（逻辑删除）时间，status=5 时写入
    `deleted_at` TEXT DEFAULT NULL,
    -- 空间创建者用户ID
    `created_by` INTEGER NOT NULL,
    -- 创建时间
    `create_time` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- 最后更新时间，由应用在更新时维护
    `update_time` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX `idx_couple_space_public` ON `couple_space` (`status`, `visibility`, `public_at`);
CREATE INDEX `idx_couple_space_creator_status` ON `couple_space` (`created_by`, `status`);

CREATE TABLE `couple_member` (
    -- 空间成员关系主键ID
    `id` INTEGER PRIMARY KEY AUTOINCREMENT,
    -- 情侣空间ID
    `space_id` INTEGER NOT NULL,
    -- 用户ID
    `user_id` INTEGER NOT NULL,
    -- 成员身份：1-空间发起人 2-另一半
    `member_role` INTEGER NOT NULL DEFAULT 2,
    -- 成员状态：0-邀请中 1-有效 2-暂停 3-已退出 4-已移除
    `status` INTEGER NOT NULL DEFAULT 0,
    -- 正式加入时间
    `joined_at` TEXT DEFAULT NULL,
    -- 退出或移除时间
    `left_at` TEXT DEFAULT NULL,
    -- 创建时间
    `create_time` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- 最后更新时间，由应用在更新时维护
    `update_time` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (`space_id`, `user_id`)
);
CREATE INDEX `idx_couple_member_user_status` ON `couple_member` (`user_id`, `status`);
CREATE INDEX `idx_couple_member_space_status` ON `couple_member` (`space_id`, `status`);

CREATE TABLE `couple_invitation` (
    -- 空间邀请主键ID
    `id` INTEGER PRIMARY KEY AUTOINCREMENT,
    -- 被邀请加入的空间ID
    `space_id` INTEGER NOT NULL,
    -- 邀请发起人用户ID
    `inviter_user_id` INTEGER NOT NULL,
    -- 指定受邀用户ID，为空表示持有邀请链接的账号可申请
    `invitee_user_id` INTEGER DEFAULT NULL,
    -- 邀请令牌SHA-256摘要，用于校验
    `token_hash` TEXT NOT NULL UNIQUE,
    -- 明文邀请令牌，用于空间成员在有效期内再次查看和复制邀请链接；旧数据可为空
    `token_value` TEXT DEFAULT NULL,
    -- 邀请状态：0-待接受 1-已接受 2-已撤销 3-已过期 4-已拒绝
    `status` INTEGER NOT NULL DEFAULT 0,
    -- 邀请过期时间
    `expires_at` TEXT NOT NULL,
    -- 接受邀请时间
    `accepted_at` TEXT DEFAULT NULL,
    -- 创建时间
    `create_time` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- 最后更新时间，由应用在更新时维护
    `update_time` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX `idx_couple_invitation_space_status` ON `couple_invitation` (`space_id`, `status`);
CREATE INDEX `idx_couple_invitation_invitee_status` ON `couple_invitation` (`invitee_user_id`, `status`);
CREATE INDEX `idx_couple_invitation_expiry` ON `couple_invitation` (`status`, `expires_at`);

CREATE TABLE `couple_space_restore_confirm` (
    -- 恢复确认主键ID
    `id` INTEGER PRIMARY KEY AUTOINCREMENT,
    -- 情侣空间ID
    `space_id` INTEGER NOT NULL,
    -- 确认恢复的用户ID
    `user_id` INTEGER NOT NULL,
    -- 首次确认时间
    `create_time` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- 最后确认时间，由应用在更新时维护
    `update_time` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (`space_id`, `user_id`)
);
CREATE INDEX `idx_couple_space_restore_confirm_space` ON `couple_space_restore_confirm` (`space_id`);

CREATE TABLE `couple_space_unbind_request` (
    -- 解绑申请主键ID
    `id` INTEGER PRIMARY KEY AUTOINCREMENT,
    -- 情侣空间ID
    `space_id` INTEGER NOT NULL,
    -- 解绑发起人用户ID，必须是空间当前有效成员
    `requester_user_id` INTEGER NOT NULL,
    -- 申请状态：0-待同意 1-已同意 2-已拒绝 3-已取消
    `status` INTEGER NOT NULL DEFAULT 0,
    -- 申请创建时间
    `create_time` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- 最后更新时间，由应用在更新时维护
    `update_time` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- 申请被处理（同意/拒绝/取消）的时间
    `resolved_at` TEXT DEFAULT NULL,
    -- 处理申请的成员用户ID；取消时为发起人本人
    `resolved_by_user_id` INTEGER DEFAULT NULL
);
CREATE INDEX `idx_couple_space_unbind_space_status` ON `couple_space_unbind_request` (`space_id`, `status`);
CREATE INDEX `idx_couple_space_unbind_requester_status` ON `couple_space_unbind_request` (`requester_user_id`, `status`);
-- 同一空间最多只能有一条待处理（status=0）解绑申请；历史申请保留可追溯。
CREATE UNIQUE INDEX `uk_couple_space_unbind_pending` ON `couple_space_unbind_request` (`space_id`) WHERE `status` = 0;

CREATE TABLE `platform_config` (
    -- 平台配置主键ID
    `id` INTEGER PRIMARY KEY AUTOINCREMENT,
    -- 平台配置唯一键
    `config_key` TEXT NOT NULL UNIQUE,
    -- 平台配置名称
    `config_name` TEXT NOT NULL,
    -- 平台配置值
    `config_value` TEXT NOT NULL,
    -- 值类型：text-文本 image-图片 number-数字 json-JSON
    `value_type` TEXT NOT NULL DEFAULT 'text',
    -- 后台显示顺序
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    -- 配置备注
    `remark` TEXT NOT NULL DEFAULT '',
    -- 创建时间
    `create_time` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- 最后更新时间，由应用在更新时维护
    `update_time` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `couple_space_config` (
    -- 空间配置主键ID
    `id` INTEGER PRIMARY KEY AUTOINCREMENT,
    -- 情侣空间ID
    `space_id` INTEGER NOT NULL,
    -- 空间配置键
    `config_key` TEXT NOT NULL,
    -- 空间配置值
    `config_value` TEXT NOT NULL,
    -- 值类型：text-文本 datetime-日期时间 image-图片 json-JSON
    `value_type` TEXT NOT NULL DEFAULT 'text',
    -- 首次创建配置的用户ID
    `created_by` INTEGER NOT NULL,
    -- 创建时间
    `create_time` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- 最后更新时间，由应用在更新时维护
    `update_time` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (`space_id`, `config_key`)
);
CREATE INDEX `idx_couple_space_config_creator` ON `couple_space_config` (`created_by`);

CREATE TABLE `story_chapter` (
    -- 故事章节主键ID
    `id` INTEGER PRIMARY KEY AUTOINCREMENT,
    -- 情侣空间ID
    `space_id` INTEGER NOT NULL,
    -- 章节名称
    `name` TEXT NOT NULL,
    -- 章节主题色
    `color_code` TEXT NOT NULL DEFAULT '',
    -- 章节排列顺序
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    -- 是否在情侣空间中显示：1-显示 0-隐藏
    `is_visible` INTEGER NOT NULL DEFAULT 1,
    -- 创建者用户ID
    `created_by` INTEGER NOT NULL,
    -- 创建时间
    `create_time` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- 最后更新时间，由应用在更新时维护
    `update_time` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (`space_id`, `name`)
);
CREATE INDEX `idx_story_chapter_space_sort` ON `story_chapter` (`space_id`, `is_visible`, `sort_order`);
CREATE INDEX `idx_story_chapter_creator` ON `story_chapter` (`created_by`);

CREATE TABLE `story_node` (
    -- 故事节点主键ID
    `id` INTEGER PRIMARY KEY AUTOINCREMENT,
    -- 情侣空间ID
    `space_id` INTEGER NOT NULL,
    -- 所属故事章节ID
    `chapter_id` INTEGER NOT NULL,
    -- 故事标题
    `title` TEXT NOT NULL,
    -- 故事摘要
    `summary` TEXT NOT NULL DEFAULT '',
    -- 故事正文
    `content` TEXT NOT NULL,
    -- 事件发生时间
    `happened_time` TEXT NOT NULL,
    -- 发生地点
    `location` TEXT NOT NULL DEFAULT '',
    -- 封面图片URL
    `cover_image` TEXT NOT NULL DEFAULT '',
    -- 标签名称
    `tag_label` TEXT NOT NULL DEFAULT '',
    -- 标签颜色
    `tag_color` TEXT NOT NULL DEFAULT '',
    -- 同章节内排序值
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    -- 是否为里程碑：1-是 0-否
    `is_milestone` INTEGER NOT NULL DEFAULT 0,
    -- 可见性：0-仅空间成员 1-公开到恋爱广场 2-隐藏
    `visibility` INTEGER NOT NULL DEFAULT 0,
    -- 逻辑删除：0-未删除 1-已删除
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    -- 创建者用户ID
    `created_by` INTEGER NOT NULL,
    -- 最后修改者用户ID
    `updated_by` INTEGER DEFAULT NULL,
    -- 创建时间
    `create_time` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- 最后更新时间，由应用在更新时维护
    `update_time` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX `idx_story_node_space_chapter_sort` ON `story_node` (`space_id`, `chapter_id`, `is_deleted`, `sort_order`);
CREATE INDEX `idx_story_node_space_visibility` ON `story_node` (`space_id`, `visibility`, `is_deleted`);
CREATE INDEX `idx_story_node_space_happened` ON `story_node` (`space_id`, `happened_time`);
CREATE INDEX `idx_story_node_creator` ON `story_node` (`created_by`);

CREATE TABLE `story_node_image` (
    -- 故事节点图片主键ID
    `id` INTEGER PRIMARY KEY AUTOINCREMENT,
    -- 情侣空间ID
    `space_id` INTEGER NOT NULL,
    -- 故事节点ID
    `node_id` INTEGER NOT NULL,
    -- 图片URL
    `url` TEXT NOT NULL,
    -- 图片描述
    `alt_text` TEXT NOT NULL DEFAULT '',
    -- 节点内图片排序值
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    -- 上传者用户ID
    `created_by` INTEGER NOT NULL,
    -- 上传时间
    `create_time` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX `idx_story_node_image_space_node_sort` ON `story_node_image` (`space_id`, `node_id`, `sort_order`);
CREATE INDEX `idx_story_node_image_creator` ON `story_node_image` (`created_by`);

CREATE TABLE `photo_category` (
    -- 相册分类主键ID
    `id` INTEGER PRIMARY KEY AUTOINCREMENT,
    -- 情侣空间ID
    `space_id` INTEGER NOT NULL,
    -- 分类名称
    `category_name` TEXT NOT NULL,
    -- 分类排序值
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    -- 是否启用：1-启用 0-停用
    `is_enabled` INTEGER NOT NULL DEFAULT 1,
    -- 分类备注
    `remark` TEXT NOT NULL DEFAULT '',
    -- 创建者用户ID
    `created_by` INTEGER NOT NULL,
    -- 创建时间
    `create_time` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- 最后更新时间，由应用在更新时维护
    `update_time` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (`space_id`, `category_name`)
);
CREATE INDEX `idx_photo_category_space_enabled_sort` ON `photo_category` (`space_id`, `is_enabled`, `sort_order`);
CREATE INDEX `idx_photo_category_creator` ON `photo_category` (`created_by`);

CREATE TABLE `photo` (
    -- 照片主键ID
    `id` INTEGER PRIMARY KEY AUTOINCREMENT,
    -- 情侣空间ID
    `space_id` INTEGER NOT NULL,
    -- 相册分类ID
    `photo_category_id` INTEGER NOT NULL,
    -- 照片标题
    `title` TEXT NOT NULL DEFAULT '',
    -- 照片描述
    `description` TEXT NOT NULL DEFAULT '',
    -- 照片URL
    `url` TEXT NOT NULL,
    -- 照片拍摄时间
    `taken_time` TEXT DEFAULT NULL,
    -- 拍摄地点
    `location` TEXT NOT NULL DEFAULT '',
    -- 照片排序值
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    -- 是否为空间封面候选照片：1-是 0-否
    `is_cover` INTEGER NOT NULL DEFAULT 0,
    -- 可见性：0-仅空间成员 1-公开到恋爱广场 2-隐藏
    `visibility` INTEGER NOT NULL DEFAULT 0,
    -- 逻辑删除：0-未删除 1-已删除
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    -- 上传者用户ID
    `created_by` INTEGER NOT NULL,
    -- 最后修改者用户ID
    `updated_by` INTEGER DEFAULT NULL,
    -- 上传时间
    `create_time` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- 最后更新时间，由应用在更新时维护
    `update_time` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX `idx_photo_space_list` ON `photo` (`space_id`, `is_deleted`, `visibility`, `sort_order`, `taken_time`);
CREATE INDEX `idx_photo_space_category` ON `photo` (`space_id`, `photo_category_id`);
CREATE INDEX `idx_photo_creator` ON `photo` (`created_by`);

CREATE TABLE `anniversary` (
    -- 纪念日主键ID
    `id` INTEGER PRIMARY KEY AUTOINCREMENT,
    -- 情侣空间ID
    `space_id` INTEGER NOT NULL,
    -- 纪念日名称
    `title` TEXT NOT NULL,
    -- 纪念日描述
    `description` TEXT NOT NULL DEFAULT '',
    -- 纪念日期，建议使用YYYY-MM-DD
    `anniversary_date` TEXT NOT NULL,
    -- 重复类型：0-不重复 1-每年重复
    `repeat_type` INTEGER NOT NULL DEFAULT 1,
    -- 分类：love/birthday/journey/memory/milestone/other
    `category` TEXT NOT NULL DEFAULT 'other',
    -- 卡片主题色
    `color_code` TEXT NOT NULL DEFAULT '#D94F70',
    -- 纪念地点
    `location` TEXT NOT NULL DEFAULT '',
    -- 排序值
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    -- 可见性：0-仅空间成员 1-公开到恋爱广场 2-隐藏
    `visibility` INTEGER NOT NULL DEFAULT 0,
    -- 逻辑删除：0-未删除 1-已删除
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    -- 创建者用户ID
    `created_by` INTEGER NOT NULL,
    -- 最后修改者用户ID
    `updated_by` INTEGER DEFAULT NULL,
    -- 创建时间
    `create_time` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- 最后更新时间，由应用在更新时维护
    `update_time` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX `idx_anniversary_space_list` ON `anniversary` (`space_id`, `is_deleted`, `visibility`, `anniversary_date`, `sort_order`);
CREATE INDEX `idx_anniversary_space_category` ON `anniversary` (`space_id`, `category`, `is_deleted`);
CREATE INDEX `idx_anniversary_creator` ON `anniversary` (`created_by`);

CREATE TABLE `message` (
    -- 私密留言主键ID
    `id` INTEGER PRIMARY KEY AUTOINCREMENT,
    -- 情侣空间ID
    `space_id` INTEGER NOT NULL,
    -- 留言发布用户ID
    `user_id` INTEGER NOT NULL,
    -- 私密留言内容
    `content` TEXT NOT NULL,
    -- 逻辑删除：0-未删除 1-已删除
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    -- 留言时间
    `create_time` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- 最后更新时间，由应用在更新时维护
    `update_time` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX `idx_message_space_time` ON `message` (`space_id`, `is_deleted`, `create_time`);
CREATE INDEX `idx_message_user_time` ON `message` (`user_id`, `create_time`);

CREATE TABLE `message_reply` (
    -- 私密留言回复主键ID
    `id` INTEGER PRIMARY KEY AUTOINCREMENT,
    -- 情侣空间ID
    `space_id` INTEGER NOT NULL,
    -- 所属留言ID
    `message_id` INTEGER NOT NULL,
    -- 父回复ID，为空表示直接回复留言
    `parent_reply_id` INTEGER DEFAULT NULL,
    -- 回复发布用户ID
    `from_user_id` INTEGER NOT NULL,
    -- 被回复用户ID
    `to_user_id` INTEGER NOT NULL,
    -- 回复内容
    `content` TEXT NOT NULL,
    -- 逻辑删除：0-未删除 1-已删除
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    -- 回复时间
    `create_time` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- 最后更新时间，由应用在更新时维护
    `update_time` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX `idx_message_reply_space_message_time` ON `message_reply` (`space_id`, `message_id`, `create_time`);
CREATE INDEX `idx_message_reply_parent` ON `message_reply` (`parent_reply_id`);
CREATE INDEX `idx_message_reply_from_user` ON `message_reply` (`from_user_id`);

CREATE TABLE `content_report` (
    -- 内容举报主键ID
    `id` INTEGER PRIMARY KEY AUTOINCREMENT,
    -- 举报用户ID
    `reporter_user_id` INTEGER NOT NULL,
    -- 被举报内容所属情侣空间ID
    `space_id` INTEGER NOT NULL,
    -- 被举报类型：space/story/photo/anniversary
    `content_type` TEXT NOT NULL,
    -- 被举报内容ID
    `content_id` INTEGER NOT NULL,
    -- 举报原因
    `reason` TEXT NOT NULL,
    -- 处理状态：0-待处理 1-已处理 2-已驳回
    `status` INTEGER NOT NULL DEFAULT 0,
    -- 处理举报的平台管理员用户ID
    `processed_by` INTEGER DEFAULT NULL,
    -- 处理时间
    `processed_at` TEXT DEFAULT NULL,
    -- 举报时间
    `create_time` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- 最后更新时间，由应用在更新时维护
    `update_time` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX `idx_content_report_status_time` ON `content_report` (`status`, `create_time`);
CREATE INDEX `idx_content_report_target` ON `content_report` (`content_type`, `content_id`);
CREATE INDEX `idx_content_report_reporter` ON `content_report` (`reporter_user_id`, `create_time`);

-- 举报处理备注；与 content_report 分表保存，避免对既有表做不可重复执行的 ALTER。
CREATE TABLE `content_report_handle` (
    -- 举报处理记录主键ID
    `id` INTEGER PRIMARY KEY AUTOINCREMENT,
    -- 被处理的举报ID
    `report_id` INTEGER NOT NULL,
    -- 处理管理员用户ID
    `admin_user_id` INTEGER NOT NULL,
    -- 处理动作：reject-驳回 confirm-确认违规
    `action` TEXT NOT NULL,
    -- 处理备注，必填
    `note` TEXT NOT NULL,
    -- 处理时间
    `create_time` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX `uk_content_report_handle_report` ON `content_report_handle` (`report_id`);
CREATE INDEX `idx_content_report_handle_admin_time` ON `content_report_handle` (`admin_user_id`, `create_time`);

-- 后台管理操作审计。只记录元数据，不记录内容正文、密码、openid 或邀请明文 token。
CREATE TABLE `admin_audit_log` (
    -- 审计主键ID
    `id` INTEGER PRIMARY KEY AUTOINCREMENT,
    -- 操作管理员用户ID
    `admin_user_id` INTEGER NOT NULL,
    -- 动作标识，例如 SPACE_RESTORE / CONTENT_VISIBILITY / REPORT_PROCESS
    `action` TEXT NOT NULL,
    -- 目标类型：space/content/user/report/dict/admin
    `target_type` TEXT NOT NULL DEFAULT '',
    -- 目标空间ID
    `target_space_id` INTEGER DEFAULT NULL,
    -- 目标内容类型：story/photo/anniversary/message/space
    `target_content_type` TEXT DEFAULT NULL,
    -- 目标内容ID
    `target_content_id` INTEGER DEFAULT NULL,
    -- 目标用户ID
    `target_user_id` INTEGER DEFAULT NULL,
    -- 目标举报ID
    `target_report_id` INTEGER DEFAULT NULL,
    -- 操作原因
    `reason` TEXT NOT NULL DEFAULT '',
    -- 执行结果：SUCCESS/FAILURE
    `result` TEXT NOT NULL DEFAULT 'SUCCESS',
    -- 状态摘要，不包含正文
    `detail` TEXT NOT NULL DEFAULT '',
    -- 操作时间
    `create_time` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX `idx_admin_audit_action_time` ON `admin_audit_log` (`action`, `create_time`);
CREATE INDEX `idx_admin_audit_space_time` ON `admin_audit_log` (`target_space_id`, `create_time`);
CREATE INDEX `idx_admin_audit_admin_time` ON `admin_audit_log` (`admin_user_id`, `create_time`);

-- 后台管理员由 user.is_platform_admin 标识，不建角色/权限表；
-- 管理员账号通过 db/amour_platform_v2_seed.sql 或 amour_admin_governance_sqlite.sql 初始化。
