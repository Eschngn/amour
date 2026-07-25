package com.chengliuxiang.amour.web.service.impl;

import cn.hutool.core.collection.CollUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.chengliuxiang.amour.common.domain.dos.StoryChapterDO;
import com.chengliuxiang.amour.common.domain.dos.StoryNodeDO;
import com.chengliuxiang.amour.common.domain.mapper.StoryChapterMapper;
import com.chengliuxiang.amour.common.domain.mapper.StoryNodeMapper;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.story.*;
import com.chengliuxiang.amour.web.service.StoryService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class StoryServiceImpl implements StoryService {

    @Resource
    private StoryNodeMapper storyNodeMapper;
    @Resource
    private StoryChapterMapper storyChapterMapper;

    /**
     * 查询所有里程碑节点，按发生时间升序排列
     *
     * @return
     */
    @Override
    public Response<List<MilestoneStoryNodeVO>> queryMilestoneList() {
        List<StoryNodeDO> storyNodeDOS = storyNodeMapper.selectList(new LambdaQueryWrapper<StoryNodeDO>()
                .eq(StoryNodeDO::getIsMilestone, true)
                .eq(StoryNodeDO::getIsDeleted, false)
                .orderByAsc(StoryNodeDO::getHappenedTime));
        List<MilestoneStoryNodeVO> milestoneStoryNodeVOS = storyNodeDOS.stream()
                .map(storyNodeDO -> MilestoneStoryNodeVO.builder()
                        .id(storyNodeDO.getId())
                        .title(storyNodeDO.getTitle())
                        .summary(storyNodeDO.getSummary())
                        .happenedTime(storyNodeDO.getHappenedTime())
                        .coverImage(storyNodeDO.getCoverImage())
                        .build())
                .collect(Collectors.toList());
        return Response.success(milestoneStoryNodeVOS);
    }

    /**
     * 获取故事模块全量数据
     *
     * @return
     */
    @Override
    public Response<StoryOverviewVO> getOverview() {
        // 查询所有可见章节。按 sort_order 升序
        List<StoryChapterDO> storyChapterDOS = storyChapterMapper.selectList(
                new LambdaQueryWrapper<StoryChapterDO>()
                        .eq(StoryChapterDO::getIsVisible, 1)
                        .orderByAsc(StoryChapterDO::getSortOrder)
        );
        if (CollUtil.isEmpty(storyChapterDOS)) {
            return Response.success();
        }

        // 查所有可见故事节点，按 chapter_id + sort_order 升序
        List<StoryNodeDO> storyNodeDOS = storyNodeMapper.selectList(
                new LambdaQueryWrapper<StoryNodeDO>()
                        .eq(StoryNodeDO::getIsVisible, 1)
                        .eq(StoryNodeDO::getIsDeleted, false)
                        .orderByAsc(StoryNodeDO::getChapterId)
                        .orderByAsc(StoryNodeDO::getSortOrder)
        );

        // 故事节点按 chapter_id 分组
        Map<Long, List<StoryNodeDO>> chapterIdAndNodeMap = storyNodeDOS.stream()
                .collect(Collectors.groupingBy(StoryNodeDO::getChapterId));

        // 转换得到故事章节 VO 列表
        List<StoryChapterVO> storyChapterVOS = storyChapterDOS.stream()
                .map(storyChapterDO -> buildChapterVO(storyChapterDO, chapterIdAndNodeMap))
                .collect(Collectors.toList());

        // 跨越的季节数：取所有节点日期的月份，换算成季节去重计数
        long totalSeasons = storyNodeDOS.stream()
                .map(StoryNodeDO::getHappenedTime)
                .filter(Objects::nonNull)
                .map(d -> d.getYear() * 10 + (d.getMonthValue() - 1) / 3) // 年*10+季度编号 去重
                .distinct()
                .count();

        StoryOverviewVO storyOverviewVO = StoryOverviewVO.builder()
                .totalNodes(storyNodeDOS.size())
                .totalSeasons((int) totalSeasons)
                .totalChapters(storyChapterVOS.size())
                .startDate(
                        storyNodeDOS.stream()
                                .map(StoryNodeDO::getHappenedTime)
                                .filter(Objects::nonNull)
                                .min(Comparator.naturalOrder())
                                .orElse(null)
                )
                .chapters(storyChapterVOS).build();
        return Response.success(storyOverviewVO);
    }

    /**
     * 根据章节 ID 获取故事
     * @param getStoryByChapterIdReqVO
     * @return
     */
    @Override
    public Response<List<StoryNodeVO>> getStoryByChapterId(GetStoryByChapterIdReqVO getStoryByChapterIdReqVO) {
        Long chapterId = Long.valueOf(getStoryByChapterIdReqVO.getChapterId());
        List<StoryNodeDO> storyNodeDOS = storyNodeMapper.selectList(
                new LambdaQueryWrapper<StoryNodeDO>()
                        .eq(StoryNodeDO::getChapterId, chapterId)
                        .eq(StoryNodeDO::getIsVisible, 1)
                        .eq(StoryNodeDO::getIsDeleted, false)
                        .orderByAsc(StoryNodeDO::getHappenedTime)
                        .orderByAsc(StoryNodeDO::getId)
        );
        if (CollUtil.isEmpty(storyNodeDOS)) {
            return Response.success();
        }
        List<StoryNodeVO> storyNodeVOS = storyNodeDOS.stream()
                .map(storyNodeDO -> StoryNodeVO.builder()
                        .id(storyNodeDO.getId())
                        .title(storyNodeDO.getTitle())
                        .summary(storyNodeDO.getSummary())
                        .content(storyNodeDO.getContent())
                        .coverImage(storyNodeDO.getCoverImage())
                        .happenedTime(storyNodeDO.getHappenedTime())
                        .location(storyNodeDO.getLocation())
                        .isMilestone(storyNodeDO.getIsMilestone())
                        .tagLabel(storyNodeDO.getTagLabel())
                        .tagColor(storyNodeDO.getTagColor())
                        .build())
                .collect(Collectors.toList());
        return Response.success(storyNodeVOS);
    }

    @Override
    public Response<StoryDetailRspVO> getStoryDetail(StoryDetailReqVO reqVO) {
        // 1. 查询当前故事
        StoryNodeDO current = storyNodeMapper.selectOne(new LambdaQueryWrapper<StoryNodeDO>()
                .eq(StoryNodeDO::getId, reqVO.getId())
                .eq(StoryNodeDO::getIsDeleted, false)
                .eq(StoryNodeDO::getIsVisible, 1));
        if (current == null) {
            return Response.success();
        }

        // 2. 按“章节顺序 -> 章节内发生时间 -> 故事 ID”查找相邻故事。
        // 不能只按全局时间或 ID 查找，否则补录旧故事、章节时间交叉时会跳错章节。
        List<StoryNodeDO> orderedStories = queryOrderedVisibleStories();
        int currentIndex = -1;
        for (int i = 0; i < orderedStories.size(); i++) {
            if (Objects.equals(orderedStories.get(i).getId(), current.getId())) {
                currentIndex = i;
                break;
            }
        }

        StoryNodeDO preNode = currentIndex > 0 ? orderedStories.get(currentIndex - 1) : null;
        StoryNodeDO nextNode = currentIndex >= 0 && currentIndex < orderedStories.size() - 1
                ? orderedStories.get(currentIndex + 1)
                : null;

        // 3. 查询章节名称
        String chapterName = null;
        if (current.getChapterId() != null) {
            StoryChapterDO chapter = storyChapterMapper.selectById(current.getChapterId());
            chapterName = chapter != null ? chapter.getName() : null;
        }

        // 4. 组装返回
        StoryDetailRspVO vo = StoryDetailRspVO.builder()
                .id(current.getId())
                .title(current.getTitle())
                .summary(current.getSummary())
                .content(current.getContent())
                .coverImage(current.getCoverImage())
                .happenedTime(current.getHappenedTime())
                .location(current.getLocation())
                .isMilestone(current.getIsMilestone())
                .tagLabel(current.getTagLabel())
                .tagColor(current.getTagColor())
                .chapterName(chapterName)
                .preStory(preNode != null ? StoryNeighborVO.builder()
                        .id(preNode.getId()).title(preNode.getTitle()).build() : null)
                .nextStory(nextNode != null ? StoryNeighborVO.builder()
                        .id(nextNode.getId()).title(nextNode.getTitle()).build() : null)
                .build();

        return Response.success(vo);
    }

    /**
     * 查询前台可见故事的完整阅读顺序。
     * 第一排序维度是章节 sort_order；同一章节内按发生时间、ID 升序。
     */
    private List<StoryNodeDO> queryOrderedVisibleStories() {
        List<StoryChapterDO> chapters = storyChapterMapper.selectList(
                new LambdaQueryWrapper<StoryChapterDO>()
                        .eq(StoryChapterDO::getIsVisible, 1)
                        .orderByAsc(StoryChapterDO::getSortOrder)
                        .orderByAsc(StoryChapterDO::getId)
        );
        if (CollUtil.isEmpty(chapters)) {
            return Collections.emptyList();
        }

        Map<Long, Integer> chapterOrder = new HashMap<>();
        for (int i = 0; i < chapters.size(); i++) {
            chapterOrder.put(chapters.get(i).getId(), i);
        }

        List<StoryNodeDO> stories = storyNodeMapper.selectList(
                new LambdaQueryWrapper<StoryNodeDO>()
                        .in(StoryNodeDO::getChapterId, chapterOrder.keySet())
                        .eq(StoryNodeDO::getIsVisible, 1)
                        .eq(StoryNodeDO::getIsDeleted, false)
        );

        Comparator<LocalDateTime> happenedTimeComparator = Comparator.nullsLast(Comparator.naturalOrder());
        Comparator<Long> idComparator = Comparator.nullsLast(Comparator.naturalOrder());
        stories.sort(Comparator
                .comparingInt((StoryNodeDO story) -> chapterOrder.get(story.getChapterId()))
                .thenComparing(StoryNodeDO::getHappenedTime, happenedTimeComparator)
                .thenComparing(StoryNodeDO::getId, idComparator));
        return stories;
    }

    private StoryChapterVO buildChapterVO(StoryChapterDO storyChapterDO,
                                          Map<Long, List<StoryNodeDO>> chapterIdAndNodeMap) {
        List<StoryNodeDO> storyNodeDOS = chapterIdAndNodeMap
                .getOrDefault(storyChapterDO.getId(), Collections.emptyList());

        // 章节的起始时间从故事节点获取
        LocalDateTime startDate = storyNodeDOS.stream().map(StoryNodeDO::getHappenedTime)
                .filter(Objects::nonNull)
                .min(Comparator.naturalOrder())
                .orElse(null);

        LocalDateTime endDate = storyNodeDOS.stream().map(StoryNodeDO::getHappenedTime)
                .filter(Objects::nonNull)
                .max(Comparator.naturalOrder())
                .orElse(null);

        return StoryChapterVO.builder()
                .id(storyChapterDO.getId())
                .name(storyChapterDO.getName())
                .colorCode(storyChapterDO.getColorCode())
                .sortOrder(storyChapterDO.getSortOrder())
                .startDate(startDate)
                .endDate(endDate)
                .nodeCount(storyNodeDOS.size())
                .build();
    }
}
