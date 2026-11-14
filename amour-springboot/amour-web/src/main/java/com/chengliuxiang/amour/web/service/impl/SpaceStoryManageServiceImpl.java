package com.chengliuxiang.amour.web.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.chengliuxiang.amour.common.constant.SpaceReviewConstants;
import com.chengliuxiang.amour.common.domain.dos.StoryChapterDO;
import com.chengliuxiang.amour.common.domain.dos.StoryNodeDO;
import com.chengliuxiang.amour.common.domain.dos.StoryNodeImageDO;
import com.chengliuxiang.amour.common.domain.mapper.StoryChapterMapper;
import com.chengliuxiang.amour.common.domain.mapper.StoryNodeImageMapper;
import com.chengliuxiang.amour.common.domain.mapper.StoryNodeMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.space.SpaceContentSaveResultVO;
import com.chengliuxiang.amour.web.model.vo.space.SpaceItemReviewStateVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryChapterIdReqVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryChapterManageVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryChapterSaveReqVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryNodeIdReqVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryNodeManageVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryNodeSaveReqVO;
import com.chengliuxiang.amour.web.service.SpaceContentAccessService;
import com.chengliuxiang.amour.web.service.SpaceReviewService;
import com.chengliuxiang.amour.web.service.SpaceStoryManageService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class SpaceStoryManageServiceImpl implements SpaceStoryManageService {

    private static final int VISIBILITY_MEMBER = 0;
    private static final int VISIBILITY_PUBLIC = 1;
    private static final int VISIBILITY_HIDDEN = 2;

    private static final Pattern HEX_COLOR = Pattern.compile("^#[0-9a-fA-F]{6}$");
    private static final Pattern SAFE_IMAGE_URL = Pattern.compile("^(https?://|/)[^\\s]*$",
            Pattern.CASE_INSENSITIVE);

    @Resource
    private SpaceContentAccessService spaceContentAccessService;

    @Resource
    private StoryChapterMapper storyChapterMapper;

    @Resource
    private StoryNodeMapper storyNodeMapper;

    @Resource
    private StoryNodeImageMapper storyNodeImageMapper;

    @Resource
    private SpaceReviewService spaceReviewService;

    @Override
    public Response<List<StoryChapterManageVO>> listChapters() {
        Long spaceId = spaceContentAccessService.requireReadableSpaceId();
        List<StoryChapterDO> chapters = storyChapterMapper.selectManageList(spaceId);
        List<StoryChapterManageVO> records = chapters.stream()
                .map(chapter -> StoryChapterManageVO.builder()
                        .id(chapter.getId())
                        .name(chapter.getName())
                        .colorCode(chapter.getColorCode())
                        .sortOrder(chapter.getSortOrder())
                        .isVisible(chapter.getIsVisible())
                        .nodeCount(storyNodeMapper.countByChapterId(spaceId, chapter.getId()).intValue())
                        .build())
                .collect(Collectors.toList());
        return Response.success(records);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Long> saveChapter(StoryChapterSaveReqVO reqVO) {
        SpaceContentAccessService.SpaceAccess access = spaceContentAccessService.requireEditable();
        Long spaceId = access.getSpaceId();

        String name = StrUtil.trim(reqVO.getName());
        if (StrUtil.isBlank(name) || name.length() > 50) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        String colorCode = StrUtil.nullToEmpty(StrUtil.trim(reqVO.getColorCode()));
        if (colorCode.length() > 0 && !HEX_COLOR.matcher(colorCode).matches()) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }

        Long excludedId = reqVO.getId();
        Long duplicate = storyChapterMapper.countByName(spaceId, name, excludedId);
        if (duplicate != null && duplicate > 0) {
            throw new BizException(ResponseCodeEnum.CHAPTER_NAME_DUPLICATE);
        }

        LocalDateTime now = LocalDateTime.now();
        if (reqVO.getId() == null) {
            StoryChapterDO chapter = StoryChapterDO.builder()
                    .spaceId(spaceId)
                    .name(name)
                    .colorCode(colorCode)
                    .sortOrder(reqVO.getSortOrder() == null ? nextChapterSortOrder(spaceId) : reqVO.getSortOrder())
                    .isVisible(reqVO.getIsVisible() == null || reqVO.getIsVisible())
                    .createdBy(access.getUserId())
                    .createTime(now)
                    .updateTime(now)
                    .build();
            storyChapterMapper.insert(chapter);
            return Response.success(chapter.getId());
        }

        StoryChapterDO current = requireChapter(spaceId, reqVO.getId());
        current.setName(name);
        current.setColorCode(colorCode);
        current.setSortOrder(reqVO.getSortOrder() == null
                ? (current.getSortOrder() == null ? 0 : current.getSortOrder())
                : reqVO.getSortOrder());
        current.setIsVisible(reqVO.getIsVisible() == null
                ? (current.getIsVisible() == null || current.getIsVisible())
                : reqVO.getIsVisible());
        current.setUpdateTime(now);
        int updated = storyChapterMapper.updateChapter(current);
        if (updated == 0) {
            throw new BizException(ResponseCodeEnum.CHAPTER_NOT_EXIST);
        }
        return Response.success(current.getId());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Void> deleteChapter(StoryChapterIdReqVO reqVO) {
        Long spaceId = spaceContentAccessService.requireEditableSpaceId();
        requireChapter(spaceId, reqVO.getId());
        Long nodeCount = storyNodeMapper.countByChapterId(spaceId, reqVO.getId());
        if (nodeCount != null && nodeCount > 0) {
            throw new BizException(ResponseCodeEnum.SPACE_CHAPTER_NOT_EMPTY);
        }
        int deleted = storyChapterMapper.deleteChapter(spaceId, reqVO.getId());
        if (deleted == 0) {
            throw new BizException(ResponseCodeEnum.CHAPTER_NOT_EXIST);
        }
        return Response.success();
    }

    @Override
    public Response<List<StoryNodeManageVO>> listNodes() {
        Long spaceId = spaceContentAccessService.requireReadableSpaceId();
        List<StoryNodeDO> nodes = storyNodeMapper.selectManageList(spaceId);
        if (CollUtil.isEmpty(nodes)) {
            return Response.success(Collections.emptyList());
        }
        Map<Long, StoryChapterDO> chapterMap = storyChapterMapper.selectBySpaceId(spaceId).stream()
                .collect(Collectors.toMap(StoryChapterDO::getId, Function.identity(), (left, right) -> left));
        Map<Long, List<StoryNodeImageDO>> imageMap = storyNodeImageMapper.selectByNodeIds(
                        spaceId, nodes.stream().map(StoryNodeDO::getId).collect(Collectors.toList()))
                .stream()
                .collect(Collectors.groupingBy(StoryNodeImageDO::getNodeId));
        Map<String, SpaceItemReviewStateVO> reviewStates = spaceReviewService.loadItemReviewStates(spaceId);

        List<StoryNodeManageVO> records = nodes.stream()
                .map(node -> {
                    StoryChapterDO chapter = chapterMap.get(node.getChapterId());
                    List<StoryNodeManageVO.ImageVO> images = imageMap
                            .getOrDefault(node.getId(), Collections.emptyList())
                            .stream()
                            .map(image -> StoryNodeManageVO.ImageVO.builder()
                                    .id(image.getId())
                                    .url(image.getUrl())
                                    .altText(image.getAltText())
                                    .sortOrder(image.getSortOrder())
                                    .build())
                            .collect(Collectors.toList());
                    SpaceItemReviewStateVO reviewState = reviewStates.get(
                            SpaceReviewConstants.ITEM_TYPE_STORY + ":" + node.getId());
                    return StoryNodeManageVO.builder()
                            .id(node.getId())
                            .chapterId(node.getChapterId())
                            .chapterName(chapter == null ? "" : chapter.getName())
                            .title(node.getTitle())
                            .summary(node.getSummary())
                            .content(node.getContent())
                            .happenedTime(node.getHappenedTime())
                            .location(node.getLocation())
                            .coverImage(node.getCoverImage())
                            .tagLabel(node.getTagLabel())
                            .tagColor(node.getTagColor())
                            .sortOrder(node.getSortOrder())
                            .isMilestone(node.getIsMilestone())
                            .visibility(node.getVisibility())
                            .reviewStatus(reviewState == null ? null : reviewState.getReviewStatus())
                            .reviewRejectReason(reviewState == null
                                    ? null : reviewState.getReviewRejectReason())
                            .reviewHandledAt(reviewState == null
                                    ? null : reviewState.getReviewHandledAt())
                            .reviewHasPublishedVersion(reviewState == null
                                    ? null : reviewState.getHasPublishedVersion())
                            .images(images)
                            .build();
                })
                .collect(Collectors.toList());
        return Response.success(records);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<SpaceContentSaveResultVO> saveNode(StoryNodeSaveReqVO reqVO) {
        SpaceContentAccessService.SpaceAccess access = spaceContentAccessService.requireEditable();
        Long spaceId = access.getSpaceId();
        // 历史公开空间先把当前公开数据固化为已发布版本，本次修改只进入待审核快照。
        spaceReviewService.prepareForPublicEdit(spaceId);

        if (reqVO.getChapterId() == null) {
            throw new BizException(ResponseCodeEnum.CHAPTER_NOT_EXIST);
        }
        requireChapter(spaceId, reqVO.getChapterId());

        String title = StrUtil.trim(reqVO.getTitle());
        String content = StrUtil.trim(reqVO.getContent());
        if (StrUtil.isBlank(title) || StrUtil.isBlank(content) || reqVO.getHappenedTime() == null) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        Integer visibility = resolveVisibility(reqVO.getVisibility(), access);
        validateImages(reqVO.getImages());

        LocalDateTime now = LocalDateTime.now();
        StoryNodeDO node;
        if (reqVO.getId() == null) {
            node = StoryNodeDO.builder()
                    .spaceId(spaceId)
                    .chapterId(reqVO.getChapterId())
                    .title(title)
                    .summary(StrUtil.nullToEmpty(StrUtil.trim(reqVO.getSummary())))
                    .content(content)
                    .happenedTime(reqVO.getHappenedTime())
                    .location(StrUtil.nullToEmpty(StrUtil.trim(reqVO.getLocation())))
                    .coverImage(StrUtil.nullToEmpty(StrUtil.trim(reqVO.getCoverImage())))
                    .tagLabel(StrUtil.nullToEmpty(StrUtil.trim(reqVO.getTagLabel())))
                    .tagColor(StrUtil.nullToEmpty(StrUtil.trim(reqVO.getTagColor())))
                    .sortOrder(reqVO.getSortOrder() == null ? 0 : reqVO.getSortOrder())
                    .isMilestone(Boolean.TRUE.equals(reqVO.getIsMilestone()))
                    .visibility(visibility)
                    .isDeleted(false)
                    .createdBy(access.getUserId())
                    .updatedBy(access.getUserId())
                    .revision(1)
                    .createTime(now)
                    .updateTime(now)
                    .build();
            storyNodeMapper.insertStoryNode(node);
        } else {
            StoryNodeDO current = requireNode(spaceId, reqVO.getId());
            node = StoryNodeDO.builder()
                    .id(current.getId())
                    .spaceId(spaceId)
                    .chapterId(reqVO.getChapterId())
                    .title(title)
                    .summary(StrUtil.nullToEmpty(StrUtil.trim(reqVO.getSummary())))
                    .content(content)
                    .happenedTime(reqVO.getHappenedTime())
                    .location(StrUtil.nullToEmpty(StrUtil.trim(reqVO.getLocation())))
                    .coverImage(StrUtil.nullToEmpty(StrUtil.trim(reqVO.getCoverImage())))
                    .tagLabel(StrUtil.nullToEmpty(StrUtil.trim(reqVO.getTagLabel())))
                    .tagColor(StrUtil.nullToEmpty(StrUtil.trim(reqVO.getTagColor())))
                    .sortOrder(reqVO.getSortOrder() == null
                            ? (current.getSortOrder() == null ? 0 : current.getSortOrder())
                            : reqVO.getSortOrder())
                    .isMilestone(Boolean.TRUE.equals(reqVO.getIsMilestone()))
                    .visibility(visibility)
                    .updatedBy(access.getUserId())
                    .updateTime(now)
                    .build();
            int updated = storyNodeMapper.updateStoryNode(node);
            if (updated == 0) {
                throw new BizException(ResponseCodeEnum.STORY_NOT_EXIST);
            }
        }

        replaceImages(spaceId, node.getId(), access.getUserId(), reqVO.getImages(), now);
        return Response.success(spaceReviewService.onContentSaved(
                spaceId, access.getUserId(), SpaceReviewConstants.ITEM_TYPE_STORY, node.getId(), false));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Void> deleteNode(StoryNodeIdReqVO reqVO) {
        SpaceContentAccessService.SpaceAccess access = spaceContentAccessService.requireEditable();
        spaceReviewService.prepareForPublicEdit(access.getSpaceId());
        requireNode(access.getSpaceId(), reqVO.getId());
        int deleted = storyNodeMapper.softDelete(access.getSpaceId(), reqVO.getId(),
                access.getUserId(), LocalDateTime.now());
        if (deleted == 0) {
            throw new BizException(ResponseCodeEnum.STORY_NOT_EXIST);
        }
        // 删除属于缩小公开范围，立即从广场移除并撤回该项的待审核版本。
        spaceReviewService.onContentSaved(access.getSpaceId(), access.getUserId(),
                SpaceReviewConstants.ITEM_TYPE_STORY, reqVO.getId(), true);
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

    private void validateImages(List<StoryNodeSaveReqVO.ImageReqVO> images) {
        if (CollUtil.isEmpty(images)) {
            return;
        }
        for (StoryNodeSaveReqVO.ImageReqVO image : images) {
            String url = StrUtil.trim(image.getUrl());
            if (StrUtil.isBlank(url)) {
                continue;
            }
            if (url.length() > 500 || !SAFE_IMAGE_URL.matcher(url).matches()) {
                throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
            }
        }
    }

    private void replaceImages(Long spaceId, Long nodeId, Long userId,
                               List<StoryNodeSaveReqVO.ImageReqVO> images, LocalDateTime now) {
        storyNodeImageMapper.deleteByNodeId(spaceId, nodeId);
        if (CollUtil.isEmpty(images)) {
            return;
        }
        int index = 0;
        for (StoryNodeSaveReqVO.ImageReqVO image : images) {
            String url = StrUtil.trim(image.getUrl());
            if (StrUtil.isBlank(url)) {
                continue;
            }
            storyNodeImageMapper.insert(StoryNodeImageDO.builder()
                    .spaceId(spaceId)
                    .nodeId(nodeId)
                    .url(url)
                    .altText(StrUtil.nullToEmpty(StrUtil.trim(image.getAltText())))
                    .sortOrder(image.getSortOrder() == null ? index * 10 : image.getSortOrder())
                    .createdBy(userId)
                    .createTime(now)
                    .build());
            index++;
        }
    }

    private int nextChapterSortOrder(Long spaceId) {
        List<StoryChapterDO> chapters = storyChapterMapper.selectBySpaceId(spaceId);
        int max = 0;
        for (StoryChapterDO chapter : chapters) {
            if (chapter.getSortOrder() != null && chapter.getSortOrder() > max) {
                max = chapter.getSortOrder();
            }
        }
        return max + 10;
    }

    private StoryChapterDO requireChapter(Long spaceId, Long chapterId) {
        StoryChapterDO chapter = storyChapterMapper.selectChapterById(spaceId, chapterId);
        if (chapter == null) {
            throw new BizException(ResponseCodeEnum.CHAPTER_NOT_EXIST);
        }
        return chapter;
    }

    private StoryNodeDO requireNode(Long spaceId, Long nodeId) {
        StoryNodeDO node = storyNodeMapper.selectActiveById(spaceId, nodeId);
        if (node == null) {
            throw new BizException(ResponseCodeEnum.STORY_NOT_EXIST);
        }
        return node;
    }
}
