-- Amour 权限初始化数据（MySQL 8.x）
-- 前置条件：
-- 1. role 表中的 role_key 已建立唯一索引
-- 2. 本脚本按 role_key 幂等写入，不依赖 role 自增 ID

SET NAMES utf8mb4;
START TRANSACTION;

-- 确保普通用户角色存在；已有角色只恢复为启用，不改动其余字段。
INSERT INTO `role` (`role_name`, `role_key`, `status`, `sort`, `remark`, `is_deleted`)
VALUES ('普通用户', 'common', 0, 2, '普通用户角色', b'0')
    ON DUPLICATE KEY UPDATE
                         `status` = 0,
                         `is_deleted` = b'0',
                         `update_time` = CURRENT_TIMESTAMP;

-- 确保后台管理员角色存在；已有角色只恢复为启用，不改动其余字段。
INSERT INTO `role` (`role_name`, `role_key`, `status`, `sort`, `remark`, `is_deleted`)
VALUES ('管理员', 'admin', 0, 1, '后台系统管理员', b'0')
    ON DUPLICATE KEY UPDATE
                         `status` = 0,
                         `is_deleted` = b'0',
                         `update_time` = CURRENT_TIMESTAMP;

-- 确保留言用户角色存在；该角色用于授予前台留言发布和回复权限。
INSERT INTO `role` (`role_name`, `role_key`, `status`, `sort`, `remark`, `is_deleted`)
VALUES ('留言用户', 'message_user', 0, 3, '可发布和回复留言', b'0')
    ON DUPLICATE KEY UPDATE
                         `status` = 0,
                         `is_deleted` = b'0',
                         `update_time` = CURRENT_TIMESTAMP;

COMMIT;

-- 权限目录
INSERT INTO `permission`
    (`parent_id`, `name`, `type`, `menu_url`, `menu_icon`, `sort`, `permission_key`, `status`, `is_deleted`)
SELECT s.parent_id, s.name, s.type, s.menu_url, s.menu_icon, s.sort, s.permission_key, 0, b'0'
FROM (
    SELECT 0 AS parent_id, '前台' AS name, 1 AS type, '' AS menu_url, 'House' AS menu_icon, 10 AS sort, 'frontend' AS permission_key
    UNION ALL
    SELECT 0, '后台', 1, '', 'Setting', 20, 'admin'
) s
WHERE NOT EXISTS (
    SELECT 1 FROM `permission` p WHERE p.permission_key = s.permission_key
);

-- 前台模块权限。模块本身使用 frontend:<module>，查询等操作作为其子权限。
INSERT INTO `permission`
    (`parent_id`, `name`, `type`, `menu_url`, `menu_icon`, `sort`, `permission_key`, `status`, `is_deleted`)
SELECT parent.id, s.name, s.type, s.menu_url, s.menu_icon, s.sort, s.permission_key, 0, b'0'
FROM (
    SELECT 'frontend' AS parent_key, '首页' AS name, 2 AS type, '/' AS menu_url, 'House' AS menu_icon, 10 AS sort, 'frontend:home' AS permission_key
    UNION ALL
    SELECT 'frontend', '故事', 2, '/story', 'Collection', 20, 'frontend:story'
    UNION ALL
    SELECT 'frontend', '留言', 2, '/message', 'ChatDotRound', 30, 'frontend:message'
    UNION ALL
    SELECT 'frontend', '相册', 2, '/photo', 'Picture', 40, 'frontend:photo'
    UNION ALL
    SELECT 'frontend', '我的', 2, '/profile', 'User', 50, 'frontend:profile'
) s
JOIN `permission` parent
  ON parent.permission_key = s.parent_key
 AND parent.is_deleted = b'0'
WHERE NOT EXISTS (
    SELECT 1 FROM `permission` p WHERE p.permission_key = s.permission_key
);

-- 兼容旧版本：旧的 frontend:<module>:query 记录保留原 ID，迁移为新模块下的查询子权限。
UPDATE `permission` old_permission
JOIN `permission` frontend_root
  ON frontend_root.permission_key = 'frontend'
 AND frontend_root.is_deleted = b'0'
JOIN `permission` module_permission
  ON module_permission.permission_key = REPLACE(old_permission.permission_key, ':query', '')
 AND module_permission.parent_id = frontend_root.id
 AND module_permission.is_deleted = b'0'
SET old_permission.parent_id = module_permission.id,
    old_permission.type = 3,
    old_permission.menu_url = '',
    old_permission.menu_icon = '',
    old_permission.sort = 10,
    old_permission.name = CASE old_permission.permission_key
        WHEN 'frontend:home:query' THEN '查询首页'
        WHEN 'frontend:story:query' THEN '查询故事'
        WHEN 'frontend:message:query' THEN '查询留言'
        WHEN 'frontend:photo:query' THEN '查询相册'
        WHEN 'frontend:profile:query' THEN '查询我的'
        ELSE old_permission.name
    END
