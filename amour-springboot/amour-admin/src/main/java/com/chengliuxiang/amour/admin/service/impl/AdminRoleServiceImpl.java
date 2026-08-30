package com.chengliuxiang.amour.admin.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.chengliuxiang.amour.admin.model.vo.role.*;
import com.chengliuxiang.amour.admin.service.AdminRoleService;
import com.chengliuxiang.amour.common.domain.dos.PermissionDO;
import com.chengliuxiang.amour.common.domain.dos.RoleDO;
import com.chengliuxiang.amour.common.domain.dos.RolePermissionRelDO;
import com.chengliuxiang.amour.common.domain.mapper.PermissionMapper;
import com.chengliuxiang.amour.common.domain.mapper.RoleMapper;
import com.chengliuxiang.amour.common.domain.mapper.RolePermissionRelMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class AdminRoleServiceImpl implements AdminRoleService {
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final List<String> SYSTEM_ROLE_KEYS = java.util.Arrays.asList("admin", "common", "message_user");

    @Resource private RoleMapper roleMapper;
    @Resource private PermissionMapper permissionMapper;
    @Resource private RolePermissionRelMapper relationMapper;

    @Override
    public Response<PageResult<RolePageRspVO>> findPage(RolePageReqVO reqVO) {
        long current = normalize(reqVO.getCurrent(), 1);
        long size = Math.min(normalize(reqVO.getSize(), 10), 100);
        IPage<RoleDO> page = roleMapper.selectRolePage(current, size, StrUtil.trim(reqVO.getKeyword()));
        List<RolePageRspVO> records = page.getRecords().stream().map(this::toResponse).collect(Collectors.toList());
        return Response.success(PageResult.<RolePageRspVO>builder().current(page.getCurrent()).size(page.getSize())
                .total(page.getTotal()).records(records).build());
    }

    @Override
    public Response<RolePageRspVO> findDetail(RoleIdReqVO reqVO) {
        RoleDO role = getRole(reqVO.getId());
        return Response.success(toResponse(role));
    }

    @Override
    public Response<List<PermissionRspVO>> findPermissions() {
        List<PermissionDO> permissions = permissionMapper.selectActiveList();
        Map<Long, List<PermissionDO>> children = permissions.stream().collect(Collectors.groupingBy(
                p -> p.getParentId() == null ? 0L : p.getParentId()));
        return Response.success(permissions.stream().filter(p -> p.getParentId() == null || p.getParentId() == 0)
                .map(p -> toPermission(p, children)).collect(Collectors.toList()));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Void> save(RoleSaveReqVO reqVO) {
        String key = reqVO.getRoleKey().trim();
        if (!key.matches("[A-Za-z][A-Za-z0-9:_-]{1,31}")) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        RoleDO duplicate = roleMapper.selectByRoleKey(key, reqVO.getId());
        if (duplicate != null && !Boolean.TRUE.equals(duplicate.getIsDeleted())) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        RoleDO role = reqVO.getId() == null ? RoleDO.builder().createTime(LocalDateTime.now()).build() : getRole(reqVO.getId());
        if (reqVO.getId() != null && SYSTEM_ROLE_KEYS.contains(role.getRoleKey()) && !role.getRoleKey().equals(key)) {
            throw new BizException(ResponseCodeEnum.FORBIDDEN);
        }
        role.setRoleName(reqVO.getRoleName().trim());
        role.setRoleKey(key);
        role.setStatus(reqVO.getStatus());
        role.setSort(reqVO.getSort() == null ? 0 : Math.max(reqVO.getSort(), 0));
        role.setRemark(StrUtil.nullToEmpty(reqVO.getRemark()).trim());
        role.setIsDeleted(false);
        role.setUpdateTime(LocalDateTime.now());
        if (role.getId() == null) roleMapper.insert(role); else roleMapper.updateById(role);
        relationMapper.deleteByRoleId(role.getId());
        if (reqVO.getPermissionIds() != null && !reqVO.getPermissionIds().isEmpty()) {
            List<PermissionDO> valid = permissionMapper.selectBatchIds(reqVO.getPermissionIds());
            for (PermissionDO permission : valid) {
                if (!Objects.equals(permission.getStatus(), 0) || Boolean.TRUE.equals(permission.getIsDeleted())) continue;
                RolePermissionRelDO rel = new RolePermissionRelDO();
                rel.setRoleId(role.getId()); rel.setPermissionId(permission.getId());
                rel.setCreateTime(LocalDateTime.now()); rel.setUpdateTime(LocalDateTime.now()); rel.setIsDeleted(false);
                relationMapper.insert(rel);
            }
        }
        return Response.success();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Void> delete(RoleIdReqVO reqVO) {
        RoleDO role = getRole(reqVO.getId());
        if (SYSTEM_ROLE_KEYS.contains(role.getRoleKey()) || relationMapper.countUsers(role.getId()) > 0) {
            throw new BizException(ResponseCodeEnum.FORBIDDEN);
        }
        role.setIsDeleted(true); role.setUpdateTime(LocalDateTime.now()); roleMapper.updateById(role);
        relationMapper.deleteByRoleId(role.getId());
        return Response.success();
    }

    private RolePageRspVO toResponse(RoleDO role) {
        return RolePageRspVO.builder().id(role.getId()).roleName(role.getRoleName()).roleKey(role.getRoleKey())
                .status(role.getStatus()).sort(role.getSort()).remark(role.getRemark())
                .createTime(format(role.getCreateTime())).updateTime(format(role.getUpdateTime()))
                .permissionIds(relationMapper.selectPermissionIds(role.getId())).build();
    }

    private PermissionRspVO toPermission(PermissionDO permission, Map<Long, List<PermissionDO>> children) {
        List<PermissionRspVO> childResponses = children.getOrDefault(permission.getId(), Collections.emptyList()).stream()
                .map(child -> toPermission(child, children)).collect(Collectors.toList());
        return PermissionRspVO.builder().id(permission.getId()).parentId(permission.getParentId()).name(permission.getName())
                .type(permission.getType()).permissionKey(permission.getPermissionKey()).children(childResponses).build();
    }

    private RoleDO getRole(Long id) {
        RoleDO role = roleMapper.selectActiveById(id);
        if (role == null) throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        return role;
    }

    private long normalize(Long value, long fallback) { return value == null || value < 1 ? fallback : value; }
    private String format(LocalDateTime value) { return value == null ? "" : FORMATTER.format(value); }
}
