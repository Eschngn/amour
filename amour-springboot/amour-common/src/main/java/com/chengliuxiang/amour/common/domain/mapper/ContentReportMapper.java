package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.chengliuxiang.amour.common.domain.dos.ContentReportDO;

import java.util.List;

public interface ContentReportMapper extends BaseMapper<ContentReportDO> {

    default IPage<ContentReportDO> selectAdminPage(long current, long size, Integer status,
                                                   String contentType, Long spaceId) {
        return selectPage(new Page<>(current, size), new LambdaQueryWrapper<ContentReportDO>()
                .eq(status != null, ContentReportDO::getStatus, status)
                .eq(contentType != null, ContentReportDO::getContentType, contentType)
                .eq(spaceId != null, ContentReportDO::getSpaceId, spaceId)
                .orderByDesc(ContentReportDO::getCreateTime)
                .orderByDesc(ContentReportDO::getId));
    }

    default List<ContentReportDO> selectPendingList() {
        return selectList(new LambdaQueryWrapper<ContentReportDO>()
                .eq(ContentReportDO::getStatus, 0)
                .orderByAsc(ContentReportDO::getCreateTime));
    }

    default Long countPending() {
        return selectCount(new LambdaQueryWrapper<ContentReportDO>()
                .eq(ContentReportDO::getStatus, 0));
    }

    default Long countByTarget(String contentType, Long contentId) {
        return selectCount(new LambdaQueryWrapper<ContentReportDO>()
                .eq(ContentReportDO::getContentType, contentType)
                .eq(ContentReportDO::getContentId, contentId));
    }

    default int insertReport(ContentReportDO report) {
        return insert(report);
    }

    default int updateReport(ContentReportDO report) {
        return update(report, new LambdaUpdateWrapper<ContentReportDO>()
                .eq(ContentReportDO::getId, report.getId())
                .eq(ContentReportDO::getSpaceId, report.getSpaceId()));
    }
}
