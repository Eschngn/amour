package com.chengliuxiang.amour.web.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.chengliuxiang.amour.common.domain.dos.CoupleMemberDO;
import com.chengliuxiang.amour.common.domain.dos.CoupleSpaceConfigDO;
import com.chengliuxiang.amour.common.domain.dos.CoupleSpaceDO;
import com.chengliuxiang.amour.common.domain.dos.UserDO;
import com.chengliuxiang.amour.common.domain.mapper.CoupleMemberMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleSpaceConfigMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleSpaceMapper;
import com.chengliuxiang.amour.common.domain.mapper.UserMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.space.SpaceHomeSaveReqVO;
import com.chengliuxiang.amour.web.model.vo.space.SpaceHomeVO;
import com.chengliuxiang.amour.web.service.SpaceContentAccessService;
import com.chengliuxiang.amour.web.service.SpaceHomeService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class SpaceHomeServiceImpl implements SpaceHomeService {

    private static final String CONFIG_BOY_NAME = "boy_name";
    private static final String CONFIG_GIRL_NAME = "girl_name";
    private static final String CONFIG_BOY_AVATAR = "boy_avatar";
    private static final String CONFIG_GIRL_AVATAR = "girl_avatar";
    private static final String CONFIG_HERO_PHOTO_1 = "home.hero_photo_1";
    private static final String CONFIG_HERO_PHOTO_2 = "home.hero_photo_2";

    private static final String VALUE_TYPE_TEXT = "text";
    private static final String VALUE_TYPE_IMAGE = "image";

    private static final String DEFAULT_BOY_NAME = "HE";
    private static final String DEFAULT_GIRL_NAME = "SHE";
    private static final String SOURCE_CONFIG = "config";
    private static final String SOURCE_MEMBER = "member";
    private static final String SOURCE_DEFAULT = "default";

    private static final int MEMBER_ROLE_CREATOR = 1;
    private static final int MEMBER_ROLE_PARTNER = 2;

    /**
     * 服务端配置键白名单：只允许这些键被读写，且各自有类型与长度限制。
     * 注意 love_start_time 不在白名单中，它只存 couple_space.love_start_time 一份事实来源。
     */
    private static final Map<String, ConfigRule> CONFIG_RULES;

    static {
        Map<String, ConfigRule> rules = new LinkedHashMap<>();
        rules.put(CONFIG_BOY_NAME, new ConfigRule(VALUE_TYPE_TEXT, 30, false));
        rules.put(CONFIG_GIRL_NAME, new ConfigRule(VALUE_TYPE_TEXT, 30, false));
        rules.put(CONFIG_BOY_AVATAR, new ConfigRule(VALUE_TYPE_IMAGE, 500, true));
        rules.put(CONFIG_GIRL_AVATAR, new ConfigRule(VALUE_TYPE_IMAGE, 500, true));
        rules.put(CONFIG_HERO_PHOTO_1, new ConfigRule(VALUE_TYPE_IMAGE, 500, true));
        rules.put(CONFIG_HERO_PHOTO_2, new ConfigRule(VALUE_TYPE_IMAGE, 500, true));
        CONFIG_RULES = Collections.unmodifiableMap(rules);
    }

    private static final Pattern SAFE_IMAGE_URL = Pattern.compile("^(https?://|/)[^\\s]*$",
            Pattern.CASE_INSENSITIVE);

    @Resource
    private SpaceContentAccessService spaceContentAccessService;

    @Resource
    private CoupleSpaceMapper coupleSpaceMapper;

    @Resource
    private CoupleSpaceConfigMapper coupleSpaceConfigMapper;

    @Resource
    private CoupleMemberMapper coupleMemberMapper;

    @Resource
    private UserMapper userMapper;

    @Override
    public Response<SpaceHomeVO> queryHome() {
        SpaceContentAccessService.SpaceAccess access = spaceContentAccessService.requireReadable();
        return Response.success(buildHomeVO(access));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<SpaceHomeVO> saveHome(SpaceHomeSaveReqVO reqVO) {
        SpaceContentAccessService.SpaceAccess access = spaceContentAccessService.requireEditable();
        CoupleSpaceDO space = access.getSpace();
        LocalDateTime now = LocalDateTime.now();

        String spaceName = reqVO.getSpaceName() == null
                ? space.getSpaceName()
                : StrUtil.blankToDefault(StrUtil.trim(reqVO.getSpaceName()), space.getSpaceName());
        String description = reqVO.getDescription() == null
                ? space.getDescription()
                : StrUtil.nullToEmpty(StrUtil.trim(reqVO.getDescription()));

        int updated = coupleSpaceMapper.updateHomeInfo(
                space.getId(), spaceName, description, reqVO.getLoveStartTime(), now);
        if (updated == 0) {
            throw new BizException(ResponseCodeEnum.SPACE_CONTENT_EDIT_NOT_ALLOWED);
        }

        if (reqVO.getConfigs() != null) {
            for (Map.Entry<String, String> entry : reqVO.getConfigs().entrySet()) {
                saveConfig(access.getSpaceId(), access.getUserId(), entry.getKey(), entry.getValue(), now);
            }
        }

        CoupleSpaceDO latest = coupleSpaceMapper.findById(space.getId());
        if (latest == null) {
            throw new BizException(ResponseCodeEnum.SPACE_NOT_EXIST);
        }
        SpaceContentAccessService.SpaceAccess latestAccess = new SpaceContentAccessService.SpaceAccess(
                access.getUserId(), latest, access.getMembership());
        return Response.success(buildHomeVO(latestAccess));
    }

    private void saveConfig(Long spaceId, Long userId, String configKey, String rawValue, LocalDateTime now) {
        ConfigRule rule = CONFIG_RULES.get(configKey);
        if (rule == null) {
            throw new BizException(ResponseCodeEnum.SPACE_HOME_CONFIG_KEY_NOT_ALLOWED);
        }
        String value = StrUtil.nullToEmpty(StrUtil.trim(rawValue));
        if (value.length() > rule.maxLength) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        if (rule.image && value.length() > 0 && !SAFE_IMAGE_URL.matcher(value).matches()) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }

        int updated = coupleSpaceConfigMapper.updateValue(spaceId, configKey, value, now);
        if (updated > 0) {
            return;
        }
        // 部分数据库在“值未变化”时 affected rows 为 0，这里先确认记录是否已存在，
        // 避免把一次正常的幂等保存误判为需要插入。
        CoupleSpaceConfigDO existing = coupleSpaceConfigMapper.selectBySpaceAndKey(spaceId, configKey);
        if (existing != null) {
            return;
        }
        CoupleSpaceConfigDO config = CoupleSpaceConfigDO.builder()
                .spaceId(spaceId)
                .configKey(configKey)
                .configValue(value)
                .valueType(rule.valueType)
                .createdBy(userId)
                .createTime(now)
                .updateTime(now)
                .build();
        try {
            coupleSpaceConfigMapper.insertConfig(config);
        } catch (DataIntegrityViolationException e) {
            // 唯一键 (space_id, config_key) 兜底：并发首次写入时只保留一条记录。
            int retried = coupleSpaceConfigMapper.updateValue(spaceId, configKey, value, now);
            if (retried == 0 && coupleSpaceConfigMapper.selectBySpaceAndKey(spaceId, configKey) == null) {
                throw new BizException(ResponseCodeEnum.SYSTEM_ERROR);
            }
        }
    }

    private SpaceHomeVO buildHomeVO(SpaceContentAccessService.SpaceAccess access) {
        CoupleSpaceDO space = access.getSpace();
        List<CoupleMemberDO> members = coupleMemberMapper.selectActiveBySpaceId(space.getId());
        CoupleMemberDO creatorMember = findMemberByRole(members, MEMBER_ROLE_CREATOR);
        CoupleMemberDO partnerMember = findMemberByRole(members, MEMBER_ROLE_PARTNER);
        Map<Long, UserDO> userMap = loadUserMap(members);

        Map<String, String> configMap = loadConfigMap(space.getId());

        ResolvedValue boyName = resolveText(configMap.get(CONFIG_BOY_NAME),
                displayName(userMap, creatorMember), DEFAULT_BOY_NAME);
        ResolvedValue girlName = resolveText(configMap.get(CONFIG_GIRL_NAME),
                displayName(userMap, partnerMember), DEFAULT_GIRL_NAME);
        ResolvedValue boyAvatar = resolveText(configMap.get(CONFIG_BOY_AVATAR),
                avatar(userMap, creatorMember), "");
        ResolvedValue girlAvatar = resolveText(configMap.get(CONFIG_GIRL_AVATAR),
                avatar(userMap, partnerMember), "");

        return SpaceHomeVO.builder()
                .spaceId(space.getId())
                .spaceName(space.getSpaceName())
                .description(space.getDescription())
                .loveStartTime(space.getLoveStartTime())
                .status(space.getStatus())
                .boyName(boyName.value)
                .girlName(girlName.value)
                .boyAvatar(boyAvatar.value)
                .girlAvatar(girlAvatar.value)
                .heroPhoto1(StrUtil.nullToEmpty(configMap.get(CONFIG_HERO_PHOTO_1)))
                .heroPhoto2(StrUtil.nullToEmpty(configMap.get(CONFIG_HERO_PHOTO_2)))
                .boyNameSource(boyName.source)
                .girlNameSource(girlName.source)
                .boyAvatarSource(boyAvatar.source)
                .girlAvatarSource(girlAvatar.source)
                .canEdit(canEdit(access))
                .build();
    }

    private boolean canEdit(SpaceContentAccessService.SpaceAccess access) {
        Integer status = access.getSpace().getStatus();
        if (status == null || (status != 0 && status != 1)) {
            return false;
        }
        if (status == 1) {
            return true;
        }
        return Objects.equals(access.getSpace().getCreatedBy(), access.getUserId())
                || Objects.equals(access.getMembership().getMemberRole(), MEMBER_ROLE_CREATOR);
    }

    private Map<String, String> loadConfigMap(Long spaceId) {
        List<CoupleSpaceConfigDO> configs = coupleSpaceConfigMapper.selectBySpaceId(spaceId);
        if (CollUtil.isEmpty(configs)) {
            return Collections.emptyMap();
        }
        Map<String, String> result = new LinkedHashMap<>();
        for (CoupleSpaceConfigDO config : configs) {
            if (CONFIG_RULES.containsKey(config.getConfigKey())) {
                result.put(config.getConfigKey(), StrUtil.nullToEmpty(config.getConfigValue()));
            }
        }
        return result;
    }

    private ResolvedValue resolveText(String configured, String memberValue, String fallback) {
        if (StrUtil.isNotBlank(configured)) {
            return new ResolvedValue(configured.trim(), SOURCE_CONFIG);
        }
        if (StrUtil.isNotBlank(memberValue)) {
            return new ResolvedValue(memberValue.trim(), SOURCE_MEMBER);
        }
        return new ResolvedValue(fallback, SOURCE_DEFAULT);
    }

    private CoupleMemberDO findMemberByRole(List<CoupleMemberDO> members, int role) {
        if (CollUtil.isEmpty(members)) {
            return null;
        }
        return members.stream()
                .filter(member -> Objects.equals(member.getMemberRole(), role))
                .findFirst()
                .orElse(null);
    }

    private Map<Long, UserDO> loadUserMap(Collection<CoupleMemberDO> members) {
        if (CollUtil.isEmpty(members)) {
            return Collections.emptyMap();
        }
        List<Long> userIds = members.stream()
                .map(CoupleMemberDO::getUserId)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
        if (userIds.isEmpty()) {
            return Collections.emptyMap();
        }
        return userMapper.findUsersByIds(userIds).stream()
                .collect(Collectors.toMap(UserDO::getId, Function.identity(), (left, right) -> left));
    }

    private String displayName(Map<Long, UserDO> userMap, CoupleMemberDO member) {
        UserDO user = member == null ? null : userMap.get(member.getUserId());
        return user == null ? "" : StrUtil.nullToEmpty(user.getDisplayName());
    }

    private String avatar(Map<Long, UserDO> userMap, CoupleMemberDO member) {
        UserDO user = member == null ? null : userMap.get(member.getUserId());
        return user == null ? "" : StrUtil.nullToEmpty(user.getAvatar());
    }

    private static final class ConfigRule {

        private final String valueType;

        private final int maxLength;

        private final boolean image;

        private ConfigRule(String valueType, int maxLength, boolean image) {
            this.valueType = valueType;
            this.maxLength = maxLength;
            this.image = image;
        }
    }

    private static final class ResolvedValue {

        private final String value;

        private final String source;

        private ResolvedValue(String value, String source) {
            this.value = value;
            this.source = source;
        }
    }
}
