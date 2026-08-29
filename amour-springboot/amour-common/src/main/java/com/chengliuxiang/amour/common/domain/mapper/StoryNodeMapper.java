package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.chengliuxiang.amour.common.domain.dos.StoryNodeDO;
import java.util.Collection;
import java.util.List;

public interface StoryNodeMapper extends BaseMapper<StoryNodeDO> {

    default IPage<StoryNodeDO> selectAdminPage(long current, long size, String title) {
        return selectPage(new Page<>(current, size), new LambdaQueryWrapper<StoryNodeDO>()
                .like(title != null, StoryNodeDO::getTitle, title)
                .eq(StoryNodeDO::getIsDeleted, false)
                .orderByAsc(StoryNodeDO::getChapterId)
                .orderByAsc(StoryNodeDO::getHappenedTime));
    }

    default StoryNodeDO selectActiveById(Long id) {
        return selectOne(new LambdaQueryWrapper<StoryNodeDO>()
                .eq(StoryNodeDO::getId, id)
                .eq(StoryNodeDO::getIsDeleted, false));
    }

    default int insertStoryNode(StoryNodeDO node) {
        return insert(node);
    }

    default int updateStoryNode(StoryNodeDO node) {
        return updateById(node);
    }

    default List<StoryNodeDO> selectMilestones() {
        return selectList(new LambdaQueryWrapper<StoryNodeDO>()
                .eq(StoryNodeDO::getIsMilestone, true)
                .eq(StoryNodeDO::getIsDeleted, false)
                .orderByAsc(StoryNodeDO::getHappenedTime));
    }

    default List<StoryNodeDO> selectVisibleList() {
        return selectList(new LambdaQueryWrapper<StoryNodeDO>()
                .eq(StoryNodeDO::getIsVisible, 1)
                .eq(StoryNodeDO::getIsDeleted, false)
                .orderByAsc(StoryNodeDO::getChapterId)
                .orderByAsc(StoryNodeDO::getSortOrder));
    }

    default StoryNodeDO selectVisibleById(Long id) {
        return selectOne(new LambdaQueryWrapper<StoryNodeDO>().eq(StoryNodeDO::getId, id)
                .eq(StoryNodeDO::getIsDeleted, false).eq(StoryNodeDO::getIsVisible, 1));
    }

    default List<StoryNodeDO> selectVisibleByChapterId(Long chapterId) {
        return selectList(new LambdaQueryWrapper<StoryNodeDO>()
                .eq(StoryNodeDO::getChapterId, chapterId)
                .eq(StoryNodeDO::getIsVisible, 1)
                .eq(StoryNodeDO::getIsDeleted, false)
                .orderByAsc(StoryNodeDO::getHappenedTime)
                .orderByAsc(StoryNodeDO::getId));
    }

    default List<StoryNodeDO> selectVisibleByChapterIds(Collection<Long> chapterIds) {
        return selectList(new LambdaQueryWrapper<StoryNodeDO>()
                .in(StoryNodeDO::getChapterId, chapterIds)
                .eq(StoryNodeDO::getIsVisible, 1)
                .eq(StoryNodeDO::getIsDeleted, false));
    }
}
