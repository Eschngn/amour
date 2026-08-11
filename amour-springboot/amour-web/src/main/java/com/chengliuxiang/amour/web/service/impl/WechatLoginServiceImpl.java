package com.chengliuxiang.amour.web.service.impl;

import cn.dev33.satoken.stp.SaTokenInfo;
import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.crypto.digest.DigestUtil;
import com.chengliuxiang.amour.common.constant.RedisKeyConstants;
import com.chengliuxiang.amour.common.domain.dos.UserDO;
import com.chengliuxiang.amour.common.domain.mapper.UserMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.utils.JsonUtil;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.client.WechatAuthClient;
import com.chengliuxiang.amour.web.model.vo.login.WechatLoginReqVO;
import com.chengliuxiang.amour.web.model.vo.login.WechatLoginRespVO;
import com.chengliuxiang.amour.web.model.wechat.WechatCode2SessionResponse;
import com.chengliuxiang.amour.web.model.wechat.WechatSession;
import com.chengliuxiang.amour.web.service.WechatLoginService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@Slf4j
public class WechatLoginServiceImpl implements WechatLoginService {

    private static final long SESSION_TTL_SECONDS = 2592000L;

    @Resource
    private WechatAuthClient wechatAuthClient;

    @Resource
    private UserMapper userMapper;

    @Resource
    private StringRedisTemplate stringRedisTemplate;

    @Resource
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public Response<WechatLoginRespVO> login(WechatLoginReqVO reqVO) {
        String code = reqVO == null ? null : reqVO.getCode();
        if (StrUtil.isBlank(code)) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }

        WechatCode2SessionResponse wechatSession = wechatAuthClient.code2Session(code.trim());
        UserDO user = findOrCreateUser(wechatSession.getOpenid());

        StpUtil.login(user.getId());
        SaTokenInfo tokenInfo = StpUtil.getTokenInfo();
        String token = tokenInfo.tokenValue;
        saveSession(token, wechatSession);

        return Response.success(WechatLoginRespVO.builder()
                .token(token)
                .displayName(StrUtil.blankToDefault(user.getDisplayName(), "恋人"))
                .avatar(StrUtil.blankToDefault(user.getAvatar(), ""))
                .build());
    }

    @Override
    public WechatSession getSession(String token) {
        if (StrUtil.isBlank(token)) {
            return null;
        }
        String value = stringRedisTemplate.opsForValue()
                .get(RedisKeyConstants.buildWechatSessionKey(token));
        if (StrUtil.isBlank(value)) {
            return null;
        }
        try {
            return objectMapper.readValue(value, WechatSession.class);
        } catch (JsonProcessingException e) {
            log.warn("微信登录会话数据格式错误，token: {}", token);
            return null;
        }
    }

    private UserDO findOrCreateUser(String openid) {
        String userKey = RedisKeyConstants.buildWechatUserKey(openid);
        String userIdValue = stringRedisTemplate.opsForValue().get(userKey);
        UserDO mappedUser = findUserById(userIdValue);
        if (mappedUser != null) {
            return mappedUser;
        }

        String username = "wx_" + DigestUtil.sha256Hex(openid).substring(0, 32);
        UserDO user = userMapper.selectByUsername(username);
        if (user == null) {
            user = UserDO.builder()
                    .username(username)
                    // 微信用户没有密码登录入口，仍满足现有用户表的非空约束。
                    .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .displayName("恋人")
                    .avatar("")
                    .createTime(LocalDateTime.now())
                    .updateTime(LocalDateTime.now())
                    .isDeleted(false)
                    .build();
            try {
                userMapper.insert(user);
            } catch (DataIntegrityViolationException e) {
                // 并发首次登录时，另一请求可能已经创建了相同的确定性用户名。
                user = userMapper.selectByUsername(username);
                if (user == null) {
                    throw new BizException(ResponseCodeEnum.WECHAT_LOGIN_FAILED);
                }
            }
        }
        if (Boolean.TRUE.equals(user.getIsDeleted())) {
            throw new BizException(ResponseCodeEnum.USER_NOT_EXIST);
        }
        stringRedisTemplate.opsForValue().set(userKey, String.valueOf(user.getId()));
        return user;
    }

    private UserDO findUserById(String userIdValue) {
        if (StrUtil.isBlank(userIdValue)) {
            return null;
        }
        try {
            UserDO user = userMapper.selectById(Long.valueOf(userIdValue));
            if (user != null && !Boolean.TRUE.equals(user.getIsDeleted())) {
                return user;
            }
        } catch (NumberFormatException e) {
            log.warn("微信用户映射数据格式错误: {}", userIdValue);
        }
        return null;
    }

    private void saveSession(String token, WechatCode2SessionResponse response) {
        WechatSession session = new WechatSession(
                response.getOpenid(), response.getSessionKey(), response.getUnionid());
        stringRedisTemplate.opsForValue().set(
                RedisKeyConstants.buildWechatSessionKey(token),
                JsonUtil.toJsonString(session),
                Duration.ofSeconds(SESSION_TTL_SECONDS));
    }
}
