package com.chengliuxiang.amour.web.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.chengliuxiang.amour.common.constant.SpaceReviewConstants;
import com.chengliuxiang.amour.common.domain.dos.PhotoCategoryDO;
import com.chengliuxiang.amour.common.domain.dos.PhotoDO;
import com.chengliuxiang.amour.common.domain.mapper.PhotoCategoryMapper;
import com.chengliuxiang.amour.common.domain.mapper.PhotoMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoCategoryIdReqVO;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoCategorySaveReqVO;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoCategoryVO;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoIdReqVO;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoManageItemVO;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoManagePageQueryReqVO;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoSaveReqVO;
import com.chengliuxiang.amour.web.model.vo.space.SpaceContentSaveResultVO;
import com.chengliuxiang.amour.web.model.vo.space.SpaceItemReviewStateVO;
import com.chengliuxiang.amour.web.service.SpaceContentAccessService;
import com.chengliuxiang.amour.web.service.SpacePhotoManageService;
import com.chengliuxiang.amour.web.service.SpaceReviewService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class SpacePhotoManageServiceImpl implements SpacePhotoManageService {

    private static final long DEFAULT_PAGE_SIZE = 12L;
    private static final long MAX_PAGE_SIZE = 100L;

    private static final int VISIBILITY_MEMBER = 0;
    private static final int VISIBILITY_PUBLIC = 1;
    private static final int VISIBILITY_HIDDEN = 2;

    private static final Pattern SAFE_IMAGE_URL = Pattern.compile("^(https?://|/)[^\\s]*$",
            Pattern.CASE_INSENSITIVE);

    @Resource
    private SpaceContentAccessService spaceContentAccessService;

    @Resource
    private PhotoCategoryMapper photoCategoryMapper;

    @Resource
    private PhotoMapper photoMapper;

    @Resource
    private SpaceReviewService spaceReviewService;

    @Override
    public Response<List<PhotoCategoryVO>> listCategories() {
        Long spaceId = spaceContentAccessService.requireReadableSpaceId();
        List<PhotoCategoryVO> records = photoCategoryMapper.findAdminList(spaceId)
                .stream()
                .map(category -> PhotoCategoryVO.builder()
                        .id(category.getId())
                        .categoryName(category.getCategoryName())
                        .sortOrder(category.getSortOrder())
                        .isEnabled(category.getIsEnabled())
                        .remark(category.getRemark())
                        .build())
                .collect(Collectors.toList());
        return Response.success(records);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Long> saveCategory(PhotoCategorySaveReqVO reqVO) {
        SpaceContentAccessService.SpaceAccess access = spaceContentAccessService.requireEditable();
        Long spaceId = access.getSpaceId();

        String categoryName = StrUtil.trim(reqVO.getCategoryName());
        if (StrUtil.isBlank(categoryName) || categoryName.length() > 50) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        Long duplicate = photoCategoryMapper.countByName(spaceId, categoryName, reqVO.getId());
        if (duplicate != null && duplicate > 0) {
            throw new BizException(ResponseCodeEnum.PHOTO_CATEGORY_DUPLICATE);
        }

        LocalDateTime now = LocalDateTime.now();
        if (reqVO.getId() == null) {
            PhotoCategoryDO lastCategory = photoCategoryMapper.findLastBySortOrder(spaceId);
            int sortOrder = reqVO.getSortOrder() == null
                    ? (lastCategory == null || lastCategory.getSortOrder() == null
                    ? 10 : lastCategory.getSortOrder() + 10)
                    : reqVO.getSortOrder();
            PhotoCategoryDO category = PhotoCategoryDO.builder()
                    .spaceId(spaceId)
                    .categoryName(categoryName)
                    .sortOrder(sortOrder)
                    .isEnabled(reqVO.getIsEnabled() == null || reqVO.getIsEnabled())
                    .remark(StrUtil.nullToEmpty(StrUtil.trim(reqVO.getRemark())))
                    .createdBy(access.getUserId())
                    .createTime(now)
                    .updateTime(now)
                    .build();
            photoCategoryMapper.saveAdminCategory(category);
            return Response.success(category.getId());
        }

        PhotoCategoryDO current = requireCategory(spaceId, reqVO.getId());
        current.setCategoryName(categoryName);
        if (reqVO.getSortOrder() != null) {
            current.setSortOrder(reqVO.getSortOrder());
        }
        if (reqVO.getIsEnabled() != null) {
            current.setIsEnabled(reqVO.getIsEnabled());
        }
        if (reqVO.getRemark() != null) {
            current.setRemark(StrUtil.trim(reqVO.getRemark()));
        }
        current.setUpdateTime(now);
        int updated = photoCategoryMapper.modifyAdminCategory(current);
        if (updated == 0) {
            throw new BizException(ResponseCodeEnum.PHOTO_CATEGORY_NOT_EXIST);
        }
        return Response.success(current.getId());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Void> deleteCategory(PhotoCategoryIdReqVO reqVO) {
        Long spaceId = spaceContentAccessService.requireEditableSpaceId();
        PhotoCategoryDO category = requireCategory(spaceId, reqVO.getId());
        Long photoCount = photoMapper.countActiveByCategoryId(spaceId, category.getId());
        if (photoCount != null && photoCount > 0) {
            throw new BizException(ResponseCodeEnum.PHOTO_CATEGORY_IN_USE);
        }
        int deleted = photoCategoryMapper.removeAdminCategory(spaceId, category.getId());
        if (deleted == 0) {
            throw new BizException(ResponseCodeEnum.PHOTO_CATEGORY_NOT_EXIST);
        }
        return Response.success();
    }

    @Override
    public Response<PageResult<PhotoManageItemVO>> pagePhotos(PhotoManagePageQueryReqVO reqVO) {
        Long spaceId = spaceContentAccessService.requireReadableSpaceId();
        long current = reqVO.getCurrent() == null || reqVO.getCurrent() < 1 ? 1L : reqVO.getCurrent();
        long size = reqVO.getSize() == null || reqVO.getSize() < 1
                ? DEFAULT_PAGE_SIZE : Math.min(reqVO.getSize(), MAX_PAGE_SIZE);

        IPage<PhotoDO> page = photoMapper.selectManagePage(current, size, spaceId, reqVO.getPhotoCategoryId());
        Map<Long, PhotoCategoryDO> categoryMap = loadCategoryMap(spaceId, page.getRecords());
        Map<String, SpaceItemReviewStateVO> reviewStates = spaceReviewService.loadItemReviewStates(spaceId);
        List<PhotoManageItemVO> records = page.getRecords().stream()
                .map(photo -> {
                    PhotoCategoryDO category = categoryMap.get(photo.getPhotoCategoryId());
                    SpaceItemReviewStateVO reviewState = reviewStates.get(
                            SpaceReviewConstants.ITEM_TYPE_PHOTO + ":" + photo.getId());
                    return PhotoManageItemVO.builder()
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
                            .visibility(photo.getVisibility())
                            .reviewStatus(reviewState == null ? null : reviewState.getReviewStatus())
                            .reviewRejectReason(reviewState == null
                                    ? null : reviewState.getReviewRejectReason())
                            .reviewHandledAt(reviewState == null
                                    ? null : reviewState.getReviewHandledAt())
                            .reviewHasPublishedVersion(reviewState == null
                                    ? null : reviewState.getHasPublishedVersion())
                            .createTime(photo.getCreateTime())
                            .updateTime(photo.getUpdateTime())
                            .build();
                })
                .collect(Collectors.toList());
        return Response.success(PageResult.<PhotoManageItemVO>builder()
                .current(page.getCurrent())
                .size(page.getSize())
                .total(page.getTotal())
                .records(records)
                .build());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<SpaceContentSaveResultVO> savePhoto(PhotoSaveReqVO reqVO) {
        SpaceContentAccessService.SpaceAccess access = spaceContentAccessService.requireEditable();
        Long spaceId = access.getSpaceId();
        spaceReviewService.prepareForPublicEdit(spaceId);
        if (reqVO.getPhotoCategoryId() == null) {
            throw new BizException(ResponseCodeEnum.PHOTO_CATEGORY_NOT_EXIST);
        }
        requireCategory(spaceId, reqVO.getPhotoCategoryId());

        String url = StrUtil.trim(reqVO.getUrl());
        if (StrUtil.isBlank(url) || url.length() > 500 || !SAFE_IMAGE_URL.matcher(url).matches()) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        Integer visibility = resolveVisibility(reqVO.getVisibility(), access);
        boolean isCover = Boolean.TRUE.equals(reqVO.getIsCover());
        if (isCover && visibility == VISIBILITY_HIDDEN) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }

        LocalDateTime now = LocalDateTime.now();
        if (reqVO.getId() == null) {
            if (isCover) {
                photoMapper.clearOtherCovers(spaceId, null, now);
            }
            PhotoDO photo = PhotoDO.builder()
                    .spaceId(spaceId)
                    .photoCategoryId(reqVO.getPhotoCategoryId())
                    .title(StrUtil.nullToEmpty(StrUtil.trim(reqVO.getTitle())))
                    .description(StrUtil.nullToEmpty(StrUtil.trim(reqVO.getDescription())))
                    .url(url)
                    .takenTime(reqVO.getTakenTime())
                    .location(StrUtil.nullToEmpty(StrUtil.trim(reqVO.getLocation())))
                    .sortOrder(reqVO.getSortOrder() == null ? 0 : reqVO.getSortOrder())
                    .isCover(isCover)
                    .visibility(visibility)
                    .isDeleted(false)
                    .createdBy(access.getUserId())
                    .updatedBy(access.getUserId())
                    .revision(1)
                    .createTime(now)
                    .updateTime(now)
                    .build();
            photoMapper.saveAdminPhoto(photo);
            return Response.success(spaceReviewService.onContentSaved(
                    spaceId, access.getUserId(), SpaceReviewConstants.ITEM_TYPE_PHOTO, photo.getId(), false));
        }

        PhotoDO current = requirePhoto(spaceId, reqVO.getId());
        if (isCover) {
            photoMapper.clearOtherCovers(spaceId, current.getId(), now);
        }
        int updated = photoMapper.modifyPhoto(spaceId, current.getId(),
                StrUtil.nullToEmpty(StrUtil.trim(reqVO.getTitle())),
                StrUtil.nullToEmpty(StrUtil.trim(reqVO.getDescription())),
                reqVO.getPhotoCategoryId(), url, reqVO.getTakenTime(),
                StrUtil.nullToEmpty(StrUtil.trim(reqVO.getLocation())),
                reqVO.getSortOrder() == null
                        ? (current.getSortOrder() == null ? 0 : current.getSortOrder())
                        : reqVO.getSortOrder(),
                isCover, visibility, now);
        if (updated == 0) {
            throw new BizException(ResponseCodeEnum.PHOTO_NOT_EXIST);
        }
        return Response.success(spaceReviewService.onContentSaved(
                spaceId, access.getUserId(), SpaceReviewConstants.ITEM_TYPE_PHOTO, current.getId(), false));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Void> deletePhoto(PhotoIdReqVO reqVO) {
        SpaceContentAccessService.SpaceAccess access = spaceContentAccessService.requireEditable();
        Long spaceId = access.getSpaceId();
        spaceReviewService.prepareForPublicEdit(spaceId);
        requirePhoto(spaceId, reqVO.getId());
        int deleted = photoMapper.markDeletedById(spaceId, reqVO.getId(), LocalDateTime.now());
        if (deleted == 0) {
            throw new BizException(ResponseCodeEnum.PHOTO_NOT_EXIST);
        }
        spaceReviewService.onContentSaved(spaceId, access.getUserId(),
                SpaceReviewConstants.ITEM_TYPE_PHOTO, reqVO.getId(), true);
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

    private Map<Long, PhotoCategoryDO> loadCategoryMap(Long spaceId, List<PhotoDO> photos) {
        List<Long> categoryIds = photos.stream()
                .map(PhotoDO::getPhotoCategoryId)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
        if (categoryIds.isEmpty()) {
            return Collections.emptyMap();
        }
        return photoCategoryMapper.findByIds(spaceId, categoryIds).stream()
                .collect(Collectors.toMap(PhotoCategoryDO::getId, Function.identity(), (left, right) -> left));
    }

    private PhotoCategoryDO requireCategory(Long spaceId, Long categoryId) {
        PhotoCategoryDO category = photoCategoryMapper.findCategoryById(spaceId, categoryId);
        if (category == null) {
            throw new BizException(ResponseCodeEnum.PHOTO_CATEGORY_NOT_EXIST);
        }
        return category;
    }

    private PhotoDO requirePhoto(Long spaceId, Long photoId) {
        PhotoDO photo = photoMapper.findActiveById(spaceId, photoId);
        if (photo == null) {
            throw new BizException(ResponseCodeEnum.PHOTO_NOT_EXIST);
        }
        return photo;
    }
}
