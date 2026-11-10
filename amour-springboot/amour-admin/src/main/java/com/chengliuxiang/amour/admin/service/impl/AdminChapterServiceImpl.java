package com.chengliuxiang.amour.admin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.chengliuxiang.amour.admin.model.vo.chapter.FindChapterListReqVO;
import com.chengliuxiang.amour.admin.model.vo.chapter.FindChapterListRspVO;
import com.chengliuxiang.amour.admin.security.AdminAuthorizationService;
import com.chengliuxiang.amour.admin.service.AdminChapterService;
import com.chengliuxiang.amour.common.constant.AdminPermissionConstants;
import com.chengliuxiang.amour.common.domain.dos.CoupleSpaceDO;
import com.chengliuxiang.amour.common.domain.dos.StoryChapterDO;
import com.chengliuxiang.amour.common.domain.mapper.CoupleSpaceMapper;
import com.chengliuxiang.amour.common.domain.mapper.StoryChapterMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.utils.Response;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 故事章节只读查询：必须带空间上下文，或在拥有跨空间权限时显式跨空间查询。
 */
@Service
@Slf4j
public class AdminChapterServiceImpl implements AdminChapterService {

    @Resource
    private StoryChapterMapper storyChapterMapper;
    @Resource
    private CoupleSpaceMapper coupleSpaceMapper;
    @Resource
    private AdminAuthorizationService adminAuthorizationService;

    @Override
    public Response<List<FindChapterListRspVO>> findChapterList(FindChapterListReqVO reqVO) {
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

        List<StoryChapterDO> chapters = storyChapterMapper.selectList(
                new LambdaQueryWrapper<StoryChapterDO>()
                        .eq(spaceId != null, StoryChapterDO::getSpaceId, spaceId)
                        .eq(StoryChapterDO::getIsVisible, true)
                        .orderByAsc(StoryChapterDO::getSpaceId)
                        .orderByAsc(StoryChapterDO::getSortOrder)
                        .orderByAsc(StoryChapterDO::getId));
        return Response.success(chapters.stream()
                .map(chapter -> FindChapterListRspVO.builder()
                        .id(chapter.getId())
                        .spaceId(chapter.getSpaceId())
                        .name(chapter.getName())
                        .colorCode(chapter.getColorCode())
                        .sortOrder(chapter.getSortOrder())
                        .isVisible(chapter.getIsVisible())
                        .build())
                .collect(Collectors.toList()));
    }
}