WHERE old_permission.permission_key IN (
    'frontend:home:query', 'frontend:story:query', 'frontend:message:query',
    'frontend:photo:query', 'frontend:profile:query'
)
  AND old_permission.parent_id = frontend_root.id
  AND old_permission.is_deleted = b'0';

-- 为每个前台模块补齐查询权限；脚本可重复执行。
INSERT INTO `permission`
    (`parent_id`, `name`, `type`, `menu_url`, `menu_icon`, `sort`, `permission_key`, `status`, `is_deleted`)
SELECT parent.id, s.name, 3, '', '', s.sort, s.permission_key, 0, b'0'
FROM (
    SELECT 'frontend:home' AS parent_key, '查询首页' AS name, 10 AS sort, 'frontend:home:query' AS permission_key
    UNION ALL
    SELECT 'frontend:story', '查询故事', 10, 'frontend:story:query'
    UNION ALL
    SELECT 'frontend:message', '查询留言', 10, 'frontend:message:query'
    UNION ALL
    SELECT 'frontend:photo', '查询相册', 10, 'frontend:photo:query'
    UNION ALL
    SELECT 'frontend:profile', '查询我的', 10, 'frontend:profile:query'
) s
JOIN `permission` parent
  ON parent.permission_key = s.parent_key
 AND parent.is_deleted = b'0'
WHERE NOT EXISTS (
    SELECT 1 FROM `permission` p WHERE p.permission_key = s.permission_key
);

INSERT INTO `permission`
    (`parent_id`, `name`, `type`, `menu_url`, `menu_icon`, `sort`, `permission_key`, `status`, `is_deleted`)
SELECT parent.id, s.name, 3, '', '', s.sort, s.permission_key, 0, b'0'
FROM (
    SELECT 'frontend:profile:query' AS parent_key, '编辑资料' AS name, 20 AS sort, 'frontend:profile:update' AS permission_key
    UNION ALL
    SELECT 'frontend:profile:query', '更换头像', 30, 'frontend:profile:avatar:update'
    UNION ALL
    SELECT 'frontend:profile:query', '密码管理', 40, 'frontend:profile:password:change'
) s
JOIN `permission` parent
  ON parent.permission_key = s.parent_key
 AND parent.is_deleted = b'0'
WHERE NOT EXISTS (
    SELECT 1 FROM `permission` p WHERE p.permission_key = s.permission_key
);

-- 留言操作权限；仅拥有 message_user 角色（或其他显式关联角色）的用户可使用。
INSERT INTO `permission`
    (`parent_id`, `name`, `type`, `menu_url`, `menu_icon`, `sort`, `permission_key`, `status`, `is_deleted`)
SELECT parent.id, s.name, 3, '', '', s.sort, s.permission_key, 0, b'0'
FROM (
    SELECT 'frontend:message:query' AS parent_key, '发布留言' AS name, 20 AS sort, 'frontend:message:publish' AS permission_key
    UNION ALL
    SELECT 'frontend:message:query', '回复留言', 30, 'frontend:message:reply'
) s
JOIN `permission` parent
  ON parent.permission_key = s.parent_key
 AND parent.is_deleted = b'0'
WHERE NOT EXISTS (
    SELECT 1 FROM `permission` p WHERE p.permission_key = s.permission_key
);

-- 后台菜单权限
INSERT INTO `permission`
    (`parent_id`, `name`, `type`, `menu_url`, `menu_icon`, `sort`, `permission_key`, `status`, `is_deleted`)
SELECT parent.id, s.name, 2, s.menu_url, s.menu_icon, s.sort, s.permission_key, 0, b'0'
FROM (
    SELECT 'admin' AS parent_key, '故事管理' AS name, '/admin/story' AS menu_url, 'Collection' AS menu_icon, 10 AS sort, 'admin:story:menu' AS permission_key
    UNION ALL
    SELECT 'admin', '留言板管理', '/admin/message', 'ChatDotRound', 20, 'admin:message:menu'
    UNION ALL
    SELECT 'admin', '相册管理', '/admin/photo', 'Picture', 30, 'admin:photo:menu'
    UNION ALL
    SELECT 'admin', '纪念日管理', '/admin/anniversary', 'Calendar', 40, 'admin:anniversary:menu'
    UNION ALL
    SELECT 'admin', '字典配置', '/admin/dict', 'CollectionTag', 50, 'admin:dict:menu'
     UNION ALL
     SELECT 'admin', '角色管理', '/admin/role', 'UserFilled', 60, 'admin:role:menu'
      UNION ALL
      SELECT 'admin', '权限管理', '/admin/permission', 'Lock', 70, 'admin:permission:menu'
) s
JOIN `permission` parent
  ON parent.permission_key = s.parent_key
 AND parent.is_deleted = b'0'
