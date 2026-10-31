package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.chengliuxiang.amour.common.domain.dos.StoryNodeImageDO;

import java.util.Collection;
import java.util.List;

public interface StoryNodeImageMapper extends BaseMapper<StoryNodeImageDO> {

    default List<StoryNodeImageDO> selectByNodeId(Long spaceId, Long nodeId) {
        return selectList(new LambdaQueryWrapper<StoryNodeImageDO>()
                .eq(StoryNodeImageDO::getSpaceId, spaceId)
                .eq(StoryNodeImageDO::getNodeId, nodeId)
                .orderByAsc(StoryNodeImageDO::getSortOrder));
    }

    default List<StoryNodeImageDO> selectByNodeIds(Long spaceId, Collection<Long> nodeIds) {
        return selectList(new LambdaQueryWrapper<StoryNodeImageDO>()
                .eq(StoryNodeImageDO::getSpaceId, spaceId)
                .in(StoryNodeImageDO::getNodeId, nodeIds)
                .orderByAsc(StoryNodeImageDO::getSortOrder));
    }

    default List<StoryNodeImageDO> selectBySpaceId(Long spaceId) {
        return selectList(new LambdaQueryWrapper<StoryNodeImageDO>()
                .eq(StoryNodeImageDO::getSpaceId, spaceId)
                .orderByAsc(StoryNodeImageDO::getSortOrder));
    }

    default int deleteByNodeId(Long spaceId, Long nodeId) {
        return delete(new LambdaQueryWrapper<StoryNodeImageDO>()
                .eq(StoryNodeImageDO::getSpaceId, spaceId)
                .eq(StoryNodeImageDO::getNodeId, nodeId));
    }
}
