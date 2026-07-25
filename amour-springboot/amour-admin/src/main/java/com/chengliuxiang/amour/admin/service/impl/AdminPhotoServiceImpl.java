package com.chengliuxiang.amour.admin.service.impl;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
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
import com.chengliuxiang.amour.common.domain.dos.PhotoCategoryDO;
import com.chengliuxiang.amour.common.domain.dos.PhotoDO;
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

    @Resource
    private PhotoMapper photoMapper;

    @Resource
    private PhotoCategoryMapper photoCategoryMapper;

    @Override
    public Response<PageResult<FindPhotoPageListRspVO>> findPhotoPageList(FindPhotoPageListReqVO reqVO) {
        long current = normalizePositive(reqVO.getCurrent(), 1L);
        long size = Math.min(normalizePositive(reqVO.getSize(), DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);

        LambdaQueryWrapper<PhotoDO> wrapper = new LambdaQueryWrapper<PhotoDO>()
                .eq(PhotoDO::getIsDeleted, false)
                .like(StrUtil.isNotBlank(reqVO.getTitle()), PhotoDO::getTitle, StrUtil.trim(reqVO.getTitle()))
                .eq(reqVO.getPhotoCategoryId() != null, PhotoDO::getPhotoCategoryId, reqVO.getPhotoCategoryId())
                .eq(reqVO.getIsVisible() != null, PhotoDO::getIsVisible, reqVO.getIsVisible())
                .orderByAsc(PhotoDO::getSortOrder)
                .orderByDesc(PhotoDO::getTakenTime)
                .orderByDesc(PhotoDO::getId);

        IPage<PhotoDO> result = photoMapper.selectPage(new Page<>(current, size), wrapper);
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
        requirePhotoCategory(reqVO.getPhotoCategoryId());
        LocalDateTime now = LocalDateTime.now();
        boolean isCover = Boolean.TRUE.equals(reqVO.getIsCover());
        boolean isVisible = isCover || reqVO.getIsVisible() == null || reqVO.getIsVisible();
        if (isCover) {
            clearOtherCovers(null, now);
        }

        PhotoDO photo = PhotoDO.builder()
                .title(StrUtil.trim(reqVO.getTitle()))
                .description(StrUtil.nullToEmpty(StrUtil.trim(reqVO.getDescription())))
                .photoCategoryId(reqVO.getPhotoCategoryId())
                .url(StrUtil.trim(reqVO.getUrl()))
                .takenTime(reqVO.getTakenTime())
                .location(StrUtil.nullToEmpty(StrUtil.trim(reqVO.getLocation())))
                .sortOrder(reqVO.getSortOrder() == null ? 0 : reqVO.getSortOrder())
                .isCover(isCover)
                .isVisible(isVisible)
                .createdBy(StpUtil.getLoginIdAsLong())
                .createTime(now)
                .updateTime(now)
                .isDeleted(false)
                .build();
        photoMapper.insert(photo);
        return Response.success(photo.getId());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Void> updatePhoto(UpdatePhotoReqVO reqVO) {
        requirePhoto(reqVO.getId());
        requirePhotoCategory(reqVO.getPhotoCategoryId());
        LocalDateTime now = LocalDateTime.now();
        boolean isCover = Boolean.TRUE.equals(reqVO.getIsCover());
        boolean isVisible = isCover || reqVO.getIsVisible() == null || reqVO.getIsVisible();
        if (isCover) {
            clearOtherCovers(reqVO.getId(), now);
        }

        LambdaUpdateWrapper<PhotoDO> wrapper = new LambdaUpdateWrapper<PhotoDO>()
                .eq(PhotoDO::getId, reqVO.getId())
                .eq(PhotoDO::getIsDeleted, false)
                .set(PhotoDO::getTitle, StrUtil.trim(reqVO.getTitle()))
                .set(PhotoDO::getDescription, StrUtil.nullToEmpty(StrUtil.trim(reqVO.getDescription())))
                .set(PhotoDO::getPhotoCategoryId, reqVO.getPhotoCategoryId())
                .set(PhotoDO::getUrl, StrUtil.trim(reqVO.getUrl()))
                .set(PhotoDO::getTakenTime, reqVO.getTakenTime())
                .set(PhotoDO::getLocation, StrUtil.nullToEmpty(StrUtil.trim(reqVO.getLocation())))
                .set(PhotoDO::getSortOrder, reqVO.getSortOrder() == null ? 0 : reqVO.getSortOrder())
                .set(PhotoDO::getIsCover, isCover)
                .set(PhotoDO::getIsVisible, isVisible)
                .set(PhotoDO::getUpdateTime, now);
        photoMapper.update(null, wrapper);
        return Response.success();
    }

    @Override
    public Response<Void> updateVisibleStatus(UpdatePhotoVisibleStatusReqVO reqVO) {
        requirePhoto(reqVO.getId());
        LambdaUpdateWrapper<PhotoDO> wrapper = new LambdaUpdateWrapper<PhotoDO>()
                .eq(PhotoDO::getId, reqVO.getId())
                .eq(PhotoDO::getIsDeleted, false)
                .set(PhotoDO::getIsVisible, reqVO.getIsVisible())
                .set(!reqVO.getIsVisible(), PhotoDO::getIsCover, false)
                .set(PhotoDO::getUpdateTime, LocalDateTime.now());
        photoMapper.update(null, wrapper);
        return Response.success();
    }

    @Override
    public Response<Void> deletePhoto(DeletePhotoReqVO reqVO) {
        requirePhoto(reqVO.getId());
        PhotoDO photo = PhotoDO.builder()
                .id(reqVO.getId())
                .isDeleted(true)
                .isCover(false)
                .updateTime(LocalDateTime.now())
                .build();
        photoMapper.updateById(photo);
        return Response.success();
    }

    @Override
    public Response<List<PhotoCategoryListRspVO>> listPhotoCategories() {
        List<PhotoCategoryListRspVO> categories = photoCategoryMapper.selectList(
                        new LambdaQueryWrapper<PhotoCategoryDO>()
                                .orderByAsc(PhotoCategoryDO::getSortOrder)
                                .orderByAsc(PhotoCategoryDO::getId))
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
        Long duplicateCount = photoCategoryMapper.selectCount(new LambdaQueryWrapper<PhotoCategoryDO>()
                .eq(PhotoCategoryDO::getCategoryName, categoryName)
                .ne(reqVO.getId() != null, PhotoCategoryDO::getId, reqVO.getId()));
        if (duplicateCount != null && duplicateCount > 0) {
            throw new BizException(ResponseCodeEnum.PHOTO_CATEGORY_DUPLICATE);
        }

        LocalDateTime now = LocalDateTime.now();
        if (reqVO.getId() == null) {
            PhotoCategoryDO lastCategory = photoCategoryMapper.selectOne(new LambdaQueryWrapper<PhotoCategoryDO>()
                    .orderByDesc(PhotoCategoryDO::getSortOrder)
                    .orderByDesc(PhotoCategoryDO::getId)
                    .last("LIMIT 1"));
            int sortOrder = lastCategory == null || lastCategory.getSortOrder() == null
                    ? 10 : lastCategory.getSortOrder() + 10;
            PhotoCategoryDO category = PhotoCategoryDO.builder()
                    .categoryName(categoryName)
                    .sortOrder(sortOrder)
                    .isEnabled(reqVO.getIsEnabled() == null || reqVO.getIsEnabled())
                    .remark("")
                    .createdBy(StpUtil.getLoginIdAsLong())
                    .createTime(now)
                    .updateTime(now)
                    .build();
            photoCategoryMapper.insert(category);
            return Response.success(category.getId());
        }

        PhotoCategoryDO category = requirePhotoCategory(reqVO.getId());
        category.setCategoryName(categoryName);
        if (reqVO.getIsEnabled() != null) {
            category.setIsEnabled(reqVO.getIsEnabled());
        }
        category.setUpdateTime(now);
        photoCategoryMapper.updateById(category);
        return Response.success(category.getId());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Void> deletePhotoCategory(DeletePhotoCategoryReqVO reqVO) {
        requirePhotoCategory(reqVO.getId());
        Long photoCount = photoMapper.selectCount(new LambdaQueryWrapper<PhotoDO>()
                .eq(PhotoDO::getPhotoCategoryId, reqVO.getId())
                .eq(PhotoDO::getIsDeleted, false));
        if (photoCount != null && photoCount > 0) {
            throw new BizException(ResponseCodeEnum.PHOTO_CATEGORY_IN_USE);
        }
        photoCategoryMapper.deleteById(reqVO.getId());
        return Response.success();
    }

    private PhotoDO requirePhoto(Long id) {
        PhotoDO photo = photoMapper.selectOne(new LambdaQueryWrapper<PhotoDO>()
                .eq(PhotoDO::getId, id)
                .eq(PhotoDO::getIsDeleted, false));
        if (photo == null) {
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

    private void clearOtherCovers(Long excludedId, LocalDateTime updateTime) {
        LambdaUpdateWrapper<PhotoDO> wrapper = new LambdaUpdateWrapper<PhotoDO>()
                .eq(PhotoDO::getIsDeleted, false)
                .eq(PhotoDO::getIsCover, true)
                .ne(excludedId != null, PhotoDO::getId, excludedId)
                .set(PhotoDO::getIsCover, false)
                .set(PhotoDO::getUpdateTime, updateTime);
        photoMapper.update(null, wrapper);
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
                .isVisible(photo.getIsVisible())
                .createTime(photo.getCreateTime())
                .updateTime(photo.getUpdateTime())
                .build();
    }

    private long normalizePositive(Long value, long defaultValue) {
        return value == null || value <= 0 ? defaultValue : value;
    }
}