WHERE NOT EXISTS (
    SELECT 1 FROM `permission` p WHERE p.permission_key = s.permission_key
);

-- 各后台菜单的增删改查按钮权限
INSERT INTO `permission`
    (`parent_id`, `name`, `type`, `menu_url`, `menu_icon`, `sort`, `permission_key`, `status`, `is_deleted`)
SELECT parent.id, s.name, 3, '', '', s.sort, s.permission_key, 0, b'0'
FROM (
    SELECT 'admin:story:menu' AS parent_key, '查询故事' AS name, 10 AS sort, 'admin:story:query' AS permission_key
    UNION ALL SELECT 'admin:story:menu', '新增故事', 20, 'admin:story:create'
    UNION ALL SELECT 'admin:story:menu', '修改故事', 30, 'admin:story:update'
    UNION ALL SELECT 'admin:story:menu', '删除故事', 40, 'admin:story:delete'
    UNION ALL SELECT 'admin:message:menu', '查询留言', 10, 'admin:message:query'
    UNION ALL SELECT 'admin:message:menu', '新增留言', 20, 'admin:message:create'
    UNION ALL SELECT 'admin:message:menu', '修改留言', 30, 'admin:message:update'
    UNION ALL SELECT 'admin:message:menu', '删除留言', 40, 'admin:message:delete'
    UNION ALL SELECT 'admin:photo:menu', '查询相册', 10, 'admin:photo:query'
    UNION ALL SELECT 'admin:photo:menu', '新增相册', 20, 'admin:photo:create'
    UNION ALL SELECT 'admin:photo:menu', '修改相册', 30, 'admin:photo:update'
    UNION ALL SELECT 'admin:photo:menu', '删除相册', 40, 'admin:photo:delete'
    UNION ALL SELECT 'admin:anniversary:menu', '查询纪念日', 10, 'admin:anniversary:query'
    UNION ALL SELECT 'admin:anniversary:menu', '新增纪念日', 20, 'admin:anniversary:create'
    UNION ALL SELECT 'admin:anniversary:menu', '修改纪念日', 30, 'admin:anniversary:update'
    UNION ALL SELECT 'admin:anniversary:menu', '删除纪念日', 40, 'admin:anniversary:delete'
    UNION ALL SELECT 'admin:dict:menu', '查询字典', 10, 'admin:dict:query'
    UNION ALL SELECT 'admin:dict:menu', '新增字典', 20, 'admin:dict:create'
    UNION ALL SELECT 'admin:dict:menu', '修改字典', 30, 'admin:dict:update'
    UNION ALL SELECT 'admin:dict:menu', '删除字典', 40, 'admin:dict:delete'
     UNION ALL SELECT 'admin:role:menu', '查询角色', 10, 'admin:role:query'
     UNION ALL SELECT 'admin:role:menu', '新增角色', 20, 'admin:role:create'
     UNION ALL SELECT 'admin:role:menu', '修改角色', 30, 'admin:role:update'
     UNION ALL SELECT 'admin:role:menu', '删除角色', 40, 'admin:role:delete'
     UNION ALL SELECT 'admin:permission:menu', '查询权限', 10, 'admin:permission:query'
     UNION ALL SELECT 'admin:permission:menu', '新增权限', 20, 'admin:permission:create'
     UNION ALL SELECT 'admin:permission:menu', '修改权限', 30, 'admin:permission:update'
     UNION ALL SELECT 'admin:permission:menu', '删除权限', 40, 'admin:permission:delete'
) s
JOIN `permission` parent
  ON parent.permission_key = s.parent_key
 AND parent.is_deleted = b'0'
WHERE NOT EXISTS (
    SELECT 1 FROM `permission` p WHERE p.permission_key = s.permission_key
);

-- 层级迁移：旧角色只关联了模块下的操作权限时，补齐对应的模块权限。
-- 这样旧角色在权限树中的父节点状态与新的层级模型保持一致。
INSERT INTO `role_permission_rel` (`role_id`, `permission_id`, `is_deleted`)
SELECT DISTINCT rel.role_id, module_permission.id, b'0'
FROM `role_permission_rel` rel
JOIN `permission` child_permission
  ON child_permission.id = rel.permission_id
 AND child_permission.permission_key LIKE 'frontend:%:%'
 AND child_permission.is_deleted = b'0'
