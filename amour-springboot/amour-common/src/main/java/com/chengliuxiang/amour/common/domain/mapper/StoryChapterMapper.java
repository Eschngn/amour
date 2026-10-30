package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.chengliuxiang.amour.common.domain.dos.StoryChapterDO;
import java.util.List;

public interface StoryChapterMapper extends BaseMapper<StoryChapterDO> {

    default StoryChapterDO selectChapterById(Long id) {
        return selectById(id);
    }

    default List<StoryChapterDO> selectChaptersByIds(List<Long> ids) {
        return selectBatchIds(ids);
    }

    default List<StoryChapterDO> selectVisibleList() {
        return selectList(new LambdaQueryWrapper<StoryChapterDO>()
                .eq(StoryChapterDO::getIsVisible, 1)
                .orderByAsc(StoryChapterDO::getSortOrder));
    }
}
