package com.chengliuxiang.amour.web.service.impl;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.util.StrUtil;
import com.chengliuxiang.amour.admin.utils.AliyunOSSUtil;
import com.chengliuxiang.amour.common.domain.dos.UserDO;
import com.chengliuxiang.amour.common.domain.mapper.UserMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.service.LoginCryptoService;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.user.ChangePasswordReqVO;
import com.chengliuxiang.amour.web.model.vo.user.UpdateUserProfileReqVO;
import com.chengliuxiang.amour.web.model.vo.user.UserProfileVO;
import com.chengliuxiang.amour.web.service.UserProfileService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import com.chengliuxiang.amour.common.service.SaTokenPermissionService;

@Service
@Slf4j
public class UserProfileServiceImpl implements UserProfileService {

    private static final long USERNAME_CHANGE_COOLDOWN_DAYS = 30L;
    private static final long MAX_AVATAR_SIZE = 5L * 1024 * 1024;
    private static final Set<String> ALLOWED_IMAGE_TYPES = new HashSet<>(Arrays.asList(
            "image/jpeg", "image/png", "image/webp", "image/gif"));
    private static final Set<String> ALLOWED_IMAGE_SUFFIXES = new HashSet<>(Arrays.asList(
            ".jpg", ".jpeg", ".png", ".webp", ".gif"));

    @Resource
    private UserMapper userMapper;
    @Resource
    private PasswordEncoder passwordEncoder;
    @Resource
    private LoginCryptoService loginCryptoService;
    @Resource
    private AliyunOSSUtil aliyunOSSUtil;
    @Resource
    private SaTokenPermissionService saTokenPermissionService;

    @Override
    public Response<UserProfileVO> getProfile() {
        return Response.success(toProfile(getCurrentUser()));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<UserProfileVO> updateProfile(UpdateUserProfileReqVO reqVO) {
        UserDO user = getCurrentUser();
        String username = reqVO.getUsername().trim();
        String displayName = reqVO.getDisplayName().trim();
        boolean usernameChanged = !username.equals(user.getUsername());
        if (usernameChanged) {
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime availableAt = user.getUsernameUpdateTime() == null
                    ? null : user.getUsernameUpdateTime().plusDays(USERNAME_CHANGE_COOLDOWN_DAYS);
            if (availableAt != null && now.isBefore(availableAt)) {
                throw new BizException(ResponseCodeEnum.USERNAME_CHANGE_TOO_FREQUENT);
            }
            UserDO sameUsernameUser = userMapper.selectByUsername(username);
            if (sameUsernameUser != null && !sameUsernameUser.getId().equals(user.getId())) {
                throw new BizException(ResponseCodeEnum.USERNAME_ALREADY_EXISTS);
            }
            user.setUsername(username);
            user.setUsernameUpdateTime(now);
        }

        user.setDisplayName(displayName);
        user.setUpdateTime(LocalDateTime.now());
        try {
            userMapper.save(user);
        } catch (DataIntegrityViolationException e) {
            // The pre-check handles normal conflicts; the unique index closes the race window.
            throw new BizException(ResponseCodeEnum.USERNAME_ALREADY_EXISTS);
        }
        return Response.success(toProfile(user));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<UserProfileVO> uploadAvatar(MultipartFile file) {
        validateAvatar(file);
        UserDO user = getCurrentUser();
        try {
            user.setAvatar(aliyunOSSUtil.uploadFile(file));
            user.setUpdateTime(LocalDateTime.now());
            userMapper.save(user);
            return Response.success(toProfile(user));
        } catch (BizException e) {
            throw e;
        } catch (Exception e) {
            log.error("上传用户头像失败", e);
            throw new BizException(ResponseCodeEnum.FILE_UPLOAD_FAILED);
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Void> changePassword(ChangePasswordReqVO reqVO) {
        UserDO user = getCurrentUser();
        boolean passwordSet = StrUtil.isNotBlank(user.getPassword());
        String currentPassword = null;
        if (passwordSet) {
            currentPassword = loginCryptoService.decryptPassword(
                    reqVO.getCurrentChallengeId(), reqVO.getEncryptedCurrentPassword());
            if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
                throw new BizException(ResponseCodeEnum.CURRENT_PASSWORD_ERROR);
            }
        }
        String newPassword = loginCryptoService.decryptPassword(
                reqVO.getNewChallengeId(), reqVO.getEncryptedNewPassword());

        if (newPassword.length() < 6 || newPassword.length() > 64) {
            throw new BizException(ResponseCodeEnum.NEW_PASSWORD_FORMAT_INVALID);
        }
        if (passwordSet && currentPassword.equals(newPassword)) {
            throw new BizException(ResponseCodeEnum.NEW_PASSWORD_SAME);
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setUpdateTime(LocalDateTime.now());
        userMapper.save(user);
        StpUtil.logout(user.getId());
        return Response.success();
    }

    private UserDO getCurrentUser() {
        UserDO user = userMapper.selectActiveById(StpUtil.getLoginIdAsLong());
        if (user == null || Boolean.TRUE.equals(user.getIsDeleted())) {
            throw new BizException(ResponseCodeEnum.USER_NOT_EXIST);
        }
        return user;
    }

    private void validateAvatar(MultipartFile file) {
        String originalFilename = file == null ? null : file.getOriginalFilename();
        int suffixIndex = originalFilename == null ? -1 : originalFilename.lastIndexOf('.');
        String suffix = suffixIndex < 0 ? "" : originalFilename.substring(suffixIndex).toLowerCase(Locale.ROOT);
        if (file == null || file.isEmpty() || file.getSize() > MAX_AVATAR_SIZE
                || !ALLOWED_IMAGE_TYPES.contains(file.getContentType())
                || StrUtil.isBlank(originalFilename) || !ALLOWED_IMAGE_SUFFIXES.contains(suffix)) {
            throw new BizException(ResponseCodeEnum.AVATAR_FORMAT_INVALID);
        }
    }

    private UserProfileVO toProfile(UserDO user) {
        return UserProfileVO.builder()
                .username(user.getUsername())
                .displayName(StrUtil.blankToDefault(user.getDisplayName(), "恋人"))
                .avatar(StrUtil.blankToDefault(user.getAvatar(), ""))
                .passwordSet(StrUtil.isNotBlank(user.getPassword()))
                .usernameChangeAvailableAt(user.getUsernameUpdateTime() == null
                        ? null : user.getUsernameUpdateTime().plusDays(USERNAME_CHANGE_COOLDOWN_DAYS))
                .permissions(saTokenPermissionService.getFrontendQueryPermissions(user.getId()))
                .build();
    }
}
