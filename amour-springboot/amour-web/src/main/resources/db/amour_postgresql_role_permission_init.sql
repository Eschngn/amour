-- PostgreSQL role and permission initialization. Safe to run repeatedly.

INSERT INTO role (role_name, role_key, status, sort, remark, is_deleted)
VALUES ('普通用户', 'common', 0, 2, '普通用户角色', FALSE),
       ('管理员', 'admin', 0, 1, '后台系统管理员', FALSE),
       ('留言用户', 'message_user', 0, 3, '可发布和回复留言', FALSE)
ON CONFLICT (role_key) DO UPDATE
SET status = 0,
    is_deleted = FALSE,
    update_time = CURRENT_TIMESTAMP;

WITH permission_seed(parent_key, name, type, menu_url, menu_icon, sort, permission_key) AS (
    VALUES
        (NULL, '前台', 1, '', 'House', 10, 'frontend'),
        (NULL, '后台', 1, '', 'Setting', 20, 'admin'),
        ('frontend', '首页', 2, '/', 'House', 10, 'frontend:home'),
        ('frontend', '故事', 2, '/story', 'Collection', 20, 'frontend:story'),
        ('frontend', '留言', 2, '/message', 'ChatDotRound', 30, 'frontend:message'),
        ('frontend', '相册', 2, '/photo', 'Picture', 40, 'frontend:photo'),
        ('frontend', '我的', 2, '/profile', 'User', 50, 'frontend:profile'),
        ('frontend:home', '查询首页', 3, '', '', 10, 'frontend:home:query'),
        ('frontend:story', '查询故事', 3, '', '', 10, 'frontend:story:query'),
        ('frontend:message', '查询留言', 3, '', '', 10, 'frontend:message:query'),
        ('frontend:photo', '查询相册', 3, '', '', 10, 'frontend:photo:query'),
        ('frontend:profile', '查询我的', 3, '', '', 10, 'frontend:profile:query'),
        ('frontend:profile:query', '编辑资料', 3, '', '', 20, 'frontend:profile:update'),
        ('frontend:profile:query', '更换头像', 3, '', '', 30, 'frontend:profile:avatar:update'),
        ('frontend:profile:query', '密码管理', 3, '', '', 40, 'frontend:profile:password:change'),
        ('frontend:message:query', '发布留言', 3, '', '', 20, 'frontend:message:publish'),
        ('frontend:message:query', '回复留言', 3, '', '', 30, 'frontend:message:reply'),
        ('admin', '故事管理', 2, '/admin/story', 'Collection', 10, 'admin:story:menu'),
        ('admin', '留言板管理', 2, '/admin/message', 'ChatDotRound', 20, 'admin:message:menu'),
        ('admin', '相册管理', 2, '/admin/photo', 'Picture', 30, 'admin:photo:menu'),
        ('admin', '纪念日管理', 2, '/admin/anniversary', 'Calendar', 40, 'admin:anniversary:menu'),
        ('admin', '字典配置', 2, '/admin/dict', 'CollectionTag', 50, 'admin:dict:menu'),
        ('admin', '角色管理', 2, '/admin/role', 'UserFilled', 60, 'admin:role:menu'),
        ('admin', '权限管理', 2, '/admin/permission', 'Lock', 70, 'admin:permission:menu'),
        ('admin', '用户管理', 2, '/admin/user', 'User', 80, 'admin:user:menu'),
        ('admin:story:menu', '查询故事', 3, '', '', 10, 'admin:story:query'),
        ('admin:story:menu', '新增故事', 3, '', '', 20, 'admin:story:create'),
        ('admin:story:menu', '修改故事', 3, '', '', 30, 'admin:story:update'),
        ('admin:story:menu', '删除故事', 3, '', '', 40, 'admin:story:delete'),
        ('admin:message:menu', '查询留言', 3, '', '', 10, 'admin:message:query'),
        ('admin:message:menu', '新增留言', 3, '', '', 20, 'admin:message:create'),
        ('admin:message:menu', '修改留言', 3, '', '', 30, 'admin:message:update'),
        ('admin:message:menu', '删除留言', 3, '', '', 40, 'admin:message:delete'),
        ('admin:photo:menu', '查询相册', 3, '', '', 10, 'admin:photo:query'),
        ('admin:photo:menu', '新增相册', 3, '', '', 20, 'admin:photo:create'),
        ('admin:photo:menu', '修改相册', 3, '', '', 30, 'admin:photo:update'),
        ('admin:photo:menu', '删除相册', 3, '', '', 40, 'admin:photo:delete'),
        ('admin:anniversary:menu', '查询纪念日', 3, '', '', 10, 'admin:anniversary:query'),
        ('admin:anniversary:menu', '新增纪念日', 3, '', '', 20, 'admin:anniversary:create'),
        ('admin:anniversary:menu', '修改纪念日', 3, '', '', 30, 'admin:anniversary:update'),
        ('admin:anniversary:menu', '删除纪念日', 3, '', '', 40, 'admin:anniversary:delete'),
        ('admin:dict:menu', '查询字典', 3, '', '', 10, 'admin:dict:query'),
        ('admin:dict:menu', '新增字典', 3, '', '', 20, 'admin:dict:create'),
        ('admin:dict:menu', '修改字典', 3, '', '', 30, 'admin:dict:update'),
        ('admin:dict:menu', '删除字典', 3, '', '', 40, 'admin:dict:delete'),
        ('admin:role:menu', '查询角色', 3, '', '', 10, 'admin:role:query'),
        ('admin:role:menu', '新增角色', 3, '', '', 20, 'admin:role:create'),
        ('admin:role:menu', '修改角色', 3, '', '', 30, 'admin:role:update'),
        ('admin:role:menu', '删除角色', 3, '', '', 40, 'admin:role:delete'),
        ('admin:permission:menu', '查询权限', 3, '', '', 10, 'admin:permission:query'),
        ('admin:permission:menu', '新增权限', 3, '', '', 20, 'admin:permission:create'),
        ('admin:permission:menu', '修改权限', 3, '', '', 30, 'admin:permission:update'),
        ('admin:permission:menu', '删除权限', 3, '', '', 40, 'admin:permission:delete'),
        ('admin:user:menu', '查询用户', 3, '', '', 10, 'admin:user:query'),
        ('admin:user:menu', '新增用户', 3, '', '', 20, 'admin:user:create'),
        ('admin:user:menu', '修改用户', 3, '', '', 30, 'admin:user:update'),
        ('admin:user:menu', '停用用户', 3, '', '', 40, 'admin:user:delete')
), resolved AS (
    SELECT COALESCE(parent.id, '0') AS parent_id,
           seed.name, seed.type, seed.menu_url, seed.menu_icon, seed.sort, seed.permission_key
    FROM permission_seed seed
    LEFT JOIN permission parent ON parent.permission_key = seed.parent_key AND parent.is_deleted = FALSE
)
INSERT INTO permission (parent_id, name, type, menu_url, menu_icon, sort, permission_key, status, is_deleted)
SELECT resolved.parent_id, resolved.name, resolved.type, resolved.menu_url, resolved.menu_icon,
       resolved.sort, resolved.permission_key, 0, FALSE
