package com.chengliuxiang.amour.web.service.impl;

import cn.dev33.satoken.stp.SaTokenInfo;
import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.util.RandomUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.crypto.digest.DigestUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.chengliuxiang.amour.common.constant.RedisKeyConstants;
import com.chengliuxiang.amour.common.domain.dos.SiteConfigDO;
import com.chengliuxiang.amour.common.domain.dos.UserDO;
import com.chengliuxiang.amour.common.domain.mapper.SiteConfigMapper;
import com.chengliuxiang.amour.common.domain.mapper.UserMapper;
import com.chengliuxiang.amour.common.domain.mapper.UserRoleRelMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.service.SaTokenPermissionService;
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

    @Resource
    private WechatAuthClient wechatAuthClient;

    @Resource
    private UserMapper userMapper;

    @Resource
    private UserRoleRelMapper userRoleRelMapper;

    @Resource
    private SaTokenPermissionService saTokenPermissionService;

    @Resource
    private SiteConfigMapper siteConfigMapper;

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
        saTokenPermissionService.refreshSession(user.getId());
        SaTokenInfo tokenInfo = StpUtil.getTokenInfo();
        String token = tokenInfo.tokenValue;

        return Response.success(WechatLoginRespVO.builder()
                .token(token)
                .username(user.getUsername())
                .displayName(StrUtil.blankToDefault(user.getDisplayName(), "微信用户"))
                .avatar(StrUtil.blankToDefault(user.getAvatar(), ""))
                .passwordSet(StrUtil.isNotBlank(user.getPassword()))
                .build());
    }

    private UserDO findOrCreateUser(String openid) {
        String userKey = RedisKeyConstants.buildWechatUserKey(openid);
        String userIdValue = stringRedisTemplate.opsForValue().get(userKey);
        UserDO mappedUser = findUserById(userIdValue);
        if (mappedUser != null) {
            return mappedUser;
        }

        String username = "wx_" + DigestUtil.sha256Hex(openid).substring(0, 6);
        UserDO user = userMapper.selectByWechatOpenid(openid);
        boolean shouldAssignCommonRole = false;
        if (user == null) {
            // 兼容旧数据：历史微信用户只有确定性用户名，未写入 openid，登录时补齐。
            user = userMapper.selectByUsername(username);
            if (user != null) {
                user.setWechatOpenid(openid);
                user.setUpdateTime(LocalDateTime.now());
                userMapper.updateById(user);
            }
        }
        if (user == null) {
            user = UserDO.builder()
                    .username(username)
                    // 微信用户注册时密码默认为空，微信登录不依赖密码。
                    .password(null)
                    .displayName(DEFAULT_DISPLAY_NAME_PREFIX + RandomUtil.randomString(6))
                    .avatar(queryDefaultAvatar())
                    .wechatOpenid(openid)
                    .createTime(LocalDateTime.now())
                    .updateTime(LocalDateTime.now())
                    .isDeleted(false)
                    .build();
            try {
                userMapper.insert(user);
                shouldAssignCommonRole = true;
            } catch (DataIntegrityViolationException e) {
                // 并发首次登录时，另一请求可能已经创建了相同的 openid/用户名。
                user = userMapper.selectByWechatOpenid(openid);
                if (user == null) {
                    throw new BizException(ResponseCodeEnum.WECHAT_LOGIN_FAILED);
                }
                // 让并发请求也能补齐首个请求尚未写入的默认角色关系。
                shouldAssignCommonRole = true;
            }
        }
        if (Boolean.TRUE.equals(user.getIsDeleted())) {
            throw new BizException(ResponseCodeEnum.USER_NOT_EXIST);
        }
        if (shouldAssignCommonRole) {
            int inserted = userRoleRelMapper.insertCommonRoleIfAbsent(user.getId());
            if (inserted == 0) {
                // 0 也可能表示并发请求已经完成了关系写入；角色缺失时由日志提示运维补齐初始化数据。
                log.warn("微信用户 {} 未新增 common 角色关系，请确认 common 角色已初始化", user.getId());
            }
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

    /**
     * 查询 site_config 表中 config_key=default_avatar 配置的头像地址，未配置时返回空串。
     */
    private String queryDefaultAvatar() {
        SiteConfigDO siteConfig = siteConfigMapper.selectOne(
                new LambdaQueryWrapper<SiteConfigDO>()
                        .select(SiteConfigDO::getConfigValue)
                        .eq(SiteConfigDO::getConfigKey, DEFAULT_AVATAR_CONFIG_KEY)
                        .last("LIMIT 1")
        );
        return siteConfig == null ? "" : StrUtil.nullToEmpty(siteConfig.getConfigValue());
    }

}