JOIN `permission` module_permission
 ON module_permission.permission_key = SUBSTRING_INDEX(child_permission.permission_key, ':', 2)
 AND module_permission.parent_id = (SELECT id FROM `permission` WHERE permission_key = 'frontend' LIMIT 1)
 AND module_permission.is_deleted = b'0'
WHERE rel.is_deleted = b'0'
  AND NOT EXISTS (
      SELECT 1
      FROM `role_permission_rel` existing_rel
      WHERE existing_rel.role_id = rel.role_id
        AND existing_rel.permission_id = module_permission.id
        AND existing_rel.is_deleted = b'0'
  );

-- 若之前存在同 permission_key 的禁用/逻辑删除数据，恢复为可用状态。
UPDATE `permission`
SET `status` = 0, `is_deleted` = b'0', `update_time` = CURRENT_TIMESTAMP
WHERE `permission_key` IN (
    'frontend', 'admin',
    'frontend:home', 'frontend:home:query', 'frontend:story', 'frontend:story:query',
    'frontend:message', 'frontend:message:query',
    'frontend:message:publish', 'frontend:message:reply',
    'frontend:photo', 'frontend:photo:query', 'frontend:profile', 'frontend:profile:query', 'frontend:profile:update',
    'frontend:profile:avatar:update', 'frontend:profile:password:change',
    'admin:story:menu', 'admin:story:query', 'admin:story:create', 'admin:story:update', 'admin:story:delete',
    'admin:message:menu', 'admin:message:query', 'admin:message:create', 'admin:message:update', 'admin:message:delete',
    'admin:photo:menu', 'admin:photo:query', 'admin:photo:create', 'admin:photo:update', 'admin:photo:delete',
    'admin:anniversary:menu', 'admin:anniversary:query', 'admin:anniversary:create', 'admin:anniversary:update', 'admin:anniversary:delete',
    'admin:dict:menu', 'admin:dict:query', 'admin:dict:create', 'admin:dict:update', 'admin:dict:delete',
     'admin:role:menu', 'admin:role:query', 'admin:role:create', 'admin:role:update', 'admin:role:delete',
     'admin:permission:menu', 'admin:permission:query', 'admin:permission:create', 'admin:permission:update', 'admin:permission:delete'
);

-- common：前台查询 + “我的”全部权限；不授予留言发布/回复权限，也不授予后台权限。
INSERT INTO `role_permission_rel` (`role_id`, `permission_id`, `is_deleted`)
SELECT DISTINCT r.id, p.id, b'0'
FROM `role` r
JOIN `permission` p
    ON p.permission_key = 'frontend'
  OR (
      p.permission_key LIKE 'frontend:%'
      AND p.permission_key NOT IN ('frontend:message:publish', 'frontend:message:reply')
  )
WHERE r.role_key = 'common'
  AND r.status = 0
  AND r.is_deleted = b'0'
  AND p.status = 0
  AND p.is_deleted = b'0'
  AND NOT EXISTS (
      SELECT 1
      FROM `role_permission_rel` rel
      WHERE rel.role_id = r.id
        AND rel.permission_id = p.id
        AND rel.is_deleted = b'0'
  );

-- message_user：前台目录、留言页查询，以及留言发布/回复权限。
INSERT INTO `role_permission_rel` (`role_id`, `permission_id`, `is_deleted`)
SELECT DISTINCT r.id, p.id, b'0'
FROM `role` r
JOIN `permission` p
  ON p.permission_key IN (
      'frontend',
      'frontend:message',
      'frontend:message:query',
      'frontend:message:publish',
      'frontend:message:reply'
  )
WHERE r.role_key = 'message_user'
  AND r.status = 0
  AND r.is_deleted = b'0'
  AND p.status = 0
  AND p.is_deleted = b'0'
  AND NOT EXISTS (
      SELECT 1
      FROM `role_permission_rel` rel
      WHERE rel.role_id = r.id
        AND rel.permission_id = p.id
        AND rel.is_deleted = b'0'
  );

-- admin：后台目录、五个管理菜单及全部 CRUD 权限。
INSERT INTO `role_permission_rel` (`role_id`, `permission_id`, `is_deleted`)
SELECT DISTINCT r.id, p.id, b'0'
FROM `role` r
JOIN `permission` p
  ON p.permission_key = 'admin'
  OR p.permission_key LIKE 'admin:%'
WHERE r.role_key = 'admin'
  AND r.status = 0
  AND r.is_deleted = b'0'
  AND p.status = 0
  AND p.is_deleted = b'0'
  AND NOT EXISTS (
      SELECT 1
      FROM `role_permission_rel` rel
      WHERE rel.role_id = r.id
        AND rel.permission_id = p.id
        AND rel.is_deleted = b'0'
  );

COMMIT;
