package com.chengliuxiang.amour.admin.service.impl;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.chengliuxiang.amour.admin.model.vo.user.UserIdReqVO;
import com.chengliuxiang.amour.admin.model.vo.user.UserPageReqVO;
import com.chengliuxiang.amour.admin.model.vo.user.UserPageRspVO;
import com.chengliuxiang.amour.admin.model.vo.user.UserSaveReqVO;
import com.chengliuxiang.amour.admin.service.AdminUserService;
import com.chengliuxiang.amour.common.domain.dos.UserDO;
import com.chengliuxiang.amour.common.domain.mapper.UserMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.AmourIdUtil;
import com.chengliuxiang.amour.common.utils.Response;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AdminUserServiceImpl implements AdminUserService {
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final int AMOUR_ID_MAX_RETRIES = 5;
    private static final int PASSWORD_MIN_LENGTH = 6;
    private static final int PASSWORD_MAX_LENGTH = 64;

    @Resource private UserMapper userMapper;
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
    @Transactional(rollbackFor = Exception.class)
    public Response<Void> save(UserSaveReqVO reqVO) {
        String username = StrUtil.trim(reqVO.getUsername());
        UserDO duplicate = userMapper.selectAnyByUsername(username);
        if (duplicate != null && !duplicate.getId().equals(reqVO.getId())) {
            throw new BizException(ResponseCodeEnum.USERNAME_ALREADY_EXISTS);
        }
        if (reqVO.getId() == null) {
            createUser(reqVO, username);
            return Response.success();
        }

        UserDO user = userMapper.selectAdminById(reqVO.getId());
        if (user == null) throw new BizException(ResponseCodeEnum.USER_NOT_EXIST);
        user.setUsername(username);
        user.setDisplayName(StrUtil.trim(reqVO.getDisplayName()));
        user.setAvatar(StrUtil.nullToEmpty(reqVO.getAvatar()).trim());
        user.setIsPlatformAdmin(Boolean.TRUE.equals(reqVO.getPlatformAdmin()));
        if (StrUtil.isNotBlank(reqVO.getPassword())) {
            validatePassword(reqVO.getPassword());
            user.setPassword(passwordEncoder.encode(reqVO.getPassword()));
        }
        user.setIsDeleted(reqVO.getStatus() != 0);
        user.setUpdateTime(LocalDateTime.now());
        try {
            userMapper.save(user);
        } catch (DataIntegrityViolationException e) {
            throw new BizException(ResponseCodeEnum.USERNAME_ALREADY_EXISTS);
        }
        if (Boolean.TRUE.equals(user.getIsDeleted())) {
            StpUtil.logout(user.getId());
        }
        return Response.success();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Void> delete(UserIdReqVO reqVO) {
        UserDO user = userMapper.selectActiveById(reqVO.getId());
        if (user == null) throw new BizException(ResponseCodeEnum.USER_NOT_EXIST);
        user.setIsDeleted(true);
        user.setUpdateTime(LocalDateTime.now());
        userMapper.updateById(user);
        StpUtil.logout(user.getId());
        return Response.success();
    }

    /**
     * 创建用户，恋语 ID 冲突时重新生成并重试。
     */
    private void createUser(UserSaveReqVO reqVO, String username) {
        if (StrUtil.isBlank(reqVO.getPassword())) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        validatePassword(reqVO.getPassword());
        for (int attempt = 0; attempt < AMOUR_ID_MAX_RETRIES; attempt++) {
            String amourId = AmourIdUtil.generate();
            if (userMapper.selectByAmourId(amourId) != null) {
                continue;
            }
            UserDO user = UserDO.builder()
                    .amourId(amourId)
                    .username(username)
                    .password(passwordEncoder.encode(reqVO.getPassword()))
                    .displayName(StrUtil.trim(reqVO.getDisplayName()))
                    .avatar(StrUtil.nullToEmpty(reqVO.getAvatar()).trim())
                    .createTime(LocalDateTime.now())
                    .updateTime(LocalDateTime.now())
                    .isDeleted(reqVO.getStatus() != 0)
                    .isPlatformAdmin(Boolean.TRUE.equals(reqVO.getPlatformAdmin()))
                    .build();
            try {
                userMapper.insert(user);
                return;
            } catch (DataIntegrityViolationException e) {
                if (userMapper.selectAnyByUsername(username) != null) {
                    throw new BizException(ResponseCodeEnum.USERNAME_ALREADY_EXISTS);
                }
            }
        }
        throw new BizException(ResponseCodeEnum.SYSTEM_ERROR);
    }

    private void validatePassword(String password) {
        if (password.length() < PASSWORD_MIN_LENGTH || password.length() > PASSWORD_MAX_LENGTH) {
            throw new BizException(ResponseCodeEnum.NEW_PASSWORD_FORMAT_INVALID);
        }
    }

    private UserPageRspVO toResponse(UserDO user) {
        return UserPageRspVO.builder()
                .id(user.getId())
                .amourId(user.getAmourId())
                .username(user.getUsername())
                .displayName(user.getDisplayName())
                .avatar(user.getAvatar())
                .status(!Boolean.TRUE.equals(user.getIsDeleted()))
                .platformAdmin(Boolean.TRUE.equals(user.getIsPlatformAdmin()))
                .createTime(format(user.getCreateTime()))
                .updateTime(format(user.getUpdateTime()))
                .build();
    }

    private String format(LocalDateTime time) { return time == null ? "" : FORMATTER.format(time); }
}
