package com.chengliuxiang.amour.admin.service.impl;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
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
        // 1. 构建分页参数
        Page<StoryNodeDO> page = new Page<>(reqVO.getCurrent(), reqVO.getSize());

        // 2. 构建查询条件 - title 模糊匹配，按 chapterId 升序、happenedTime 升序
        LambdaQueryWrapper<StoryNodeDO> wrapper = new LambdaQueryWrapper<StoryNodeDO>()
                .like(StrUtil.isNotBlank(reqVO.getTitle()), StoryNodeDO::getTitle, reqVO.getTitle())
                .eq(StoryNodeDO::getIsDeleted, false)
                .orderByAsc(StoryNodeDO::getChapterId)
                .orderByAsc(StoryNodeDO::getHappenedTime);

        // 3. 执行分页查询
        IPage<StoryNodeDO> nodePage = storyNodeMapper.selectPage(page, wrapper);

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
                        .isVisible(node.getIsVisible())
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
        StoryNodeDO node = storyNodeMapper.selectOne(new LambdaQueryWrapper<StoryNodeDO>()
                .eq(StoryNodeDO::getId, storyNodeId)
                .eq(StoryNodeDO::getIsDeleted, false));
        if (node == null) {
            throw new BizException(ResponseCodeEnum.STORY_NOT_EXIST);
        }

        // 2. 查询章节名称
        StoryChapterDO chapter = storyChapterMapper.selectById(node.getChapterId());
        String chapterName = chapter != null ? chapter.getName() : null;

        // 3. 查询关联图片
        List<StoryNodeImageDO> imageDOS = storyNodeImageMapper.selectList(
                new LambdaQueryWrapper<StoryNodeImageDO>()
                        .eq(StoryNodeImageDO::getNodeId, storyNodeId)
                        .orderByAsc(StoryNodeImageDO::getSortOrder));

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
                .title(reqVO.getTitle())
                .summary(reqVO.getSummary())
                .content(reqVO.getContent())
                .coverImage(reqVO.getCoverImage())
                .happenedTime(reqVO.getHappenedTime())
                .location(reqVO.getLocation())
                .tagLabel(reqVO.getTagLabel())
                .chapterId(reqVO.getChapterId())
                .isMilestone(reqVO.getIsMilestone())
                .isVisible(true)
                .createdBy(StpUtil.getLoginIdAsLong())
                .createTime(LocalDateTime.now())
                .updateTime(LocalDateTime.now())
                .build();

        storyNodeMapper.insert(node);
        return Response.success(node.getId());
    }

    @Override
    public Response<Void> updateStory(UpdateStoryReqVO reqVO) {
        // 校验故事是否存在
        StoryNodeDO existNode = storyNodeMapper.selectOne(new LambdaQueryWrapper<StoryNodeDO>()
                .eq(StoryNodeDO::getId, reqVO.getId())
                .eq(StoryNodeDO::getIsDeleted, false));
        if (existNode == null) {
            throw new BizException(ResponseCodeEnum.STORY_NOT_EXIST);
        }

        // 校验章节是否存在
        StoryChapterDO chapter = storyChapterMapper.selectById(reqVO.getChapterId());
        if (chapter == null) {
            throw new BizException(ResponseCodeEnum.CHAPTER_NOT_EXIST);
        }

        StoryNodeDO node = StoryNodeDO.builder()
                .id(reqVO.getId())
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

        storyNodeMapper.updateById(node);
        return Response.success();
    }

    @Override
    public Response<Void> updatePublishStatus(UpdateStoryVisibleStatusReqVO reqVO) {
        // 校验故事是否存在
        StoryNodeDO existNode = storyNodeMapper.selectOne(new LambdaQueryWrapper<StoryNodeDO>()
                .eq(StoryNodeDO::getId, reqVO.getId())
                .eq(StoryNodeDO::getIsDeleted, false));
        if (existNode == null) {
            throw new BizException(ResponseCodeEnum.STORY_NOT_EXIST);
        }

        StoryNodeDO node = StoryNodeDO.builder()
                .id(reqVO.getId())
                .isVisible(reqVO.getIsVisible())
                .updateTime(LocalDateTime.now())
                .build();

        storyNodeMapper.updateById(node);
        return Response.success();
    }

    @Override
    public Response<Void> deleteStory(DeleteStoryReqVO reqVO) {
        // 校验故事是否存在（未删除的）
        StoryNodeDO existNode = storyNodeMapper.selectOne(new LambdaQueryWrapper<StoryNodeDO>()
                .eq(StoryNodeDO::getId, reqVO.getId())
                .eq(StoryNodeDO::getIsDeleted, false));
        if (existNode == null) {
            throw new BizException(ResponseCodeEnum.STORY_NOT_EXIST);
        }

        StoryNodeDO node = StoryNodeDO.builder()
                .id(reqVO.getId())
                .isDeleted(true)
                .updateTime(LocalDateTime.now())
                .build();

        storyNodeMapper.updateById(node);
        return Response.success();
    }
}
