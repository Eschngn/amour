package com.chengliuxiang.amour.admin.service.impl;

import cn.hutool.core.util.StrUtil;
import cn.dev33.satoken.stp.StpUtil;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.chengliuxiang.amour.admin.model.vo.user.*;
import com.chengliuxiang.amour.admin.service.AdminUserService;
import com.chengliuxiang.amour.common.domain.dos.RoleDO;
import com.chengliuxiang.amour.common.domain.dos.UserDO;
import com.chengliuxiang.amour.common.domain.mapper.RoleMapper;
import com.chengliuxiang.amour.common.domain.mapper.UserMapper;
import com.chengliuxiang.amour.common.domain.mapper.UserRoleRelMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class AdminUserServiceImpl implements AdminUserService {
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    @Resource private UserMapper userMapper;
    @Resource private RoleMapper roleMapper;
    @Resource private UserRoleRelMapper relationMapper;
    @Resource private PasswordEncoder passwordEncoder;

    @Override
    public Response<PageResult<UserPageRspVO>> findPage(UserPageReqVO reqVO) {
        long current = reqVO.getCurrent() == null || reqVO.getCurrent() < 1 ? 1 : reqVO.getCurrent();
        long size = reqVO.getSize() == null || reqVO.getSize() < 1 ? 10 : Math.min(reqVO.getSize(), 100);
        IPage<UserDO> page = userMapper.selectAdminPage(current, size, StrUtil.trim(reqVO.getKeyword()), reqVO.getStatus());
        List<UserPageRspVO> records = page.getRecords().stream().map(this::toResponse).collect(Collectors.toList());
        return Response.success(PageResult.<UserPageRspVO>builder().current(page.getCurrent()).size(page.getSize()).total(page.getTotal()).records(records).build());
    }

    @Override
    public Response<List<RoleOptionRspVO>> findRoles() {
        return Response.success(roleMapper.selectActiveList().stream().filter(r -> Objects.equals(r.getStatus(), 0))
                .map(r -> RoleOptionRspVO.builder().id(r.getId()).roleName(r.getRoleName()).roleKey(r.getRoleKey()).build()).collect(Collectors.toList()));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Void> save(UserSaveReqVO reqVO) {
        String username = StrUtil.trim(reqVO.getUsername());
        UserDO duplicate = userMapper.selectAnyByUsername(username);
        if (duplicate != null && !Objects.equals(duplicate.getId(), reqVO.getId())) {
            throw new BizException(ResponseCodeEnum.USERNAME_ALREADY_EXISTS);
        }
        if (reqVO.getStatus() != 0 && reqVO.getId() != null && "admin".equals(username)) {
            throw new BizException(ResponseCodeEnum.FORBIDDEN);
        }
        UserDO user = reqVO.getId() == null ? UserDO.builder().createTime(LocalDateTime.now()).build() : userMapper.selectAdminById(reqVO.getId());
        if (user == null) throw new BizException(ResponseCodeEnum.USER_NOT_EXIST);
        user.setUsername(username); user.setDisplayName(StrUtil.trim(reqVO.getDisplayName())); user.setAvatar(StrUtil.nullToEmpty(reqVO.getAvatar()).trim());
        if (StrUtil.isNotBlank(reqVO.getPassword())) {
            if (reqVO.getPassword().length() < 6 || reqVO.getPassword().length() > 64) throw new BizException(ResponseCodeEnum.NEW_PASSWORD_FORMAT_INVALID);
            user.setPassword(passwordEncoder.encode(reqVO.getPassword()));
        }
        user.setIsDeleted(reqVO.getStatus() != 0); user.setUpdateTime(LocalDateTime.now()); userMapper.save(user);
        relationMapper.deleteByUserId(user.getId());
        if (reqVO.getRoleIds() != null) {
            List<RoleDO> roles = roleMapper.selectBatchIds(reqVO.getRoleIds());
            for (RoleDO role : roles) if (Objects.equals(role.getStatus(), 0) && !Boolean.TRUE.equals(role.getIsDeleted())) {
                relationMapper.insertRelation(user.getId(), role.getId());
            }
        }
        return Response.success();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Void> delete(UserIdReqVO reqVO) {
        UserDO user = userMapper.selectActiveById(reqVO.getId());
        if (user == null) throw new BizException(ResponseCodeEnum.USER_NOT_EXIST);
        user.setIsDeleted(true); user.setUpdateTime(LocalDateTime.now()); userMapper.updateById(user); relationMapper.deleteByUserId(user.getId());
        StpUtil.logout(user.getId());
        return Response.success();
    }

    private UserPageRspVO toResponse(UserDO user) {
        List<Long> roleIds = relationMapper.selectRoleIds(user.getId());
        List<RoleDO> roles = roleIds == null || roleIds.isEmpty() ? Collections.emptyList() : roleMapper.selectBatchIds(roleIds);
        return UserPageRspVO.builder().id(user.getId()).username(user.getUsername()).displayName(user.getDisplayName()).avatar(user.getAvatar())
                .status(!Boolean.TRUE.equals(user.getIsDeleted())).wechatOpenid(user.getWechatOpenid()).createTime(format(user.getCreateTime()))
                .updateTime(format(user.getUpdateTime())).roleIds(roleIds).roleNames(roles.stream().map(RoleDO::getRoleName).collect(Collectors.toList())).build();
    }
    private String format(LocalDateTime time) { return time == null ? "" : FORMATTER.format(time); }
}
