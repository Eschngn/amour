package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.chengliuxiang.amour.common.domain.dos.StoryChapterDO;
import java.util.List;

public interface StoryChapterMapper extends BaseMapper<StoryChapterDO> {

    default StoryChapterDO selectChapterById(Long spaceId, Long id) {
        return selectOne(new LambdaQueryWrapper<StoryChapterDO>()
                .eq(StoryChapterDO::getSpaceId, spaceId)
                .eq(StoryChapterDO::getId, id));
    }

    default List<StoryChapterDO> selectChaptersByIds(Long spaceId, List<Long> ids) {
        return selectList(new LambdaQueryWrapper<StoryChapterDO>()
                .eq(StoryChapterDO::getSpaceId, spaceId)
                .in(StoryChapterDO::getId, ids));
    }

    default List<StoryChapterDO> selectBySpaceId(Long spaceId) {
        return selectList(new LambdaQueryWrapper<StoryChapterDO>()
                .eq(StoryChapterDO::getSpaceId, spaceId)
                .orderByAsc(StoryChapterDO::getSortOrder)
                .orderByAsc(StoryChapterDO::getId));
    }

    default List<StoryChapterDO> selectVisibleBySpaceId(Long spaceId) {
        return selectList(new LambdaQueryWrapper<StoryChapterDO>()
                .eq(StoryChapterDO::getSpaceId, spaceId)
                .eq(StoryChapterDO::getIsVisible, true)
                .orderByAsc(StoryChapterDO::getSortOrder)
                .orderByAsc(StoryChapterDO::getId));
    }

    default Long countByName(Long spaceId, String name, Long excludedId) {
        return selectCount(new LambdaQueryWrapper<StoryChapterDO>()
                .eq(StoryChapterDO::getSpaceId, spaceId)
                .eq(StoryChapterDO::getName, name)
                .ne(excludedId != null, StoryChapterDO::getId, excludedId));
    }

    /**
     * 用户端编辑章节：条件同时包含 space_id，禁止跨空间改写。
     */
    default int updateChapter(StoryChapterDO chapter) {
        return update(null, new LambdaUpdateWrapper<StoryChapterDO>()
                .eq(StoryChapterDO::getId, chapter.getId())
                .eq(StoryChapterDO::getSpaceId, chapter.getSpaceId())
                .set(StoryChapterDO::getName, chapter.getName())
                .set(StoryChapterDO::getColorCode, chapter.getColorCode())
                .set(StoryChapterDO::getSortOrder, chapter.getSortOrder())
                .set(StoryChapterDO::getIsVisible, chapter.getIsVisible())
                .set(StoryChapterDO::getUpdateTime, chapter.getUpdateTime()));
    }

    /**
     * 删除章节：条件同时包含 space_id，禁止跨空间删除。
     */
    default int deleteChapter(Long spaceId, Long id) {
        return delete(new LambdaQueryWrapper<StoryChapterDO>()
                .eq(StoryChapterDO::getSpaceId, spaceId)
                .eq(StoryChapterDO::getId, id));
    }

    /**
     * 用户端管理列表：包含隐藏章节，按排序值展示。
     */
    default List<StoryChapterDO> selectManageList(Long spaceId) {
        return selectBySpaceId(spaceId);
    }
}
