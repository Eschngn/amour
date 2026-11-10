-- Amour 平台 v2 演示/集成测试种子数据（SQLite）。
-- 可重复执行：全部使用 INSERT OR IGNORE，不覆盖已有业务数据。

-- 平台管理员账号初始化。默认账号 admin / Admin@123456，部署后请立即修改密码。
INSERT OR IGNORE INTO `user`
    (`amour_id`, `username`, `password`, `display_name`, `avatar`, `wechat_openid`,
     `create_time`, `update_time`, `is_deleted`, `is_platform_admin`)
VALUES
    ('LYADMIN001', 'admin',
     '$2a$10$sIvjF5pqaZUtKQW4bVXB0ubKWZQDxu3ZdZsHS6jdBpCFOPJehf0ea',
     '平台管理员', '', NULL, '2026-01-01 10:00:00', '2026-01-01 10:00:00', 0, 1);


INSERT OR IGNORE INTO `user`
    (`id`, `amour_id`, `username`, `password`, `display_name`, `avatar`, `wechat_openid`,
     `create_time`, `update_time`, `is_deleted`, `is_platform_admin`)
VALUES
    (1001, 'LY100001', 'chengliuxiang', NULL, '橙留香', '', NULL,
     '2026-01-01 10:00:00', '2026-01-01 10:00:00', 0, 0),
    (1002, 'LY100002', 'shangguanziyi', NULL, '子怡', '', NULL,
     '2026-01-01 10:00:00', '2026-01-01 10:00:00', 0, 0);

INSERT OR IGNORE INTO `couple_space`
    (`id`, `space_code`, `space_name`, `description`, `cover_image`, `status`, `visibility`,
     `love_start_time`, `public_at`, `created_by`, `create_time`, `update_time`)
VALUES
    (2001, 'SPACE-DEMO-001', '橙子与子怡的四季', '记录我们认真生活的每一天。', '',
     1, 1, '2024-05-20 19:30:00', '2024-05-20 20:00:00', 1001,
     '2026-01-01 10:00:00', '2026-01-01 10:00:00');

INSERT OR IGNORE INTO `couple_member`
    (`id`, `space_id`, `user_id`, `member_role`, `status`, `joined_at`, `create_time`, `update_time`)
VALUES
    (3001, 2001, 1001, 1, 1, '2024-05-20 19:30:00', '2026-01-01 10:00:00', '2026-01-01 10:00:00'),
    (3002, 2001, 1002, 2, 1, '2024-05-20 19:30:00', '2026-01-01 10:00:00', '2026-01-01 10:00:00');

INSERT OR IGNORE INTO `story_chapter`
    (`id`, `space_id`, `name`, `color_code`, `sort_order`, `is_visible`, `created_by`, `create_time`, `update_time`)
VALUES
    (7001, 2001, '初见', '#D94F70', 10, 1, 1001, '2026-01-01 10:00:00', '2026-01-01 10:00:00'),
    (7002, 2001, '日常', '#5B8DEF', 20, 1, 1001, '2026-01-01 10:00:00', '2026-01-01 10:00:00');

INSERT OR IGNORE INTO `story_node`
    (`id`, `space_id`, `chapter_id`, `title`, `summary`, `content`, `happened_time`, `location`,
     `cover_image`, `tag_label`, `tag_color`, `sort_order`, `is_milestone`, `visibility`,
     `is_deleted`, `created_by`, `create_time`, `update_time`)
VALUES
    (8001, 2001, 7001, '第一次见面', '那天在咖啡馆坐了很久。',
     '我们第一次见面，聊了很多关于未来和旅行的话题。', '2024-05-20 19:30:00', '杭州',
     '', '初见', '#D94F70', 0, 1, 1, 0, 1001, '2026-01-01 10:00:00', '2026-01-01 10:00:00'),
    (8002, 2001, 7002, '第一次一起看电影', '散场后还在讨论剧情。',
     '第一次一起看电影，回家路上买了两杯热奶茶。', '2024-06-01 20:00:00', '杭州',
     '', '日常', '#5B8DEF', 0, 0, 1, 0, 1001, '2026-01-01 10:00:00', '2026-01-01 10:00:00'),
    (8003, 2001, 7002, '只属于我们的备忘', '仅空间成员可见。',
     '这是一条不会出现在恋爱广场的私密故事。', '2024-06-02 20:00:00', '',
     '', '', '', 0, 0, 0, 0, 1001, '2026-01-01 10:00:00', '2026-01-01 10:00:00');

INSERT OR IGNORE INTO `photo_category`
    (`id`, `space_id`, `category_name`, `sort_order`, `is_enabled`, `remark`, `created_by`,
     `create_time`, `update_time`)
VALUES
    (10001, 2001, '日常', 10, 1, '', 1001, '2026-01-01 10:00:00', '2026-01-01 10:00:00');

INSERT OR IGNORE INTO `photo`
    (`id`, `space_id`, `photo_category_id`, `title`, `description`, `url`, `taken_time`,
     `location`, `sort_order`, `is_cover`, `visibility`, `is_deleted`, `created_by`,
     `create_time`, `update_time`)
VALUES
    (11001, 2001, 10001, '周末早餐', '一起做的第一顿早餐。', '/assets/album/1.jpg',
     '2024-05-20 09:00:00', '杭州', 0, 1, 1, 0, 1001, '2026-01-01 10:00:00', '2026-01-01 10:00:00'),
    (11002, 2001, 10001, '夏日散步', '傍晚的风很轻。', '/assets/album/2.jpg',
     '2024-07-01 18:00:00', '杭州', 10, 0, 1, 0, 1001, '2026-01-01 10:00:00', '2026-01-01 10:00:00'),
    (11003, 2001, 10001, '只属于我们的照片', '仅空间成员可见。', '/assets/album/3.jpg',
     '2024-07-02 18:00:00', '', 20, 0, 0, 0, 1001, '2026-01-01 10:00:00', '2026-01-01 10:00:00');

INSERT OR IGNORE INTO `anniversary`
    (`id`, `space_id`, `title`, `description`, `anniversary_date`, `repeat_type`, `category`,
     `color_code`, `location`, `sort_order`, `visibility`, `is_deleted`, `created_by`,
     `create_time`, `update_time`)
VALUES
    (12001, 2001, '在一起的第一天', '从这一天开始，我们有了共同的时间线。', '2024-05-20',
     1, 'love', '#D94F70', '杭州', 0, 1, 0, 1001, '2026-01-01 10:00:00', '2026-01-01 10:00:00'),
    (12002, 2001, '第一次旅行', '一起去看海。', '2024-10-01',
     1, 'journey', '#5B8DEF', '厦门', 10, 1, 0, 1001, '2026-01-01 10:00:00', '2026-01-01 10:00:00');

INSERT OR IGNORE INTO `message`
    (`id`, `space_id`, `user_id`, `content`, `is_deleted`, `create_time`, `update_time`)
VALUES
    (13001, 2001, 1001, '今天也很想和你一起散步', 0, '2026-01-01 10:00:00', '2026-01-01 10:00:00');
