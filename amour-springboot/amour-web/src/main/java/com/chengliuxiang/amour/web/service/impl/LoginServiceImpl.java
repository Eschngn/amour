package com.chengliuxiang.amour.web.service.impl;

import cn.dev33.satoken.stp.SaTokenInfo;
import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.util.StrUtil;
import com.chengliuxiang.amour.common.constant.FrontendPermissionConstants;
import com.chengliuxiang.amour.common.domain.dos.UserDO;
import com.chengliuxiang.amour.common.domain.mapper.UserMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.service.LoginCryptoService;
import com.chengliuxiang.amour.common.utils.AmourIdUtil;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.login.LoginReqVO;
import com.chengliuxiang.amour.web.model.vo.login.LoginRespVO;
import com.chengliuxiang.amour.web.model.vo.login.RegisterReqVO;
import com.chengliuxiang.amour.web.service.LoginService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.util.Objects;

@Service
@Slf4j
public class LoginServiceImpl implements LoginService {

    /** 恋语 ID 冲突时的最大重试次数 */
    private static final int AMOUR_ID_MAX_RETRIES = 5;
    private static final String DEFAULT_DISPLAY_NAME = "恋人";
    private static final int PASSWORD_MIN_LENGTH = 6;
    private static final int PASSWORD_MAX_LENGTH = 64;

    @Resource
    private UserMapper userMapper;

    @Resource
    private PasswordEncoder passwordEncoder;

    @Resource
    private LoginCryptoService loginCryptoService;

    @Override
    public Response<LoginRespVO> register(RegisterReqVO registerReqVO) {
        String username = registerReqVO.getUsername().trim();
        String displayName = StrUtil.trim(registerReqVO.getDisplayName());
        if (StrUtil.isBlank(displayName)) {
            displayName = DEFAULT_DISPLAY_NAME;
        }
        String password = loginCryptoService.decryptPassword(
                registerReqVO.getChallengeId(), registerReqVO.getEncryptedPassword());
        validatePassword(password);

        // 唯一索引包含已删除用户，先做一次存在性检查，给出明确的用户名冲突提示。
        if (userMapper.selectAnyByUsername(username) != null) {
            throw new BizException(ResponseCodeEnum.USERNAME_ALREADY_EXISTS);
        }

        UserDO user = createUserWithUniqueAmourId(username, displayName, password);
        StpUtil.login(user.getId());
        SaTokenInfo tokenInfo = StpUtil.getTokenInfo();
        return Response.success(buildLoginResp(user, tokenInfo.tokenValue));
    }

    @Override
    public Response<LoginRespVO> login(LoginReqVO loginReqVO) {
        String username = loginReqVO.getUsername();
        String password = loginCryptoService.decryptPassword(
                loginReqVO.getChallengeId(), loginReqVO.getEncryptedPassword());
        UserDO userDO = userMapper.selectByUsername(username);
        if (Objects.isNull(userDO) || StrUtil.isBlank(userDO.getPassword())) {
            // 微信用户没有密码，不能通过账号密码登录。
            throw new BizException(ResponseCodeEnum.USERNAME_OR_PWD_ERROR);
        }
        boolean isPasswordCorrect = passwordEncoder.matches(password, userDO.getPassword());
        if (!isPasswordCorrect) {
            throw new BizException(ResponseCodeEnum.USERNAME_OR_PWD_ERROR);
        }
        StpUtil.login(userDO.getId());
        SaTokenInfo tokenInfo = StpUtil.getTokenInfo();
        return Response.success(buildLoginResp(userDO, tokenInfo.tokenValue));
    }

    @Override
    public Response<Void> logout() {
        StpUtil.logout();
        return Response.success();
    }

    /**
     * 创建用户，恋语 ID 冲突时重新生成并重试。
     */
    private UserDO createUserWithUniqueAmourId(String username, String displayName, String password) {
        for (int attempt = 0; attempt < AMOUR_ID_MAX_RETRIES; attempt++) {
            String amourId = AmourIdUtil.generate();
            if (userMapper.selectByAmourId(amourId) != null) {
                continue;
            }
            UserDO user = UserDO.builder()
                    .amourId(amourId)
                    .username(username)
                    .password(passwordEncoder.encode(password))
                    .displayName(displayName)
                    .avatar("")
                    .createTime(LocalDateTime.now())
                    .updateTime(LocalDateTime.now())
                    .isDeleted(false)
                    .isPlatformAdmin(false)
                    .build();
            try {
                userMapper.insert(user);
                return user;
            } catch (DataIntegrityViolationException e) {
                // 并发注册时可能是用户名冲突，也可能是恋语 ID 冲突。
                if (userMapper.selectAnyByUsername(username) != null) {
                    throw new BizException(ResponseCodeEnum.USERNAME_ALREADY_EXISTS);
                }
                log.warn("注册时恋语 ID 冲突，重试第 {} 次", attempt + 1);
            }
        }
        throw new BizException(ResponseCodeEnum.SYSTEM_ERROR);
    }

    private void validatePassword(String password) {
        if (password == null
                || password.length() < PASSWORD_MIN_LENGTH
                || password.length() > PASSWORD_MAX_LENGTH) {
            throw new BizException(ResponseCodeEnum.NEW_PASSWORD_FORMAT_INVALID);
        }
    }

    private LoginRespVO buildLoginResp(UserDO user, String token) {
        return LoginRespVO.builder()
                .token(token)
                .amourId(user.getAmourId())
                .username(user.getUsername())
                .displayName(StrUtil.blankToDefault(user.getDisplayName(), DEFAULT_DISPLAY_NAME))
                .avatar(StrUtil.blankToDefault(user.getAvatar(), ""))
                .permissions(FrontendPermissionConstants.QUERY_PERMISSIONS)
                .build();
    }
}
