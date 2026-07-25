package com.chengliuxiang.amour.web.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.chengliuxiang.amour.common.domain.dos.StoryChapterDO;
import com.chengliuxiang.amour.common.domain.dos.StoryNodeDO;
import com.chengliuxiang.amour.common.domain.mapper.StoryChapterMapper;
import com.chengliuxiang.amour.common.domain.mapper.StoryNodeMapper;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.story.StoryDetailReqVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryDetailRspVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StoryServiceImplTest {

    @Mock
    private StoryNodeMapper storyNodeMapper;

    @Mock
    private StoryChapterMapper storyChapterMapper;

    @InjectMocks
    private StoryServiceImpl storyService;

    private StoryChapterDO chapterThree;
    private StoryChapterDO chapterFour;
    private StoryNodeDO chapterThreeFirst;
    private StoryNodeDO chapterThreeLast;
    private StoryNodeDO chapterFourFirst;
    private StoryNodeDO chapterFourSecond;

    @BeforeEach
    void setUp() {
        chapterThree = chapter(3L, "第三章", 3);
        chapterFour = chapter(4L, "第四章", 4);

        // 第四章的 ID 和发生时间都更小，用于证明章节顺序才是第一排序条件。
        chapterThreeFirst = story(80L, 3L, "第三章第一篇", "2026-01-01T10:00:00");
        chapterThreeLast = story(100L, 3L, "第三章最后一篇", "2026-02-01T10:00:00");
        chapterFourFirst = story(2L, 4L, "第四章第一篇", "2024-01-01T10:00:00");
        chapterFourSecond = story(3L, 4L, "第四章第二篇", "2024-02-01T10:00:00");

        when(storyChapterMapper.selectList(any(LambdaQueryWrapper.class)))
                .thenReturn(Arrays.asList(chapterThree, chapterFour));
        when(storyNodeMapper.selectList(any(LambdaQueryWrapper.class)))
                .thenReturn(Arrays.asList(
                        chapterFourSecond,
                        chapterThreeLast,
                        chapterFourFirst,
                        chapterThreeFirst
                ));
    }

    @Test
    void lastStoryOfChapterShouldNavigateToFirstStoryOfNextChapter() {
        when(storyNodeMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(chapterThreeLast);
        when(storyChapterMapper.selectById(3L)).thenReturn(chapterThree);

        StoryDetailRspVO detail = getDetail(100L);

        assertNotNull(detail.getPreStory());
        assertEquals(80L, detail.getPreStory().getId());
        assertNotNull(detail.getNextStory());
        assertEquals(2L, detail.getNextStory().getId());
        assertEquals("第四章第一篇", detail.getNextStory().getTitle());
    }

    @Test
    void firstStoryOfChapterShouldNavigateBackToLastStoryOfPreviousChapter() {
        when(storyNodeMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(chapterFourFirst);
        when(storyChapterMapper.selectById(4L)).thenReturn(chapterFour);

        StoryDetailRspVO detail = getDetail(2L);

        assertNotNull(detail.getPreStory());
        assertEquals(100L, detail.getPreStory().getId());
        assertEquals("第三章最后一篇", detail.getPreStory().getTitle());
        assertNotNull(detail.getNextStory());
        assertEquals(3L, detail.getNextStory().getId());
    }

    private StoryDetailRspVO getDetail(Long id) {
        Response<StoryDetailRspVO> response = storyService.getStoryDetail(
                StoryDetailReqVO.builder().id(id).build()
        );
        assertNotNull(response.getData());
        return response.getData();
    }

    private StoryChapterDO chapter(Long id, String name, Integer sortOrder) {
        return StoryChapterDO.builder()
                .id(id)
                .name(name)
                .sortOrder(sortOrder)
                .isVisible(true)
                .build();
    }

    private StoryNodeDO story(Long id, Long chapterId, String title, String happenedTime) {
        return StoryNodeDO.builder()
                .id(id)
                .chapterId(chapterId)
                .title(title)
                .happenedTime(LocalDateTime.parse(happenedTime))
                .isVisible(true)
                .isDeleted(false)
                .build();
    }
}
