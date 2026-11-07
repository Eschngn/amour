package com.chengliuxiang.amour.web.service.impl;

import cn.dev33.satoken.stp.StpUtil;
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

    @Resource
    private CoupleMemberMapper coupleMemberMapper;

    @Override
    public Response<PageResult<PhotoPageItemVO>> pagePhotos(PhotoPageQueryReqVO reqVO) {
        long current = normalizeCurrent(reqVO.getCurrent());
        long size = normalizeSize(reqVO.getSize());
        Long spaceId = requireCurrentSpaceId();

        com.baomidou.mybatisplus.core.metadata.IPage<PhotoDO> photoPage = photoMapper.selectSpacePage(
                current, size, spaceId, reqVO.getPhotoCategoryId());
        Map<Long, PhotoCategoryDO> categoryMap = loadCategoryMap(spaceId, photoPage.getRecords());
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
        Long spaceId = requireCurrentSpaceId();
        PhotoDO coverPhoto = photoMapper.selectCoverPhoto(spaceId);
        if (coverPhoto == null) {
            return Response.success(null);
        }
        return Response.success(buildPhotoVO(
                coverPhoto, photoCategoryMapper.findCategoryById(spaceId, coverPhoto.getPhotoCategoryId())));
    }

    @Override
    public Response<List<PhotoCategoryVO>> listCategories() {
        Long spaceId = requireCurrentSpaceId();
        List<PhotoCategoryVO> categories = photoCategoryMapper.selectEnabledBySpaceId(spaceId)
                .stream()
                .map(category -> PhotoCategoryVO.builder()
                        .id(category.getId())
                        .categoryName(category.getCategoryName())
                        .sortOrder(category.getSortOrder())
                        .build())
                .collect(Collectors.toList());
        return Response.success(categories);
    }

    private Long requireCurrentSpaceId() {
        // 只取「未解绑空间」中的有效成员关系：status=5 的历史残留不再代表可访问的空间。
        List<CoupleMemberDO> memberships = coupleMemberMapper.selectActiveInLiveSpaces(StpUtil.getLoginIdAsLong());
        if (memberships == null || memberships.isEmpty()) {
            if (coupleMemberMapper.countActiveByUserId(StpUtil.getLoginIdAsLong()) > 0) {
                throw new BizException(ResponseCodeEnum.SPACE_UNBOUND);
            }
            throw new BizException(ResponseCodeEnum.SPACE_NOT_EXIST);
        }
        return memberships.get(0).getSpaceId();
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
