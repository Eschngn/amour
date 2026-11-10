package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.chengliuxiang.amour.common.domain.dos.ContentReportHandleDO;

import java.util.Collection;
import java.util.Collections;
import java.util.List;

public interface ContentReportHandleMapper extends BaseMapper<ContentReportHandleDO> {

    default ContentReportHandleDO selectByReportId(Long reportId) {
        return selectOne(new LambdaQueryWrapper<ContentReportHandleDO>()
                .eq(ContentReportHandleDO::getReportId, reportId)
                .orderByDesc(ContentReportHandleDO::getId)
                .last("LIMIT 1"));
    }

    default List<ContentReportHandleDO> selectByReportIds(Collection<Long> reportIds) {
        if (reportIds == null || reportIds.isEmpty()) {
            return Collections.emptyList();
        }
        return selectList(new LambdaQueryWrapper<ContentReportHandleDO>()
                .in(ContentReportHandleDO::getReportId, reportIds));
    }

    default int insertHandle(ContentReportHandleDO handle) {
        return insert(handle);
    }
}
