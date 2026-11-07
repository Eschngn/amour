package com.chengliuxiang.amour.web.service.impl;

import cn.hutool.core.util.StrUtil;
import com.chengliuxiang.amour.common.domain.dos.AnniversaryDO;
import com.chengliuxiang.amour.common.domain.mapper.AnniversaryMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.anniversary.AnniversaryIdReqVO;
import com.chengliuxiang.amour.web.model.vo.anniversary.AnniversarySaveReqVO;
import com.chengliuxiang.amour.web.model.vo.anniversary.AnniversaryVO;
import com.chengliuxiang.amour.web.service.SpaceAnniversaryManageService;
import com.chengliuxiang.amour.web.service.SpaceContentAccessService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class SpaceAnniversaryManageServiceImpl implements SpaceAnniversaryManageService {

    private static final int VISIBILITY_MEMBER = 0;
    private static final int VISIBILITY_PUBLIC = 1;
    private static final int VISIBILITY_HIDDEN = 2;

    private static final String DEFAULT_COLOR = "#D94F70";
    private static final Set<String> CATEGORIES = new HashSet<>(Arrays.asList(
            "love", "birthday", "journey", "memory", "milestone", "other"));
    private static final Pattern HEX_COLOR = Pattern.compile("^#[0-9a-fA-F]{6}$");

    @Resource
    private SpaceContentAccessService spaceContentAccessService;

    @Resource
    private AnniversaryMapper anniversaryMapper;

    @Override
    public Response<List<AnniversaryVO>> listAnniversaries() {
        Long spaceId = spaceContentAccessService.requireReadableSpaceId();
        List<AnniversaryVO> records = anniversaryMapper.selectManageList(spaceId)
                .stream()
                .map(this::toVO)
                .collect(Collectors.toList());
        return Response.success(records);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Long> saveAnniversary(AnniversarySaveReqVO reqVO) {
        SpaceContentAccessService.SpaceAccess access = spaceContentAccessService.requireEditable();
        Long spaceId = access.getSpaceId();

        String title = StrUtil.trim(reqVO.getTitle());
        if (StrUtil.isBlank(title) || title.length() > 100 || reqVO.getAnniversaryDate() == null) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        int repeatType = reqVO.getRepeatType() == null ? 1 : reqVO.getRepeatType();
        if (repeatType != 0 && repeatType != 1) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        String category = StrUtil.blankToDefault(StrUtil.trim(reqVO.getCategory()), "other");
        if (!CATEGORIES.contains(category)) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        String colorCode = StrUtil.blankToDefault(StrUtil.trim(reqVO.getColorCode()), DEFAULT_COLOR);
        if (!HEX_COLOR.matcher(colorCode).matches()) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        Integer visibility = resolveVisibility(reqVO.getVisibility(), access);

        LocalDateTime now = LocalDateTime.now();
        if (reqVO.getId() == null) {
            AnniversaryDO anniversary = AnniversaryDO.builder()
                    .spaceId(spaceId)
                    .title(title)
                    .description(StrUtil.nullToEmpty(StrUtil.trim(reqVO.getDescription())))
                    .anniversaryDate(reqVO.getAnniversaryDate())
                    .repeatType(repeatType)
                    .category(category)
                    .colorCode(colorCode)
                    .location(StrUtil.nullToEmpty(StrUtil.trim(reqVO.getLocation())))
                    .sortOrder(reqVO.getSortOrder() == null ? 0 : reqVO.getSortOrder())
                    .visibility(visibility)
                    .isDeleted(false)
                    .createdBy(access.getUserId())
                    .updatedBy(access.getUserId())
                    .createTime(now)
                    .updateTime(now)
                    .build();
            anniversaryMapper.insertAnniversary(anniversary);
            return Response.success(anniversary.getId());
        }

        AnniversaryDO current = requireAnniversary(spaceId, reqVO.getId());
        AnniversaryDO anniversary = AnniversaryDO.builder()
                .id(current.getId())
                .spaceId(spaceId)
                .title(title)
                .description(StrUtil.nullToEmpty(StrUtil.trim(reqVO.getDescription())))
                .anniversaryDate(reqVO.getAnniversaryDate())
                .repeatType(repeatType)
                .category(category)
                .colorCode(colorCode)
                .location(StrUtil.nullToEmpty(StrUtil.trim(reqVO.getLocation())))
                .sortOrder(reqVO.getSortOrder() == null
                        ? (current.getSortOrder() == null ? 0 : current.getSortOrder())
                        : reqVO.getSortOrder())
                .visibility(visibility)
                .updatedBy(access.getUserId())
                .updateTime(now)
                .build();
        int updated = anniversaryMapper.updateAnniversary(anniversary);
        if (updated == 0) {
            throw new BizException(ResponseCodeEnum.ANNIVERSARY_NOT_EXIST);
        }
        return Response.success(current.getId());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Void> deleteAnniversary(AnniversaryIdReqVO reqVO) {
        SpaceContentAccessService.SpaceAccess access = spaceContentAccessService.requireEditable();
        requireAnniversary(access.getSpaceId(), reqVO.getId());
        int deleted = anniversaryMapper.softDelete(access.getSpaceId(), reqVO.getId(),
                access.getUserId(), LocalDateTime.now());
        if (deleted == 0) {
            throw new BizException(ResponseCodeEnum.ANNIVERSARY_NOT_EXIST);
        }
        return Response.success();
    }

    private Integer resolveVisibility(Integer requested, SpaceContentAccessService.SpaceAccess access) {
        int visibility = requested == null ? VISIBILITY_MEMBER : requested;
        if (visibility != VISIBILITY_MEMBER && visibility != VISIBILITY_PUBLIC && visibility != VISIBILITY_HIDDEN) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        if (visibility == VISIBILITY_PUBLIC && !access.canPublishContent()) {
            throw new BizException(ResponseCodeEnum.SPACE_CONTENT_PUBLISH_NOT_ALLOWED);
        }
        return visibility;
    }

    private AnniversaryDO requireAnniversary(Long spaceId, Long id) {
        AnniversaryDO anniversary = anniversaryMapper.selectActiveById(spaceId, id);
        if (anniversary == null) {
            throw new BizException(ResponseCodeEnum.ANNIVERSARY_NOT_EXIST);
        }
        return anniversary;
    }

    private AnniversaryVO toVO(AnniversaryDO anniversary) {
        return AnniversaryVO.builder()
                .id(anniversary.getId())
                .title(anniversary.getTitle())
                .description(anniversary.getDescription())
                .anniversaryDate(anniversary.getAnniversaryDate())
                .repeatType(anniversary.getRepeatType())
                .category(anniversary.getCategory())
                .colorCode(anniversary.getColorCode())
                .location(anniversary.getLocation())
                .sortOrder(anniversary.getSortOrder())
                .visibility(anniversary.getVisibility())
                .build();
    }
}
