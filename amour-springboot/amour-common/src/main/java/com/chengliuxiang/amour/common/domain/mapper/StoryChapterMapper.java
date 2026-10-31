package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
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
}
