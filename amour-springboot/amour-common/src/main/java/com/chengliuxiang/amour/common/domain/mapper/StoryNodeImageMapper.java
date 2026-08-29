package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.chengliuxiang.amour.common.domain.dos.StoryNodeImageDO;

import java.util.List;

public interface StoryNodeImageMapper extends BaseMapper<StoryNodeImageDO> {

    default List<StoryNodeImageDO> selectByNodeId(Long nodeId) {
        return selectList(new LambdaQueryWrapper<StoryNodeImageDO>()
                .eq(StoryNodeImageDO::getNodeId, nodeId)
                .orderByAsc(StoryNodeImageDO::getSortOrder));
    }
}
