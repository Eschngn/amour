package com.chengliuxiang.amour.admin.service.impl;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.chengliuxiang.amour.admin.model.vo.photo.AddPhotoReqVO;
import com.chengliuxiang.amour.admin.model.vo.photo.DeletePhotoCategoryReqVO;
import com.chengliuxiang.amour.admin.model.vo.photo.DeletePhotoReqVO;
import com.chengliuxiang.amour.admin.model.vo.photo.FindPhotoPageListReqVO;
import com.chengliuxiang.amour.admin.model.vo.photo.FindPhotoPageListRspVO;
import com.chengliuxiang.amour.admin.model.vo.photo.PhotoCategoryListRspVO;
import com.chengliuxiang.amour.admin.model.vo.photo.SavePhotoCategoryReqVO;
import com.chengliuxiang.amour.admin.model.vo.photo.UpdatePhotoReqVO;
import com.chengliuxiang.amour.admin.model.vo.photo.UpdatePhotoVisibleStatusReqVO;
import com.chengliuxiang.amour.admin.service.AdminPhotoService;
import com.chengliuxiang.amour.common.domain.dos.CoupleMemberDO;
import com.chengliuxiang.amour.common.domain.dos.PhotoCategoryDO;
import com.chengliuxiang.amour.common.domain.dos.PhotoDO;
import com.chengliuxiang.amour.common.domain.mapper.CoupleMemberMapper;
import com.chengliuxiang.amour.common.domain.mapper.PhotoCategoryMapper;
import com.chengliuxiang.amour.common.domain.mapper.PhotoMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class AdminPhotoServiceImpl implements AdminPhotoService {

    private static final long DEFAULT_PAGE_SIZE = 12L;
    private static final long MAX_PAGE_SIZE = 100L;
    private static final int VISIBILITY_MEMBER = 0;
    private static final int VISIBILITY_HIDDEN = 2;

    @Resource
    private PhotoMapper photoMapper;

    @Resource
    private PhotoCategoryMapper photoCategoryMapper;

    @Resource
    private CoupleMemberMapper coupleMemberMapper;

    @Override
    public Response<PageResult<FindPhotoPageListRspVO>> findPhotoPageList(FindPhotoPageListReqVO reqVO) {
        long current = normalizePositive(reqVO.getCurrent(), 1L);
        long size = Math.min(normalizePositive(reqVO.getSize(), DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);

        Long categoryId = reqVO.getPhotoCategoryId();
        Boolean isVisible = reqVO.getIsVisible();
        IPage<PhotoDO> result = photoMapper.selectPage(new Page<>(current, size),
                new LambdaQueryWrapper<PhotoDO>()
                        .eq(PhotoDO::getIsDeleted, false)
                        .like(StrUtil.isNotBlank(reqVO.getTitle()), PhotoDO::getTitle, StrUtil.trim(reqVO.getTitle()))
                        .eq(categoryId != null, PhotoDO::getPhotoCategoryId, categoryId)
                        .ne(isVisible != null && isVisible, PhotoDO::getVisibility, VISIBILITY_HIDDEN)
                        .eq(isVisible != null && !isVisible, PhotoDO::getVisibility, VISIBILITY_HIDDEN)
                        .orderByAsc(PhotoDO::getSortOrder)
                        .orderByDesc(PhotoDO::getTakenTime)
                        .orderByDesc(PhotoDO::getId));
        Map<Long, PhotoCategoryDO> categoryMap = loadCategoryMap(result.getRecords());
        List<FindPhotoPageListRspVO> records = result.getRecords().stream()
                .map(photo -> toPageItem(photo, categoryMap))
                .collect(Collectors.toList());

        return Response.success(PageResult.<FindPhotoPageListRspVO>builder()
                .current(result.getCurrent())
                .size(result.getSize())
                .total(result.getTotal())
                .records(records)
                .build());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Long> addPhoto(AddPhotoReqVO reqVO) {
        PhotoCategoryDO category = requirePhotoCategory(reqVO.getPhotoCategoryId());
        LocalDateTime now = LocalDateTime.now();
        boolean isCover = Boolean.TRUE.equals(reqVO.getIsCover());
        boolean isVisible = isCover || reqVO.getIsVisible() == null || reqVO.getIsVisible();
        if (isCover) {
            clearOtherCovers(category.getSpaceId(), null, now);
        }

        PhotoDO photo = PhotoDO.builder()
                .spaceId(category.getSpaceId())
                .title(StrUtil.trim(reqVO.getTitle()))
                .description(StrUtil.nullToEmpty(StrUtil.trim(reqVO.getDescription())))
                .photoCategoryId(reqVO.getPhotoCategoryId())
                .url(StrUtil.trim(reqVO.getUrl()))
                .takenTime(reqVO.getTakenTime())
                .location(StrUtil.nullToEmpty(StrUtil.trim(reqVO.getLocation())))
                .sortOrder(reqVO.getSortOrder() == null ? 0 : reqVO.getSortOrder())
                .isCover(isCover)
                .visibility(toVisibility(isVisible))
                .createdBy(StpUtil.getLoginIdAsLong())
                .createTime(now)
                .updateTime(now)
                .isDeleted(false)
                .build();
        photoMapper.saveAdminPhoto(photo);
        return Response.success(photo.getId());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Void> updatePhoto(UpdatePhotoReqVO reqVO) {
        PhotoDO current = requirePhoto(reqVO.getId());
        requirePhotoCategory(reqVO.getPhotoCategoryId());
        LocalDateTime now = LocalDateTime.now();
        boolean isCover = Boolean.TRUE.equals(reqVO.getIsCover());
        boolean isVisible = isCover || reqVO.getIsVisible() == null || reqVO.getIsVisible();
        if (isCover) {
            clearOtherCovers(current.getSpaceId(), reqVO.getId(), now);
        }

        photoMapper.modifyPhoto(current.getSpaceId(), reqVO.getId(), StrUtil.trim(reqVO.getTitle()),
                StrUtil.nullToEmpty(StrUtil.trim(reqVO.getDescription())), reqVO.getPhotoCategoryId(),
                StrUtil.trim(reqVO.getUrl()), reqVO.getTakenTime(),
                StrUtil.nullToEmpty(StrUtil.trim(reqVO.getLocation())),
                reqVO.getSortOrder() == null ? 0 : reqVO.getSortOrder(), isCover, toVisibility(isVisible), now);
        return Response.success();
    }

    @Override
    public Response<Void> updateVisibleStatus(UpdatePhotoVisibleStatusReqVO reqVO) {
        PhotoDO current = requirePhoto(reqVO.getId());
        photoMapper.modifyVisibility(current.getSpaceId(), reqVO.getId(),
                toVisibility(reqVO.getIsVisible()), LocalDateTime.now());
        return Response.success();
    }

    @Override
    public Response<Void> deletePhoto(DeletePhotoReqVO reqVO) {
        PhotoDO current = requirePhoto(reqVO.getId());
        photoMapper.markDeletedById(current.getSpaceId(), reqVO.getId(), LocalDateTime.now());
        return Response.success();
    }

    @Override
    public Response<List<PhotoCategoryListRspVO>> listPhotoCategories() {
        List<PhotoCategoryListRspVO> categories = photoCategoryMapper.findAdminList(null)
                .stream()
                .map(category -> PhotoCategoryListRspVO.builder()
                        .id(category.getId())
                        .categoryName(category.getCategoryName())
                        .sortOrder(category.getSortOrder())
                        .isEnabled(category.getIsEnabled())
                        .build())
                .collect(Collectors.toList());
        return Response.success(categories);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Long> savePhotoCategory(SavePhotoCategoryReqVO reqVO) {
        String categoryName = StrUtil.trim(reqVO.getCategoryName());
        PhotoCategoryDO current = reqVO.getId() == null ? null : requirePhotoCategory(reqVO.getId());
        Long spaceId = current != null ? current.getSpaceId() : requireCurrentSpaceId();
        Long duplicateCount = photoCategoryMapper.countByName(spaceId, categoryName, reqVO.getId());
        if (duplicateCount != null && duplicateCount > 0) {
            throw new BizException(ResponseCodeEnum.PHOTO_CATEGORY_DUPLICATE);
        }

        LocalDateTime now = LocalDateTime.now();
        if (current == null) {
            PhotoCategoryDO lastCategory = photoCategoryMapper.findLastBySortOrder(spaceId);
            int sortOrder = lastCategory == null || lastCategory.getSortOrder() == null
                    ? 10 : lastCategory.getSortOrder() + 10;
            PhotoCategoryDO category = PhotoCategoryDO.builder()
                    .spaceId(spaceId)
                    .categoryName(categoryName)
                    .sortOrder(sortOrder)
                    .isEnabled(reqVO.getIsEnabled() == null || reqVO.getIsEnabled())
                    .remark("")
                    .createdBy(StpUtil.getLoginIdAsLong())
                    .createTime(now)
                    .updateTime(now)
                    .build();
            photoCategoryMapper.saveAdminCategory(category);
            return Response.success(category.getId());
        }

        current.setCategoryName(categoryName);
        if (reqVO.getIsEnabled() != null) {
            current.setIsEnabled(reqVO.getIsEnabled());
        }
        current.setUpdateTime(now);
        photoCategoryMapper.modifyAdminCategory(current);
        return Response.success(current.getId());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Void> deletePhotoCategory(DeletePhotoCategoryReqVO reqVO) {
        PhotoCategoryDO category = requirePhotoCategory(reqVO.getId());
        Long photoCount = photoMapper.countActiveByCategoryId(category.getSpaceId(), reqVO.getId());
        if (photoCount != null && photoCount > 0) {
            throw new BizException(ResponseCodeEnum.PHOTO_CATEGORY_IN_USE);
        }
        photoCategoryMapper.removeAdminCategory(category.getSpaceId(), reqVO.getId());
        return Response.success();
    }

    private PhotoDO requirePhoto(Long id) {
        PhotoDO photo = photoMapper.selectById(id);
        if (photo == null || Boolean.TRUE.equals(photo.getIsDeleted())) {
            throw new BizException(ResponseCodeEnum.PHOTO_NOT_EXIST);
        }
        return photo;
    }

    private PhotoCategoryDO requirePhotoCategory(Long id) {
        PhotoCategoryDO category = photoCategoryMapper.selectById(id);
        if (category == null) {
            throw new BizException(ResponseCodeEnum.PHOTO_CATEGORY_NOT_EXIST);
        }
        return category;
    }

    private void clearOtherCovers(Long spaceId, Long excludedId, LocalDateTime updateTime) {
        photoMapper.clearOtherCovers(spaceId, excludedId, updateTime);
    }

    private Map<Long, PhotoCategoryDO> loadCategoryMap(List<PhotoDO> photos) {
        List<Long> categoryIds = photos.stream()
                .map(PhotoDO::getPhotoCategoryId)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
        if (categoryIds.isEmpty()) {
            return Collections.emptyMap();
        }
        return photoCategoryMapper.selectBatchIds(categoryIds).stream()
                .collect(Collectors.toMap(PhotoCategoryDO::getId, Function.identity()));
    }

    private FindPhotoPageListRspVO toPageItem(PhotoDO photo, Map<Long, PhotoCategoryDO> categoryMap) {
        PhotoCategoryDO category = categoryMap.get(photo.getPhotoCategoryId());
        return FindPhotoPageListRspVO.builder()
                .id(photo.getId())
                .title(photo.getTitle())
                .description(photo.getDescription())
                .photoCategoryId(photo.getPhotoCategoryId())
                .categoryName(category == null ? "未分类" : category.getCategoryName())
                .url(photo.getUrl())
                .takenTime(photo.getTakenTime())
                .location(photo.getLocation())
                .sortOrder(photo.getSortOrder())
                .isCover(photo.getIsCover())
                .isVisible(toVisible(photo.getVisibility()))
                .createTime(photo.getCreateTime())
                .updateTime(photo.getUpdateTime())
                .build();
    }

    private Long requireCurrentSpaceId() {
        List<CoupleMemberDO> memberships = coupleMemberMapper.selectActiveByUserId(StpUtil.getLoginIdAsLong());
        if (memberships == null || memberships.isEmpty()) {
            throw new BizException(ResponseCodeEnum.SPACE_NOT_EXIST);
        }
        return memberships.get(0).getSpaceId();
    }

    private Integer toVisibility(boolean isVisible) {
        return isVisible ? VISIBILITY_MEMBER : VISIBILITY_HIDDEN;
    }

    private Boolean toVisible(Integer visibility) {
        return visibility == null || visibility != VISIBILITY_HIDDEN;
    }

    private long normalizePositive(Long value, long defaultValue) {
        return value == null || value <= 0 ? defaultValue : value;
    }
}
