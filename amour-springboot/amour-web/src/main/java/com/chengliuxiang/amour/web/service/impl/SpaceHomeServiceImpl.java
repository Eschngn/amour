package com.chengliuxiang.amour.web.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.chengliuxiang.amour.common.constant.FrontendSiteConfigConstants;
import com.chengliuxiang.amour.common.constant.SpaceReviewConstants;
import com.chengliuxiang.amour.common.domain.dos.CoupleMemberDO;
import com.chengliuxiang.amour.common.domain.dos.CoupleSpaceConfigDO;
import com.chengliuxiang.amour.common.domain.dos.CoupleSpaceDO;
import com.chengliuxiang.amour.common.domain.dos.PlatformConfigDO;
import com.chengliuxiang.amour.common.domain.dos.UserDO;
import com.chengliuxiang.amour.common.domain.mapper.CoupleMemberMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleSpaceConfigMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleSpaceMapper;
import com.chengliuxiang.amour.common.domain.mapper.PlatformConfigMapper;
import com.chengliuxiang.amour.common.domain.mapper.UserMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.space.SpaceContentSaveResultVO;
import com.chengliuxiang.amour.web.model.vo.space.SpaceHomeSaveReqVO;
import com.chengliuxiang.amour.web.model.vo.space.SpaceHomeVO;
import com.chengliuxiang.amour.web.service.SpaceContentAccessService;
import com.chengliuxiang.amour.web.service.SpaceHomeService;
import com.chengliuxiang.amour.web.service.SpaceReviewService;
import com.chengliuxiang.amour.web.utils.SafeImageUrlValidator;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
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
    private static final String SOURCE_PLATFORM = "platform";
    private static final String SOURCE_PLACEHOLDER = "placeholder";
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

    @Resource
    private PlatformConfigMapper platformConfigMapper;

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

    @Resource
    private SpaceReviewService spaceReviewService;

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
        // 公开空间修改首页信息需要审核：先固化当前已发布版本，再保存工作数据。
        spaceReviewService.prepareForPublicEdit(space.getId());

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
        SpaceHomeVO homeVO = buildHomeVO(latestAccess);
        SpaceContentSaveResultVO reviewResult = spaceReviewService.onHomeSaved(
                latest.getId(), access.getUserId(), "编辑空间首页信息与主页配置");
        homeVO.setReviewPending(SpaceReviewConstants.USER_STATE_PENDING.equals(
                reviewResult.getReviewStatus()));
        homeVO.setReviewRestored(Boolean.TRUE.equals(reviewResult.getRestoredToPublished()));
        homeVO.setReviewMessage(reviewResult.getReviewMessage());
        return Response.success(homeVO);
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
        if (rule.image && value.length() > 0 && !SafeImageUrlValidator.isValid(value)) {
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
                .revision(1)
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
        Map<String, String> platformImages = loadPlatformDefaultImages();

        ResolvedValue boyName = resolveText(configMap.get(CONFIG_BOY_NAME),
                displayName(userMap, creatorMember), DEFAULT_BOY_NAME);
        ResolvedValue girlName = resolveText(configMap.get(CONFIG_GIRL_NAME),
                displayName(userMap, partnerMember), DEFAULT_GIRL_NAME);
        // 头像按「空间配置 → 成员资料 → 管理控制台默认图 → 前端占位样式」解析。
        ResolvedValue boyAvatar = resolveAvatar(configMap.get(CONFIG_BOY_AVATAR),
                avatar(userMap, creatorMember),
                platformImages.get(FrontendSiteConfigConstants.DEFAULT_COUPLE_AVATAR_BOY));
        ResolvedValue girlAvatar = resolveAvatar(configMap.get(CONFIG_GIRL_AVATAR),
                avatar(userMap, partnerMember),
                platformImages.get(FrontendSiteConfigConstants.DEFAULT_COUPLE_AVATAR_GIRL));
        // 主视觉照片只在用户配置或管理员默认图存在时返回地址，否则由前端展示“尚未上传”占位。
        ResolvedValue heroPhoto1 = resolveImage(configMap.get(CONFIG_HERO_PHOTO_1),
                platformImages.get(FrontendSiteConfigConstants.DEFAULT_COUPLE_HERO_PHOTO_1));
        ResolvedValue heroPhoto2 = resolveImage(configMap.get(CONFIG_HERO_PHOTO_2),
                platformImages.get(FrontendSiteConfigConstants.DEFAULT_COUPLE_HERO_PHOTO_2));

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
                .heroPhoto1(heroPhoto1.value)
                .heroPhoto2(heroPhoto2.value)
                .boyNameSource(boyName.source)
                .girlNameSource(girlName.source)
                .boyAvatarSource(boyAvatar.source)
                .girlAvatarSource(girlAvatar.source)
                .heroPhoto1Source(heroPhoto1.source)
                .heroPhoto2Source(heroPhoto2.source)
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

    private ResolvedValue resolveAvatar(String configured, String memberValue, String platformValue) {
        if (StrUtil.isNotBlank(configured)) {
            return new ResolvedValue(configured.trim(), SOURCE_CONFIG);
        }
        if (StrUtil.isNotBlank(memberValue)) {
            return new ResolvedValue(memberValue.trim(), SOURCE_MEMBER);
        }
        if (StrUtil.isNotBlank(platformValue)) {
            return new ResolvedValue(platformValue, SOURCE_PLATFORM);
        }
        return new ResolvedValue("", SOURCE_PLACEHOLDER);
    }

    private ResolvedValue resolveImage(String configured, String platformValue) {
        if (StrUtil.isNotBlank(configured)) {
            return new ResolvedValue(configured.trim(), SOURCE_CONFIG);
        }
        if (StrUtil.isNotBlank(platformValue)) {
            return new ResolvedValue(platformValue, SOURCE_PLATFORM);
        }
        return new ResolvedValue("", SOURCE_PLACEHOLDER);
    }

    /** 读取管理控制台配置的全站默认图片；空值与非法地址视为未配置。 */
    private Map<String, String> loadPlatformDefaultImages() {
        List<PlatformConfigDO> configs = platformConfigMapper.selectByConfigKeys(
                FrontendSiteConfigConstants.DEFAULT_IMAGE_KEYS);
        if (CollUtil.isEmpty(configs)) {
            return Collections.emptyMap();
        }
        Map<String, String> images = new HashMap<>();
        for (PlatformConfigDO config : configs) {
            String value = StrUtil.trimToEmpty(config.getConfigValue());
            if (value.length() <= 500 && SafeImageUrlValidator.isValid(value)) {
                images.put(config.getConfigKey(), value);
            }
        }
        return images;
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
