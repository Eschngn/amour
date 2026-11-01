package com.chengliuxiang.amour.admin.service.impl;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.chengliuxiang.amour.admin.model.vo.story.*;
import com.chengliuxiang.amour.admin.service.AdminStoryService;
import com.chengliuxiang.amour.common.domain.dos.StoryChapterDO;
import com.chengliuxiang.amour.common.domain.dos.StoryNodeDO;
import com.chengliuxiang.amour.common.domain.dos.StoryNodeImageDO;
import com.chengliuxiang.amour.common.domain.mapper.StoryChapterMapper;
import com.chengliuxiang.amour.common.domain.mapper.StoryNodeImageMapper;
import com.chengliuxiang.amour.common.domain.mapper.StoryNodeMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@Slf4j
public class AdminStoryServiceImpl implements AdminStoryService {

    private static final int VISIBILITY_MEMBER = 0;
    private static final int VISIBILITY_HIDDEN = 2;

    @Resource
    private StoryNodeMapper storyNodeMapper;
    @Resource
    private StoryChapterMapper storyChapterMapper;
    @Resource
    private StoryNodeImageMapper storyNodeImageMapper;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    /**
     * 分页查询故事数据
     * @param reqVO
     * @return
     */
    @Override
    public Response<PageResult<FindStoryPageListRspVO>> findStoryPageList(FindStoryPageListReqVO reqVO) {
        IPage<StoryNodeDO> nodePage = storyNodeMapper.selectAdminPage(
                reqVO.getCurrent(), reqVO.getSize(), null,
                StrUtil.isNotBlank(reqVO.getTitle()) ? reqVO.getTitle() : null);

        // 4. 批量查询章节名称
        List<Long> chapterIds = nodePage.getRecords().stream()
                .map(StoryNodeDO::getChapterId)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());

        Map<Long, String> chapterNameMap;
        if (chapterIds.isEmpty()) {
            chapterNameMap = Collections.emptyMap();
        } else {
            chapterNameMap = storyChapterMapper.selectBatchIds(chapterIds).stream()
                    .collect(Collectors.toMap(StoryChapterDO::getId, StoryChapterDO::getName));
        }

        // 5. DO 转 VO
        List<FindStoryPageListRspVO> records = nodePage.getRecords().stream()
                .map(node -> FindStoryPageListRspVO.builder()
                        .id(node.getId())
                        .title(node.getTitle())
                        .summary(node.getSummary())
                        .coverImage(node.getCoverImage())
                        .isVisible(toVisible(node.getVisibility()))
                        .chapterId(node.getChapterId() != null ? String.valueOf(node.getChapterId()) : null)
                        .chapterName(chapterNameMap.get(node.getChapterId()))
                        .happenedTime(node.getHappenedTime() != null
                                ? node.getHappenedTime().format(DATE_FORMATTER)
                                : null)
                        .build())
                .collect(Collectors.toList());

        // 6. 封装分页结果
        PageResult<FindStoryPageListRspVO> pageResult = PageResult.<FindStoryPageListRspVO>builder()
                .current(nodePage.getCurrent())
                .size(nodePage.getSize())
                .total(nodePage.getTotal())
                .records(records)
                .build();

