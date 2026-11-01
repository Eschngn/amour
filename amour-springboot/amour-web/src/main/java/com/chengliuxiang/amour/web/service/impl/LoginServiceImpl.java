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
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.login.LoginReqVO;
import com.chengliuxiang.amour.web.model.vo.login.LoginRespVO;
import com.chengliuxiang.amour.web.service.LoginService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.Objects;

@Service
@Slf4j
public class LoginServiceImpl implements LoginService {

    private static final String DEFAULT_DISPLAY_NAME = "恋人";

    @Resource
    private UserMapper userMapper;

    @Resource
    private PasswordEncoder passwordEncoder;

    @Resource
    private LoginCryptoService loginCryptoService;

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
