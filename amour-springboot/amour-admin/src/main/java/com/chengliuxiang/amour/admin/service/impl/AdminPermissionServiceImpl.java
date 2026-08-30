package com.chengliuxiang.amour.admin.service.impl;

import cn.hutool.core.util.StrUtil;
import com.chengliuxiang.amour.admin.model.vo.permission.PermissionIdReqVO;
import com.chengliuxiang.amour.admin.model.vo.permission.PermissionPageRspVO;
import com.chengliuxiang.amour.admin.model.vo.permission.PermissionSaveReqVO;
import com.chengliuxiang.amour.admin.service.AdminPermissionService;
import com.chengliuxiang.amour.common.domain.dos.PermissionDO;
import com.chengliuxiang.amour.common.domain.mapper.PermissionMapper;
import com.chengliuxiang.amour.common.domain.mapper.RolePermissionRelMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.utils.Response;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.HashSet;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AdminPermissionServiceImpl implements AdminPermissionService {
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final List<Integer> TYPES = java.util.Arrays.asList(1, 2, 3);
    private static final List<String> SYSTEM_KEYS = java.util.Arrays.asList("frontend", "admin");

    @Resource private PermissionMapper permissionMapper;
    @Resource private RolePermissionRelMapper relationMapper;

    @Override
    public Response<List<PermissionPageRspVO>> findTree() {
        List<PermissionDO> permissions = permissionMapper.selectList(new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<PermissionDO>()
                .eq(PermissionDO::getIsDeleted, false).orderByAsc(PermissionDO::getSort).orderByAsc(PermissionDO::getId));
        Map<Long, List<PermissionDO>> children = permissions.stream().collect(Collectors.groupingBy(p -> p.getParentId() == null ? 0L : p.getParentId()));
        return Response.success(permissions.stream().filter(p -> p.getParentId() == null || p.getParentId() == 0)
                .map(p -> toResponse(p, children)).collect(Collectors.toList()));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Void> save(PermissionSaveReqVO reqVO) {
        if (!TYPES.contains(reqVO.getType())) throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        String key = StrUtil.trim(reqVO.getPermissionKey());
        if (!key.matches("[A-Za-z][A-Za-z0-9:_-]{1,63}")) throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        PermissionDO current = reqVO.getId() == null ? null : permissionMapper.selectActiveById(reqVO.getId());
        if (reqVO.getId() != null && current == null) throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        if (current != null && SYSTEM_KEYS.contains(current.getPermissionKey()) && !Objects.equals(current.getPermissionKey(), key)) throw new BizException(ResponseCodeEnum.FORBIDDEN);
        PermissionDO duplicate = permissionMapper.selectByKey(key, reqVO.getId());
        if (duplicate != null && !Boolean.TRUE.equals(duplicate.getIsDeleted())) throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        Long parentId = reqVO.getParentId() == null ? 0L : reqVO.getParentId();
        if (parentId > 0) {
            PermissionDO parent = permissionMapper.selectActiveById(parentId);
            if (parent == null || parent.getType() >= reqVO.getType()) throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
            if (Objects.equals(parentId, reqVO.getId()) || isDescendantOf(parentId, reqVO.getId())) throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        } else if (reqVO.getType() != 1) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        PermissionDO permission = current == null ? PermissionDO.builder().createTime(LocalDateTime.now()).build() : current;
        permission.setParentId(parentId); permission.setName(StrUtil.trim(reqVO.getName())); permission.setType(reqVO.getType());
        permission.setMenuUrl(StrUtil.nullToEmpty(reqVO.getMenuUrl()).trim()); permission.setMenuIcon(StrUtil.nullToEmpty(reqVO.getMenuIcon()).trim());
        permission.setSort(reqVO.getSort() == null ? 0 : Math.max(0, reqVO.getSort())); permission.setPermissionKey(key);
        permission.setStatus(reqVO.getStatus()); permission.setIsDeleted(false); permission.setUpdateTime(LocalDateTime.now());
        if (permission.getId() == null) permissionMapper.insert(permission); else permissionMapper.updateById(permission);
        return Response.success();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Void> delete(PermissionIdReqVO reqVO) {
        PermissionDO permission = permissionMapper.selectActiveById(reqVO.getId());
        if (permission == null || SYSTEM_KEYS.contains(permission.getPermissionKey()) || permissionMapper.countChildren(permission.getId()) > 0 || relationMapper.countRoles(permission.getId()) > 0) {
            throw new BizException(ResponseCodeEnum.FORBIDDEN);
        }
        permission.setIsDeleted(true); permission.setUpdateTime(LocalDateTime.now()); permissionMapper.updateById(permission);
        return Response.success();
    }

    private PermissionPageRspVO toResponse(PermissionDO p, Map<Long, List<PermissionDO>> children) {
        List<PermissionDO> childList = children.getOrDefault(p.getId(), Collections.emptyList());
        return PermissionPageRspVO.builder().id(p.getId()).parentId(p.getParentId()).name(p.getName()).type(p.getType())
                .menuUrl(p.getMenuUrl()).menuIcon(p.getMenuIcon()).sort(p.getSort()).permissionKey(p.getPermissionKey())
                .status(p.getStatus()).createTime(format(p.getCreateTime())).updateTime(format(p.getUpdateTime()))
                .roleCount(relationMapper.countRoles(p.getId())).children(childList.stream().map(c -> toResponse(c, children)).collect(Collectors.toList())).build();
    }

    private boolean isDescendantOf(Long candidateParentId, Long permissionId) {
        if (permissionId == null) return false;
        Set<Long> visited = new HashSet<>();
        Long current = candidateParentId;
        while (current != null && current > 0 && visited.add(current)) {
            if (Objects.equals(current, permissionId)) return true;
            PermissionDO node = permissionMapper.selectActiveById(current);
            current = node == null ? null : node.getParentId();
        }
        return false;
    }

    private String format(LocalDateTime value) { return value == null ? "" : FORMATTER.format(value); }
}
