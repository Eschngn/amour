package com.chengliuxiang.amour.admin.service.impl;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.chengliuxiang.amour.admin.model.vo.anniversary.AddAnniversaryReqVO;
import com.chengliuxiang.amour.admin.model.vo.anniversary.DeleteAnniversaryReqVO;
import com.chengliuxiang.amour.admin.model.vo.anniversary.FindAnniversaryDetailReqVO;
import com.chengliuxiang.amour.admin.model.vo.anniversary.FindAnniversaryDetailRspVO;
import com.chengliuxiang.amour.admin.model.vo.anniversary.FindAnniversaryPageListReqVO;
import com.chengliuxiang.amour.admin.model.vo.anniversary.FindAnniversaryPageListRspVO;
import com.chengliuxiang.amour.admin.model.vo.anniversary.UpdateAnniversaryReqVO;
import com.chengliuxiang.amour.admin.model.vo.anniversary.UpdateAnniversaryVisibleStatusReqVO;
import com.chengliuxiang.amour.admin.service.AdminAnniversaryService;
import com.chengliuxiang.amour.common.domain.dos.AnniversaryDO;
import com.chengliuxiang.amour.common.domain.dos.CoupleMemberDO;
import com.chengliuxiang.amour.common.domain.mapper.AnniversaryMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleMemberMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AdminAnniversaryServiceImpl implements AdminAnniversaryService {

    private static final long DEFAULT_PAGE_SIZE = 10L;
    private static final long MAX_PAGE_SIZE = 100L;
    private static final String DEFAULT_COLOR = "#d94f70";
    private static final int VISIBILITY_MEMBER = 0;
    private static final int VISIBILITY_HIDDEN = 2;

    @Resource
    private AnniversaryMapper anniversaryMapper;

    @Resource
    private CoupleMemberMapper coupleMemberMapper;

    @Override
    public Response<PageResult<FindAnniversaryPageListRspVO>> findAnniversaryPageList(FindAnniversaryPageListReqVO reqVO) {
        long current = reqVO.getCurrent() == null || reqVO.getCurrent() < 1 ? 1 : reqVO.getCurrent();
        long size = reqVO.getSize() == null || reqVO.getSize() < 1 ? DEFAULT_PAGE_SIZE : Math.min(reqVO.getSize(), MAX_PAGE_SIZE);
        String title = StrUtil.isNotBlank(reqVO.getTitle()) ? StrUtil.trim(reqVO.getTitle()) : null;
        String category = StrUtil.isNotBlank(reqVO.getCategory()) ? StrUtil.trim(reqVO.getCategory()) : null;
        Boolean isVisible = reqVO.getIsVisible();
        IPage<AnniversaryDO> page = anniversaryMapper.selectPage(new Page<>(current, size),
                new LambdaQueryWrapper<AnniversaryDO>()
                        .eq(AnniversaryDO::getIsDeleted, false)
                        .like(title != null, AnniversaryDO::getTitle, title)
                        .eq(category != null, AnniversaryDO::getCategory, category)
                        .eq(reqVO.getRepeatType() != null, AnniversaryDO::getRepeatType, reqVO.getRepeatType())
                        .ne(isVisible != null && isVisible, AnniversaryDO::getVisibility, VISIBILITY_HIDDEN)
                        .eq(isVisible != null && !isVisible, AnniversaryDO::getVisibility, VISIBILITY_HIDDEN)
                        .orderByAsc(AnniversaryDO::getSortOrder)
                        .orderByAsc(AnniversaryDO::getAnniversaryDate)
                        .orderByDesc(AnniversaryDO::getId));
        List<FindAnniversaryPageListRspVO> records = page.getRecords().stream()
                .map(this::toPageVO)
                .collect(Collectors.toList());
        return Response.success(PageResult.<FindAnniversaryPageListRspVO>builder()
                .current(page.getCurrent()).size(page.getSize()).total(page.getTotal()).records(records).build());
    }

    @Override
    public Response<FindAnniversaryDetailRspVO> findAnniversaryDetail(FindAnniversaryDetailReqVO reqVO) {
        return Response.success(toDetailVO(requireAnniversary(reqVO.getId())));
    }

    @Override
    public Response<Long> addAnniversary(AddAnniversaryReqVO reqVO) {
        LocalDateTime now = LocalDateTime.now();
        AnniversaryDO anniversary = AnniversaryDO.builder()
                .spaceId(requireCurrentSpaceId())
                .title(StrUtil.trim(reqVO.getTitle()))
                .description(StrUtil.nullToEmpty(StrUtil.trim(reqVO.getDescription())))
                .anniversaryDate(reqVO.getAnniversaryDate())
                .repeatType(reqVO.getRepeatType())
                .category(StrUtil.trim(reqVO.getCategory()))
                .colorCode(normalizeColor(reqVO.getColorCode()))
                .location(StrUtil.nullToEmpty(StrUtil.trim(reqVO.getLocation())))
                .sortOrder(reqVO.getSortOrder() == null ? 0 : reqVO.getSortOrder())
                .visibility(toVisibility(reqVO.getIsVisible() == null || reqVO.getIsVisible()))
                .createdBy(StpUtil.getLoginIdAsLong())
                .createTime(now)
                .updateTime(now)
                .isDeleted(false)
                .build();
        anniversaryMapper.insertAnniversary(anniversary);
        return Response.success(anniversary.getId());
    }

    @Override
    public Response<Void> updateAnniversary(UpdateAnniversaryReqVO reqVO) {
        AnniversaryDO current = requireAnniversary(reqVO.getId());
        current.setTitle(StrUtil.trim(reqVO.getTitle()));
        current.setDescription(StrUtil.nullToEmpty(StrUtil.trim(reqVO.getDescription())));
        current.setAnniversaryDate(reqVO.getAnniversaryDate());
        current.setRepeatType(reqVO.getRepeatType());
        current.setCategory(StrUtil.trim(reqVO.getCategory()));
        current.setColorCode(normalizeColor(reqVO.getColorCode()));
        current.setLocation(StrUtil.nullToEmpty(StrUtil.trim(reqVO.getLocation())));
        current.setSortOrder(reqVO.getSortOrder() == null ? 0 : reqVO.getSortOrder());
        if (reqVO.getIsVisible() != null) current.setVisibility(toVisibility(reqVO.getIsVisible()));
        current.setUpdateTime(LocalDateTime.now());
        anniversaryMapper.updateAnniversary(current);
        return Response.success();
    }

    @Override
    public Response<Void> updateVisibleStatus(UpdateAnniversaryVisibleStatusReqVO reqVO) {
        AnniversaryDO current = requireAnniversary(reqVO.getId());
        current.setVisibility(toVisibility(reqVO.getIsVisible()));
        current.setUpdateTime(LocalDateTime.now());
        anniversaryMapper.updateAnniversary(current);
        return Response.success();
    }

    @Override
    public Response<Void> deleteAnniversary(DeleteAnniversaryReqVO reqVO) {
        AnniversaryDO current = requireAnniversary(reqVO.getId());
        current.setIsDeleted(true);
        current.setVisibility(VISIBILITY_HIDDEN);
        current.setUpdateTime(LocalDateTime.now());
        anniversaryMapper.updateAnniversary(current);
        return Response.success();
    }

    private AnniversaryDO requireAnniversary(Long id) {
        AnniversaryDO anniversary = anniversaryMapper.selectById(id);
        if (anniversary == null || Boolean.TRUE.equals(anniversary.getIsDeleted())) {
            throw new BizException(ResponseCodeEnum.ANNIVERSARY_NOT_EXIST);
        }
        return anniversary;
    }

    private Long requireCurrentSpaceId() {
        List<CoupleMemberDO> memberships = coupleMemberMapper.selectActiveByUserId(StpUtil.getLoginIdAsLong());
        if (memberships == null || memberships.isEmpty()) {
            throw new BizException(ResponseCodeEnum.SPACE_NOT_EXIST);
        }
        return memberships.get(0).getSpaceId();
    }

    private String normalizeColor(String color) {
        return StrUtil.isBlank(color) ? DEFAULT_COLOR : color.trim().toLowerCase();
    }

    private Integer toVisibility(boolean isVisible) {
        return isVisible ? VISIBILITY_MEMBER : VISIBILITY_HIDDEN;
    }

    private Boolean toVisible(Integer visibility) {
        return visibility == null || visibility != VISIBILITY_HIDDEN;
    }

    private FindAnniversaryPageListRspVO toPageVO(AnniversaryDO item) {
        return FindAnniversaryPageListRspVO.builder().id(item.getId()).title(item.getTitle())
                .description(item.getDescription()).anniversaryDate(item.getAnniversaryDate())
                .repeatType(item.getRepeatType()).category(item.getCategory()).colorCode(item.getColorCode())
                .location(item.getLocation()).sortOrder(item.getSortOrder())
                .isVisible(toVisible(item.getVisibility()))
                .createTime(item.getCreateTime()).updateTime(item.getUpdateTime()).build();
    }

    private FindAnniversaryDetailRspVO toDetailVO(AnniversaryDO item) {
        return FindAnniversaryDetailRspVO.builder().id(item.getId()).title(item.getTitle())
                .description(item.getDescription()).anniversaryDate(item.getAnniversaryDate())
                .repeatType(item.getRepeatType()).category(item.getCategory()).colorCode(item.getColorCode())
                .location(item.getLocation()).sortOrder(item.getSortOrder())
                .isVisible(toVisible(item.getVisibility()))
                .createTime(item.getCreateTime()).updateTime(item.getUpdateTime()).build();
    }
}
