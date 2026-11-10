package com.chengliuxiang.amour.admin.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.chengliuxiang.amour.admin.model.vo.content.AdminContentDeleteReqVO;
import com.chengliuxiang.amour.admin.model.vo.content.AdminContentModerateReqVO;
import com.chengliuxiang.amour.admin.model.vo.content.AdminContentPageReqVO;
import com.chengliuxiang.amour.admin.model.vo.content.AdminContentPageRspVO;
import com.chengliuxiang.amour.admin.model.vo.photo.DeletePhotoReqVO;
import com.chengliuxiang.amour.admin.model.vo.photo.FindPhotoPageListReqVO;
import com.chengliuxiang.amour.admin.model.vo.photo.FindPhotoPageListRspVO;
import com.chengliuxiang.amour.admin.model.vo.photo.PhotoCategoryListReqVO;
import com.chengliuxiang.amour.admin.model.vo.photo.PhotoCategoryListRspVO;
import com.chengliuxiang.amour.admin.model.vo.photo.UpdatePhotoVisibleStatusReqVO;
import com.chengliuxiang.amour.admin.security.AdminAuthorizationService;
import com.chengliuxiang.amour.admin.service.AdminContentGovernanceService;
import com.chengliuxiang.amour.admin.service.AdminPhotoService;
import com.chengliuxiang.amour.common.constant.AdminPermissionConstants;
import com.chengliuxiang.amour.common.constant.ContentGovernanceConstants;
import com.chengliuxiang.amour.common.domain.dos.CoupleSpaceDO;
import com.chengliuxiang.amour.common.domain.mapper.CoupleSpaceMapper;
import com.chengliuxiang.amour.common.domain.mapper.PhotoCategoryMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AdminPhotoServiceImpl implements AdminPhotoService {

    @Resource
    private AdminContentGovernanceService adminContentGovernanceService;
    @Resource
    private PhotoCategoryMapper photoCategoryMapper;
    @Resource
    private CoupleSpaceMapper coupleSpaceMapper;
    @Resource
    private AdminAuthorizationService adminAuthorizationService;

    @Override
    public Response<PageResult<FindPhotoPageListRspVO>> findPhotoPageList(FindPhotoPageListReqVO reqVO) {
        AdminContentPageReqVO query = new AdminContentPageReqVO();
        query.setCurrent(reqVO.getCurrent());
        query.setSize(reqVO.getSize());
        query.setSpaceId(reqVO.getSpaceId());
        query.setKeyword(reqVO.getTitle());
        query.setVisibility(reqVO.getVisibility());
        query.setIncludeDeleted(reqVO.getIncludeDeleted());
        query.setContentType(ContentGovernanceConstants.TYPE_PHOTO);

        Response<PageResult<AdminContentPageRspVO>> response = adminContentGovernanceService.findPage(query);
        PageResult<AdminContentPageRspVO> page = response.getData();
        List<FindPhotoPageListRspVO> records = page.getRecords().stream()
                .map(item -> FindPhotoPageListRspVO.builder()
                        .id(item.getContentId())
                        .spaceId(item.getSpaceId())
                        .spaceCode(item.getSpaceCode())
                        .spaceName(item.getSpaceName())
                        .spaceStatus(item.getSpaceStatus())
                        .spaceVisibility(item.getSpaceVisibility())
                        .title(item.getTitle())
                        .description(item.getSummary())
                        .photoCategoryId(item.getPhotoCategoryId())
                        .categoryName(item.getCategoryName())
                        .takenTime(item.getHappenedTime())
                        .visibility(item.getVisibility())
                        .visibilityText(item.getVisibilityText())
                        .deleted(item.getDeleted())
                        .authorAmourId(item.getAuthorAmourId())
                        .authorName(item.getAuthorName())
                        .reportCount(item.getReportCount())
                        .pendingReportCount(item.getPendingReportCount())
                        .isVisible(item.getVisibility() == null
                                || item.getVisibility() != ContentGovernanceConstants.VISIBILITY_HIDDEN)
                        .createTime(item.getCreateTime())
                        .updateTime(item.getUpdateTime())
                        .build())
                .collect(Collectors.toList());
        return Response.success(PageResult.<FindPhotoPageListRspVO>builder()
                .current(page.getCurrent())
                .size(page.getSize())
                .total(page.getTotal())
                .records(records)
                .build());
    }

    @Override
    public Response<Void> updateVisibleStatus(UpdatePhotoVisibleStatusReqVO reqVO) {
        Integer visibility = reqVO.getVisibility();
        if (visibility == null && reqVO.getIsVisible() != null) {
            visibility = Boolean.TRUE.equals(reqVO.getIsVisible())
                    ? ContentGovernanceConstants.VISIBILITY_MEMBER_ONLY
                    : ContentGovernanceConstants.VISIBILITY_HIDDEN;
        }
        if (visibility == null) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        AdminContentModerateReqVO moderate = new AdminContentModerateReqVO();
        moderate.setContentType(ContentGovernanceConstants.TYPE_PHOTO);
        moderate.setContentId(reqVO.getId());
        moderate.setSpaceId(reqVO.getSpaceId());
        moderate.setVisibility(visibility);
        moderate.setReason(reqVO.getReason());
        return adminContentGovernanceService.moderateVisibility(moderate);
    }

    @Override
    public Response<Void> deletePhoto(DeletePhotoReqVO reqVO) {
        AdminContentDeleteReqVO delete = new AdminContentDeleteReqVO();
        delete.setContentType(ContentGovernanceConstants.TYPE_PHOTO);
        delete.setContentId(reqVO.getId());
        delete.setSpaceId(reqVO.getSpaceId());
        delete.setReason(reqVO.getReason());
        return adminContentGovernanceService.deleteContent(delete);
    }

    @Override
    public Response<List<PhotoCategoryListRspVO>> listPhotoCategories(PhotoCategoryListReqVO reqVO) {
        adminAuthorizationService.requirePermission(AdminPermissionConstants.CONTENT_QUERY);
        Long spaceId = reqVO == null ? null : reqVO.getSpaceId();
        if (spaceId != null) {
            CoupleSpaceDO space = coupleSpaceMapper.findById(spaceId);
            if (space == null) {
                throw new BizException(ResponseCodeEnum.SPACE_NOT_EXIST);
            }
        } else if (!adminAuthorizationService.hasPermission(AdminPermissionConstants.CONTENT_CROSS_SPACE)) {
            throw new BizException(ResponseCodeEnum.CONTENT_CROSS_SPACE_FORBIDDEN);
        }
        List<PhotoCategoryListRspVO> categories = photoCategoryMapper.findAdminList(spaceId)
                .stream()
                .map(category -> PhotoCategoryListRspVO.builder()
                        .id(category.getId())
                        .spaceId(category.getSpaceId())
                        .categoryName(category.getCategoryName())
                        .sortOrder(category.getSortOrder())
                        .isEnabled(category.getIsEnabled())
                        .build())
                .collect(Collectors.toList());
        return Response.success(categories);
    }
}