        return Response.success(pageResult);
    }

    /**
     * 查询故事详情
     * @param findStoryDetailReqVO
     * @return
     */
    @Override
    public Response<FindStoryDetailRspVO> findStoryDetail(FindStoryDetailReqVO findStoryDetailReqVO) {
        Long storyNodeId = findStoryDetailReqVO.getId();
        // 1. 查询故事节点
        StoryNodeDO node = requireStory(storyNodeId);

        // 2. 查询章节名称
        StoryChapterDO chapter = storyChapterMapper.selectChapterById(node.getSpaceId(), node.getChapterId());
        String chapterName = chapter != null ? chapter.getName() : null;

        // 3. 查询关联图片
        List<StoryNodeImageDO> imageDOS = storyNodeImageMapper.selectByNodeId(node.getSpaceId(), storyNodeId);

        List<FindStoryDetailRspVO.ImageVO> images = imageDOS.stream()
                .map(img -> FindStoryDetailRspVO.ImageVO.builder()
                        .id(img.getId())
                        .url(img.getUrl())
                        .altText(img.getAltText())
                        .sortOrder(img.getSortOrder())
                        .build())
                .collect(Collectors.toList());

        // 4. 组装 VO
        FindStoryDetailRspVO vo = FindStoryDetailRspVO.builder()
                .id(node.getId())
                .title(node.getTitle())
                .content(node.getContent())
                .chapterId(node.getChapterId() != null ? String.valueOf(node.getChapterId()) : null)
                .chapterName(chapterName)
                .happenedTime(node.getHappenedTime() != null
                        ? node.getHappenedTime().format(DATE_FORMATTER)
                        : null)
                .location(node.getLocation())
                .coverImage(node.getCoverImage())
                .tagLabel(node.getTagLabel())
                .tagColor(node.getTagColor())
                .isMilestone(node.getIsMilestone())
                .images(images)
                .build();

        return Response.success(vo);
    }

    @Override
    public Response<Long> addStory(AddStoryReqVO reqVO) {
        // 校验章节是否存在
        StoryChapterDO chapter = storyChapterMapper.selectById(reqVO.getChapterId());
        if (chapter == null) {
            throw new BizException(ResponseCodeEnum.CHAPTER_NOT_EXIST);
        }

        StoryNodeDO node = StoryNodeDO.builder()
                .spaceId(chapter.getSpaceId())
                .title(reqVO.getTitle())
                .summary(reqVO.getSummary())
                .content(reqVO.getContent())
                .coverImage(reqVO.getCoverImage())
                .happenedTime(reqVO.getHappenedTime())
                .location(reqVO.getLocation())
                .tagLabel(reqVO.getTagLabel())
                .chapterId(reqVO.getChapterId())
                .isMilestone(reqVO.getIsMilestone())
                .visibility(VISIBILITY_MEMBER)
                .createdBy(StpUtil.getLoginIdAsLong())
                .createTime(LocalDateTime.now())
                .updateTime(LocalDateTime.now())
                .build();

        storyNodeMapper.insertStoryNode(node);
        return Response.success(node.getId());
    }

    @Override
    public Response<Void> updateStory(UpdateStoryReqVO reqVO) {
        // 校验故事是否存在
        StoryNodeDO existNode = requireStory(reqVO.getId());

        // 校验章节是否存在
        StoryChapterDO chapter = storyChapterMapper.selectById(reqVO.getChapterId());
        if (chapter == null) {
            throw new BizException(ResponseCodeEnum.CHAPTER_NOT_EXIST);
        }

        StoryNodeDO node = StoryNodeDO.builder()
                .id(reqVO.getId())
                .spaceId(existNode.getSpaceId())
                .title(reqVO.getTitle())
                .summary(reqVO.getSummary())
                .content(reqVO.getContent())
                .coverImage(reqVO.getCoverImage())
                .happenedTime(reqVO.getHappenedTime())
                .location(reqVO.getLocation())
                .tagLabel(reqVO.getTagLabel())
                .tagColor(reqVO.getTagColor())
                .sortOrder(reqVO.getSortOrder())
                .chapterId(reqVO.getChapterId())
                .isMilestone(reqVO.getIsMilestone())
                .updateTime(LocalDateTime.now())
                .build();

        storyNodeMapper.updateStoryNode(node);
        return Response.success();
    }

    @Override
    public Response<Void> updatePublishStatus(UpdateStoryVisibleStatusReqVO reqVO) {
        // 校验故事是否存在
        StoryNodeDO existNode = requireStory(reqVO.getId());

        StoryNodeDO node = StoryNodeDO.builder()
                .id(reqVO.getId())
                .spaceId(existNode.getSpaceId())
                .visibility(toVisibility(reqVO.getIsVisible()))
                .updateTime(LocalDateTime.now())
                .build();

        storyNodeMapper.updateStoryNode(node);
        return Response.success();
    }

    @Override
    public Response<Void> deleteStory(DeleteStoryReqVO reqVO) {
        // 校验故事是否存在（未删除的）
        StoryNodeDO existNode = requireStory(reqVO.getId());

        StoryNodeDO node = StoryNodeDO.builder()
                .id(reqVO.getId())
                .spaceId(existNode.getSpaceId())
                .isDeleted(true)
                .updateTime(LocalDateTime.now())
                .build();

        storyNodeMapper.updateStoryNode(node);
        return Response.success();
    }

    private StoryNodeDO requireStory(Long id) {
        StoryNodeDO node = storyNodeMapper.selectById(id);
        if (node == null || Boolean.TRUE.equals(node.getIsDeleted())) {
            throw new BizException(ResponseCodeEnum.STORY_NOT_EXIST);
        }
        return node;
    }

    private Integer toVisibility(Boolean isVisible) {
        return Boolean.FALSE.equals(isVisible) ? VISIBILITY_HIDDEN : VISIBILITY_MEMBER;
    }

    private Boolean toVisible(Integer visibility) {
        return visibility == null || visibility != VISIBILITY_HIDDEN;
    }
}
