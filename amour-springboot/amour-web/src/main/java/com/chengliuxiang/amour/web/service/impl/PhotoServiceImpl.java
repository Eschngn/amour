package com.chengliuxiang.amour.web.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.chengliuxiang.amour.common.domain.dos.PhotoCategoryDO;
import com.chengliuxiang.amour.common.domain.dos.PhotoDO;
import com.chengliuxiang.amour.common.domain.mapper.PhotoCategoryMapper;
import com.chengliuxiang.amour.common.domain.mapper.PhotoMapper;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoCategoryVO;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoPageItemVO;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoPageQueryReqVO;
import com.chengliuxiang.amour.web.service.PhotoService;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class PhotoServiceImpl implements PhotoService {

    private static final long DEFAULT_PAGE_SIZE = 8L;
    private static final long MAX_PAGE_SIZE = 50L;
    @Resource
    private PhotoMapper photoMapper;

    @Resource
    private PhotoCategoryMapper photoCategoryMapper;

    @Override
    public Response<PageResult<PhotoPageItemVO>> pagePhotos(PhotoPageQueryReqVO reqVO) {
        long current = normalizeCurrent(reqVO.getCurrent());
        long size = normalizeSize(reqVO.getSize());

        LambdaQueryWrapper<PhotoDO> queryWrapper = new LambdaQueryWrapper<PhotoDO>()
                .eq(PhotoDO::getIsDeleted, false)
                .eq(PhotoDO::getIsVisible, true)
                .eq(reqVO.getPhotoCategoryId() != null,
                        PhotoDO::getPhotoCategoryId, reqVO.getPhotoCategoryId())
                .orderByAsc(PhotoDO::getSortOrder)
                .orderByDesc(PhotoDO::getTakenTime)
                .orderByDesc(PhotoDO::getId);

        IPage<PhotoDO> photoPage = photoMapper.selectPage(new Page<>(current, size), queryWrapper);
        Map<Long, PhotoCategoryDO> categoryMap = loadCategoryMap(photoPage.getRecords());
        List<PhotoPageItemVO> records = photoPage.getRecords().stream()
                .map(photo -> buildPhotoVO(photo, categoryMap.get(photo.getPhotoCategoryId())))
                .collect(Collectors.toList());

        return Response.success(PageResult.<PhotoPageItemVO>builder()
                .current(photoPage.getCurrent())
                .size(photoPage.getSize())
                .total(photoPage.getTotal())
                .records(records)
                .build());
    }

    @Override
    public Response<PhotoPageItemVO> findCoverPhoto() {
        PhotoDO coverPhoto = photoMapper.selectOne(new LambdaQueryWrapper<PhotoDO>()
                .eq(PhotoDO::getIsDeleted, false)
                .eq(PhotoDO::getIsVisible, true)
                .eq(PhotoDO::getIsCover, true)
                .orderByDesc(PhotoDO::getUpdateTime)
                .orderByDesc(PhotoDO::getId)
                .last("LIMIT 1"));
        if (coverPhoto == null) {
            return Response.success(null);
        }
        return Response.success(buildPhotoVO(
                coverPhoto, photoCategoryMapper.selectById(coverPhoto.getPhotoCategoryId())));
    }

    @Override
    public Response<List<PhotoCategoryVO>> listCategories() {
        List<PhotoCategoryVO> categories = photoCategoryMapper.selectList(
                        new LambdaQueryWrapper<PhotoCategoryDO>()
                                .eq(PhotoCategoryDO::getIsEnabled, true)
                                .orderByAsc(PhotoCategoryDO::getSortOrder)
                                .orderByAsc(PhotoCategoryDO::getId))
                .stream()
                .map(category -> PhotoCategoryVO.builder()
                        .id(category.getId())
                        .categoryName(category.getCategoryName())
                        .sortOrder(category.getSortOrder())
                        .build())
                .collect(Collectors.toList());
        return Response.success(categories);
    }

    private long normalizeCurrent(Long current) {
        return current == null || current < 1 ? 1L : current;
    }

    private long normalizeSize(Long size) {
        if (size == null || size < 1) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(size, MAX_PAGE_SIZE);
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

    private PhotoPageItemVO buildPhotoVO(PhotoDO photo, PhotoCategoryDO category) {
        return PhotoPageItemVO.builder()
                .id(photo.getId())
                .title(photo.getTitle())
                .description(photo.getDescription())
                .photoCategoryId(photo.getPhotoCategoryId())
                .categoryName(category == null ? "未分类" : category.getCategoryName())
                .url(photo.getUrl())
                .takenTime(photo.getTakenTime())
                .location(photo.getLocation())
                .build();
    }
}
