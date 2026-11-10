package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.chengliuxiang.amour.common.domain.dos.ContentReportDO;

import java.time.LocalDateTime;
import java.util.List;

public interface ContentReportMapper extends BaseMapper<ContentReportDO> {

    default IPage<ContentReportDO> selectAdminPage(long current, long size, Integer status,
                                                   String contentType, Long spaceId,
                                                   LocalDateTime startTime, LocalDateTime endTime) {
        return selectPage(new Page<>(current, size), new LambdaQueryWrapper<ContentReportDO>()
                .eq(status != null, ContentReportDO::getStatus, status)
                .eq(contentType != null, ContentReportDO::getContentType, contentType)
                .eq(spaceId != null, ContentReportDO::getSpaceId, spaceId)
                .ge(startTime != null, ContentReportDO::getCreateTime, startTime)
                .le(endTime != null, ContentReportDO::getCreateTime, endTime)
                .orderByDesc(ContentReportDO::getCreateTime)
                .orderByDesc(ContentReportDO::getId));
    }

    /**
     * 同一举报只允许被处理一次；条件更新保证并发下只有一个管理员成功。
     */
    default int claimProcess(Long id, Long adminUserId, Integer status, LocalDateTime processedAt) {
        return update(null, new LambdaUpdateWrapper<ContentReportDO>()
                .eq(ContentReportDO::getId, id)
                .eq(ContentReportDO::getStatus, 0)
                .set(ContentReportDO::getStatus, status)
                .set(ContentReportDO::getProcessedBy, adminUserId)
                .set(ContentReportDO::getProcessedAt, processedAt)
                .set(ContentReportDO::getUpdateTime, processedAt));
    }

    /**
     * 同一用户对同一目标的待处理举报去重。
     */
    default ContentReportDO selectPendingByReporterAndTarget(Long reporterUserId, String contentType, Long contentId) {
        return selectOne(new LambdaQueryWrapper<ContentReportDO>()
                .eq(ContentReportDO::getReporterUserId, reporterUserId)
                .eq(ContentReportDO::getContentType, contentType)
                .eq(ContentReportDO::getContentId, contentId)
                .eq(ContentReportDO::getStatus, 0)
                .orderByDesc(ContentReportDO::getId)
                .last("LIMIT 1"));
    }

    default Long countByReporterSince(Long reporterUserId, LocalDateTime since) {
        return selectCount(new LambdaQueryWrapper<ContentReportDO>()
                .eq(ContentReportDO::getReporterUserId, reporterUserId)
                .ge(ContentReportDO::getCreateTime, since));
    }

    default List<ContentReportDO> selectByTarget(String contentType, Long contentId, int limit) {
        return selectPage(new Page<>(1, limit, false), new LambdaQueryWrapper<ContentReportDO>()
                .eq(ContentReportDO::getContentType, contentType)
                .eq(ContentReportDO::getContentId, contentId)
                .orderByDesc(ContentReportDO::getCreateTime)
                .orderByDesc(ContentReportDO::getId))
                .getRecords();
    }

    default List<ContentReportDO> selectByTargets(String contentType, java.util.Collection<Long> contentIds) {
        if (contentIds == null || contentIds.isEmpty()) {
            return java.util.Collections.emptyList();
        }
        return selectList(new LambdaQueryWrapper<ContentReportDO>()
                .eq(ContentReportDO::getContentType, contentType)
                .in(ContentReportDO::getContentId, contentIds));
    }

    default Long countPendingByTarget(String contentType, Long contentId) {
        return selectCount(new LambdaQueryWrapper<ContentReportDO>()
                .eq(ContentReportDO::getContentType, contentType)
                .eq(ContentReportDO::getContentId, contentId)
                .eq(ContentReportDO::getStatus, 0));
    }

    default List<ContentReportDO> selectPendingBySpaceId(Long spaceId) {
        return selectList(new LambdaQueryWrapper<ContentReportDO>()
                .eq(ContentReportDO::getSpaceId, spaceId)
                .eq(ContentReportDO::getStatus, 0));
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
