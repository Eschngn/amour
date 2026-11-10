package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.chengliuxiang.amour.common.domain.dos.AdminAuditLogDO;
import org.apache.commons.lang3.StringUtils;

import java.time.LocalDateTime;

public interface AdminAuditLogMapper extends BaseMapper<AdminAuditLogDO> {

    default int insertAuditLog(AdminAuditLogDO auditLog) {
        return insert(auditLog);
    }

    default IPage<AdminAuditLogDO> selectAdminPage(long current, long size, String action,
                                                   String targetType, Long targetSpaceId,
                                                   Long adminUserId, LocalDateTime startTime,
                                                   LocalDateTime endTime) {
        return selectPage(new Page<>(current, size), new LambdaQueryWrapper<AdminAuditLogDO>()
                .eq(StringUtils.isNotBlank(action), AdminAuditLogDO::getAction, action)
                .eq(StringUtils.isNotBlank(targetType), AdminAuditLogDO::getTargetType, targetType)
                .eq(targetSpaceId != null, AdminAuditLogDO::getTargetSpaceId, targetSpaceId)
                .eq(adminUserId != null, AdminAuditLogDO::getAdminUserId, adminUserId)
                .ge(startTime != null, AdminAuditLogDO::getCreateTime, startTime)
                .le(endTime != null, AdminAuditLogDO::getCreateTime, endTime)
                .orderByDesc(AdminAuditLogDO::getCreateTime)
                .orderByDesc(AdminAuditLogDO::getId));
    }
}