FROM resolved
WHERE NOT EXISTS (
    SELECT 1 FROM permission current_permission
    WHERE current_permission.permission_key = resolved.permission_key
);

UPDATE permission child
SET parent_id = parent.id
FROM permission parent
WHERE child.permission_key LIKE '%:%'
  AND parent.permission_key = regexp_replace(child.permission_key, ':[^:]+$', '')
  AND child.is_deleted = FALSE
  AND parent.is_deleted = FALSE;

UPDATE permission child
SET parent_id = parent.id
FROM permission parent
JOIN (VALUES
    ('frontend:home', 'frontend'),
    ('frontend:story', 'frontend'),
    ('frontend:message', 'frontend'),
    ('frontend:photo', 'frontend'),
    ('frontend:profile', 'frontend'),
    ('frontend:home:query', 'frontend:home'),
    ('frontend:story:query', 'frontend:story'),
    ('frontend:message:query', 'frontend:message'),
    ('frontend:photo:query', 'frontend:photo'),
    ('frontend:profile:query', 'frontend:profile'),
    ('frontend:profile:update', 'frontend:profile:query'),
    ('frontend:profile:avatar:update', 'frontend:profile:query'),
    ('frontend:profile:password:change', 'frontend:profile:query'),
    ('frontend:message:publish', 'frontend:message:query'),
    ('frontend:message:reply', 'frontend:message:query'),
    ('admin:story:menu', 'admin'),
    ('admin:message:menu', 'admin'),
    ('admin:photo:menu', 'admin'),
    ('admin:anniversary:menu', 'admin'),
    ('admin:dict:menu', 'admin'),
    ('admin:role:menu', 'admin'),
    ('admin:permission:menu', 'admin'),
    ('admin:user:menu', 'admin'),
    ('admin:story:query', 'admin:story:menu'),
    ('admin:story:create', 'admin:story:menu'),
    ('admin:story:update', 'admin:story:menu'),
    ('admin:story:delete', 'admin:story:menu'),
    ('admin:message:query', 'admin:message:menu'),
    ('admin:message:create', 'admin:message:menu'),
    ('admin:message:update', 'admin:message:menu'),
    ('admin:message:delete', 'admin:message:menu'),
    ('admin:photo:query', 'admin:photo:menu'),
    ('admin:photo:create', 'admin:photo:menu'),
    ('admin:photo:update', 'admin:photo:menu'),
    ('admin:photo:delete', 'admin:photo:menu'),
    ('admin:anniversary:query', 'admin:anniversary:menu'),
    ('admin:anniversary:create', 'admin:anniversary:menu'),
    ('admin:anniversary:update', 'admin:anniversary:menu'),
    ('admin:anniversary:delete', 'admin:anniversary:menu'),
    ('admin:dict:query', 'admin:dict:menu'),
    ('admin:dict:create', 'admin:dict:menu'),
    ('admin:dict:update', 'admin:dict:menu'),
    ('admin:dict:delete', 'admin:dict:menu'),
    ('admin:role:query', 'admin:role:menu'),
    ('admin:role:create', 'admin:role:menu'),
    ('admin:role:update', 'admin:role:menu'),
    ('admin:role:delete', 'admin:role:menu'),
    ('admin:permission:query', 'admin:permission:menu'),
    ('admin:permission:create', 'admin:permission:menu'),
    ('admin:permission:update', 'admin:permission:menu'),
    ('admin:permission:delete', 'admin:permission:menu'),
    ('admin:user:query', 'admin:user:menu'),
    ('admin:user:create', 'admin:user:menu'),
    ('admin:user:update', 'admin:user:menu'),
    ('admin:user:delete', 'admin:user:menu')
) AS mapping(child_key, parent_key) ON mapping.parent_key = parent.permission_key
WHERE child.permission_key = mapping.child_key
  AND child.is_deleted = FALSE
  AND parent.is_deleted = FALSE;

