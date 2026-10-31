package com.chengliuxiang.amour.web.service.impl;

import cn.dev33.satoken.stp.SaTokenInfo;
import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.util.RandomUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.crypto.digest.DigestUtil;
import com.chengliuxiang.amour.common.constant.FrontendPermissionConstants;
import com.chengliuxiang.amour.common.constant.RedisKeyConstants;
import com.chengliuxiang.amour.common.domain.dos.PlatformConfigDO;
import com.chengliuxiang.amour.common.domain.dos.UserDO;
import com.chengliuxiang.amour.common.domain.mapper.PlatformConfigMapper;
import com.chengliuxiang.amour.common.domain.mapper.UserMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.utils.AmourIdUtil;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.client.WechatAuthClient;
import com.chengliuxiang.amour.web.model.vo.login.WechatLoginReqVO;
import com.chengliuxiang.amour.web.model.vo.login.WechatLoginRespVO;
import com.chengliuxiang.amour.web.model.wechat.WechatCode2SessionResponse;
import com.chengliuxiang.amour.web.service.WechatLoginService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.time.LocalDateTime;

@Service
@Slf4j
public class WechatLoginServiceImpl implements WechatLoginService {

    /** 新注册微信用户的默认昵称前缀 */
    private static final String DEFAULT_DISPLAY_NAME_PREFIX = "微信用户";

    /** 新注册微信用户的默认头像配置键 */
    private static final String DEFAULT_AVATAR_CONFIG_KEY = "default_avatar";

    /** 恋语 ID 或用户名冲突时的最大重试次数 */
    private static final int CREATE_USER_MAX_RETRIES = 5;

    @Resource
    private WechatAuthClient wechatAuthClient;

    @Resource
    private UserMapper userMapper;

    @Resource
    private PlatformConfigMapper platformConfigMapper;

    @Resource
    private StringRedisTemplate stringRedisTemplate;

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

        return Response.success(WechatLoginRespVO.builder()
                .token(tokenInfo.tokenValue)
                .amourId(user.getAmourId())
                .username(user.getUsername())
                .displayName(StrUtil.blankToDefault(user.getDisplayName(), "微信用户"))
                .avatar(StrUtil.blankToDefault(user.getAvatar(), ""))
                .passwordSet(StrUtil.isNotBlank(user.getPassword()))
                .permissions(FrontendPermissionConstants.QUERY_PERMISSIONS)
                .build());
    }

    private UserDO findOrCreateUser(String openid) {
        String userKey = RedisKeyConstants.buildWechatUserKey(openid);
        String userIdValue = stringRedisTemplate.opsForValue().get(userKey);
        UserDO mappedUser = findUserById(userIdValue);
        if (mappedUser != null) {
            return mappedUser;
        }

        UserDO user = userMapper.selectByWechatOpenid(openid);
        if (user == null) {
            // 兼容旧数据：历史微信用户只有确定性用户名，未写入 openid，登录时补齐。
            String legacyUsername = buildLegacyUsername(openid);
            user = userMapper.selectByUsername(legacyUsername);
            if (user != null) {
                user.setWechatOpenid(openid);
                user.setUpdateTime(LocalDateTime.now());
                try {
                    userMapper.save(user);
                } catch (DataIntegrityViolationException e) {
                    log.warn("微信用户 {} 补齐 openid 失败，可能已被其他账号占用", user.getId());
                    throw new BizException(ResponseCodeEnum.WECHAT_LOGIN_FAILED);
                }
            }
        }
        if (user == null) {
            user = createWechatUser(openid);
        }
        if (Boolean.TRUE.equals(user.getIsDeleted())) {
            throw new BizException(ResponseCodeEnum.USER_NOT_EXIST);
        }
        stringRedisTemplate.opsForValue().set(userKey, String.valueOf(user.getId()));
        return user;
    }

    /**
     * 创建微信用户，用户名或恋语 ID 冲突时重新生成并重试。
     */
    private UserDO createWechatUser(String openid) {
        String defaultAvatar = queryDefaultAvatar();
        String legacyUsername = buildLegacyUsername(openid);
        for (int attempt = 0; attempt < CREATE_USER_MAX_RETRIES; attempt++) {
            String username = attempt == 0
                    ? legacyUsername
                    : legacyUsername + RandomUtil.randomNumbers(3);
            if (userMapper.selectAnyByUsername(username) != null) {
                continue;
            }
            String amourId = AmourIdUtil.generate();
            if (userMapper.selectByAmourId(amourId) != null) {
                continue;
            }
            UserDO user = UserDO.builder()
                    .amourId(amourId)
                    .username(username)
                    // 微信用户注册时密码默认为空，微信登录不依赖密码。
                    .password(null)
                    .displayName(DEFAULT_DISPLAY_NAME_PREFIX + RandomUtil.randomString(6))
                    .avatar(defaultAvatar)
                    .wechatOpenid(openid)
                    .createTime(LocalDateTime.now())
                    .updateTime(LocalDateTime.now())
                    .isDeleted(false)
                    .isPlatformAdmin(false)
                    .build();
            try {
                userMapper.insert(user);
                return user;
            } catch (DataIntegrityViolationException e) {
                // 并发首次登录时，另一请求可能已经创建了相同的 openid。
                UserDO existing = userMapper.selectByWechatOpenid(openid);
                if (existing != null) {
                    return existing;
                }
                log.warn("创建微信用户冲突，重试第 {} 次", attempt + 1);
            }
        }
        throw new BizException(ResponseCodeEnum.WECHAT_LOGIN_FAILED);
    }

    private String buildLegacyUsername(String openid) {
        return "wx_" + DigestUtil.sha256Hex(openid).substring(0, 6);
    }

    private UserDO findUserById(String userIdValue) {
        if (StrUtil.isBlank(userIdValue)) {
            return null;
        }
        try {
            UserDO user = userMapper.selectActiveById(Long.valueOf(userIdValue));
            if (user != null && !Boolean.TRUE.equals(user.getIsDeleted())) {
                return user;
            }
        } catch (NumberFormatException e) {
            log.warn("微信用户映射数据格式错误: {}", userIdValue);
        }
        return null;
    }

    /**
     * 查询平台配置 default_avatar 的头像地址，未配置时返回空串。
     */
    private String queryDefaultAvatar() {
        PlatformConfigDO config = platformConfigMapper.selectValueByKey(DEFAULT_AVATAR_CONFIG_KEY);
        return config == null ? "" : StrUtil.nullToEmpty(config.getConfigValue());
    }
}
