package com.chengliuxiang.amour.admin.service.impl;

import cn.dev33.satoken.stp.SaTokenInfo;
import cn.dev33.satoken.stp.StpUtil;
import com.chengliuxiang.amour.admin.model.vo.login.AdminLoginReqVO;
import com.chengliuxiang.amour.admin.service.AdminLoginService;
import com.chengliuxiang.amour.common.domain.dos.UserDO;
import com.chengliuxiang.amour.common.domain.mapper.UserMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.service.LoginCryptoService;
import com.chengliuxiang.amour.common.utils.Response;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.Objects;

@Service
@Slf4j
public class AdminLoginServiceImpl implements AdminLoginService {

    @Resource
    private UserMapper userMapper;
    @Resource
    private PasswordEncoder passwordEncoder;
    @Resource
    private LoginCryptoService loginCryptoService;

    /**
     * 管理员登录
     *
     * @param adminLoginReqVO
     * @return
     */
    @Override
    public Response<String> adminLogin(AdminLoginReqVO adminLoginReqVO) {
        String username = adminLoginReqVO.getUsername();
        String password = loginCryptoService.decryptPassword(
                adminLoginReqVO.getChallengeId(), adminLoginReqVO.getEncryptedPassword());
        UserDO userDO = userMapper.selectByUsername(username);
        if(Objects.isNull(userDO)){
            throw new BizException(ResponseCodeEnum.USERNAME_OR_PWD_ERROR);
        }
        boolean isPasswordCorrect = passwordEncoder.matches(password, userDO.getPassword());
        if(!isPasswordCorrect){
            throw new BizException(ResponseCodeEnum.USERNAME_OR_PWD_ERROR);
        }
        Long userId = userDO.getId();
        StpUtil.login(userId); // SaToken 登录用户，入参为用户 ID
        SaTokenInfo tokenInfo = StpUtil.getTokenInfo(); // 获取 Token 令牌
        return Response.success(tokenInfo.tokenValue);
    }

    @Override
    public Response<Void> logout() {
        StpUtil.logout();
        return Response.success();
    }
}