INSERT INTO role_permission_rel (role_id, permission_id, is_deleted)
SELECT DISTINCT r.id, p.id, FALSE
FROM role r
JOIN permission p ON p.permission_key = 'frontend'
    OR (p.permission_key LIKE 'frontend:%'
        AND p.permission_key NOT IN ('frontend:message:publish', 'frontend:message:reply'))
WHERE r.role_key = 'common' AND r.status = 0 AND r.is_deleted = FALSE AND p.status = 0 AND p.is_deleted = FALSE
  AND NOT EXISTS (
      SELECT 1 FROM role_permission_rel rel
      WHERE rel.role_id = r.id AND rel.permission_id = p.id AND rel.is_deleted = FALSE
  );

INSERT INTO role_permission_rel (role_id, permission_id, is_deleted)
SELECT DISTINCT r.id, p.id, FALSE
FROM role r
JOIN permission p ON p.permission_key IN (
    'frontend', 'frontend:message', 'frontend:message:query',
    'frontend:message:publish', 'frontend:message:reply'
)
WHERE r.role_key = 'message_user' AND r.status = 0 AND r.is_deleted = FALSE AND p.status = 0 AND p.is_deleted = FALSE
  AND NOT EXISTS (
      SELECT 1 FROM role_permission_rel rel
      WHERE rel.role_id = r.id AND rel.permission_id = p.id AND rel.is_deleted = FALSE
  );

INSERT INTO role_permission_rel (role_id, permission_id, is_deleted)
SELECT DISTINCT r.id, p.id, FALSE
FROM role r
JOIN permission p ON p.permission_key = 'admin' OR p.permission_key LIKE 'admin:%'
WHERE r.role_key = 'admin' AND r.status = 0 AND r.is_deleted = FALSE AND p.status = 0 AND p.is_deleted = FALSE
  AND NOT EXISTS (
      SELECT 1 FROM role_permission_rel rel
      WHERE rel.role_id = r.id AND rel.permission_id = p.id AND rel.is_deleted = FALSE
  );
