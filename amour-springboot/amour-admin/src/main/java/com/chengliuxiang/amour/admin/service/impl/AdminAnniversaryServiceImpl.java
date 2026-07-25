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
import com.chengliuxiang.amour.common.domain.mapper.AnniversaryMapper;
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

    @Resource
    private AnniversaryMapper anniversaryMapper;

    @Override
    public Response<PageResult<FindAnniversaryPageListRspVO>> findAnniversaryPageList(FindAnniversaryPageListReqVO reqVO) {
        long current = reqVO.getCurrent() == null || reqVO.getCurrent() < 1 ? 1 : reqVO.getCurrent();
        long size = reqVO.getSize() == null || reqVO.getSize() < 1 ? DEFAULT_PAGE_SIZE : Math.min(reqVO.getSize(), MAX_PAGE_SIZE);
        LambdaQueryWrapper<AnniversaryDO> wrapper = new LambdaQueryWrapper<AnniversaryDO>()
                .eq(AnniversaryDO::getIsDeleted, false)
                .like(StrUtil.isNotBlank(reqVO.getTitle()), AnniversaryDO::getTitle, StrUtil.trim(reqVO.getTitle()))
                .eq(StrUtil.isNotBlank(reqVO.getCategory()), AnniversaryDO::getCategory, StrUtil.trim(reqVO.getCategory()))
                .eq(reqVO.getRepeatType() != null, AnniversaryDO::getRepeatType, reqVO.getRepeatType())
                .eq(reqVO.getIsVisible() != null, AnniversaryDO::getIsVisible, reqVO.getIsVisible())
                .orderByAsc(AnniversaryDO::getSortOrder)
                .orderByAsc(AnniversaryDO::getAnniversaryDate)
                .orderByDesc(AnniversaryDO::getId);
        IPage<AnniversaryDO> page = anniversaryMapper.selectPage(new Page<>(current, size), wrapper);
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
                .title(StrUtil.trim(reqVO.getTitle()))
                .description(StrUtil.nullToEmpty(StrUtil.trim(reqVO.getDescription())))
                .anniversaryDate(reqVO.getAnniversaryDate())
                .repeatType(reqVO.getRepeatType())
                .category(StrUtil.trim(reqVO.getCategory()))
                .colorCode(normalizeColor(reqVO.getColorCode()))
                .location(StrUtil.nullToEmpty(StrUtil.trim(reqVO.getLocation())))
                .sortOrder(reqVO.getSortOrder() == null ? 0 : reqVO.getSortOrder())
                .isVisible(reqVO.getIsVisible() == null || reqVO.getIsVisible())
                .createdBy(StpUtil.getLoginIdAsLong())
                .createTime(now)
                .updateTime(now)
                .isDeleted(false)
                .build();
        anniversaryMapper.insert(anniversary);
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
        if (reqVO.getIsVisible() != null) current.setIsVisible(reqVO.getIsVisible());
        current.setUpdateTime(LocalDateTime.now());
        anniversaryMapper.updateById(current);
        return Response.success();
    }

    @Override
    public Response<Void> updateVisibleStatus(UpdateAnniversaryVisibleStatusReqVO reqVO) {
        AnniversaryDO current = requireAnniversary(reqVO.getId());
        current.setIsVisible(reqVO.getIsVisible());
        current.setUpdateTime(LocalDateTime.now());
        anniversaryMapper.updateById(current);
        return Response.success();
    }

    @Override
    public Response<Void> deleteAnniversary(DeleteAnniversaryReqVO reqVO) {
        AnniversaryDO current = requireAnniversary(reqVO.getId());
        current.setIsDeleted(true);
        current.setIsVisible(false);
        current.setUpdateTime(LocalDateTime.now());
        anniversaryMapper.updateById(current);
        return Response.success();
    }

    private AnniversaryDO requireAnniversary(Long id) {
        AnniversaryDO anniversary = anniversaryMapper.selectOne(new LambdaQueryWrapper<AnniversaryDO>()
                .eq(AnniversaryDO::getId, id)
                .eq(AnniversaryDO::getIsDeleted, false));
        if (anniversary == null) throw new BizException(ResponseCodeEnum.ANNIVERSARY_NOT_EXIST);
        return anniversary;
    }

    private String normalizeColor(String color) {
        return StrUtil.isBlank(color) ? DEFAULT_COLOR : color.trim().toLowerCase();
    }

    private FindAnniversaryPageListRspVO toPageVO(AnniversaryDO item) {
        return FindAnniversaryPageListRspVO.builder().id(item.getId()).title(item.getTitle())
                .description(item.getDescription()).anniversaryDate(item.getAnniversaryDate())
                .repeatType(item.getRepeatType()).category(item.getCategory()).colorCode(item.getColorCode())
                .location(item.getLocation()).sortOrder(item.getSortOrder()).isVisible(item.getIsVisible())
                .createTime(item.getCreateTime()).updateTime(item.getUpdateTime()).build();
    }

    private FindAnniversaryDetailRspVO toDetailVO(AnniversaryDO item) {
        return FindAnniversaryDetailRspVO.builder().id(item.getId()).title(item.getTitle())
                .description(item.getDescription()).anniversaryDate(item.getAnniversaryDate())
                .repeatType(item.getRepeatType()).category(item.getCategory()).colorCode(item.getColorCode())
                .location(item.getLocation()).sortOrder(item.getSortOrder()).isVisible(item.getIsVisible())
                .createTime(item.getCreateTime()).updateTime(item.getUpdateTime()).build();
    }
}
