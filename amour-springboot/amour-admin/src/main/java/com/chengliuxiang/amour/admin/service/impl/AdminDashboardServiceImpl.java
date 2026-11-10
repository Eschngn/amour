package com.chengliuxiang.amour.admin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.chengliuxiang.amour.admin.model.vo.dashboard.AdminDashboardSummaryVO;
import com.chengliuxiang.amour.admin.security.AdminAuthorizationService;
import com.chengliuxiang.amour.admin.service.AdminDashboardService;
import com.chengliuxiang.amour.common.constant.AdminPermissionConstants;
import com.chengliuxiang.amour.common.domain.dos.ContentReportDO;
import com.chengliuxiang.amour.common.domain.dos.CoupleSpaceDO;
import com.chengliuxiang.amour.common.domain.dos.UserDO;
import com.chengliuxiang.amour.common.domain.mapper.ContentReportMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleSpaceMapper;
import com.chengliuxiang.amour.common.domain.mapper.UserMapper;
import com.chengliuxiang.amour.common.utils.Response;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * 工作台只使用数据库真实计数，不展示推算或虚构的活跃度指标。
 */
@Service
public class AdminDashboardServiceImpl implements AdminDashboardService {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Resource
    private CoupleSpaceMapper coupleSpaceMapper;
    @Resource
    private ContentReportMapper contentReportMapper;
    @Resource
    private UserMapper userMapper;
    @Resource
    private AdminAuthorizationService adminAuthorizationService;

    @Override
    public Response<AdminDashboardSummaryVO> summary() {
        adminAuthorizationService.requirePermission(AdminPermissionConstants.DASHBOARD_QUERY);

        Long pendingReports = contentReportMapper.countPending();
        List<Map<String, Object>> statusRows = coupleSpaceMapper.selectStatusCounts();
        if (statusRows == null) {
            statusRows = Collections.emptyList();
        }
        long waiting = 0;
        long normal = 0;
        long frozen = 0;
        long archived = 0;
        long deleting = 0;
        long unbound = 0;
        long totalSpaces = 0;
        for (Map<String, Object> row : statusRows) {
            long count = number(row.get("total"));
            totalSpaces += count;
            int status = (int) number(row.get("status"));
            switch (status) {
                case 0:
                    waiting = count;
                    break;
                case 1:
                    normal = count;
                    break;
                case 2:
                    frozen = count;
                    break;
                case 3:
                    archived = count;
                    break;
                case 4:
                    deleting = count;
                    break;
                case 5:
                    unbound = count;
                    break;
                default:
                    break;
            }
        }

        long publicSpaces = count(coupleSpaceMapper.selectCount(
                new LambdaQueryWrapper<CoupleSpaceDO>()
                        .eq(CoupleSpaceDO::getStatus, 1)
                        .eq(CoupleSpaceDO::getVisibility, 1)));
        long totalUsers = count(userMapper.selectCount(new LambdaQueryWrapper<UserDO>()));
        long activeUsers = count(userMapper.selectCount(
                new LambdaQueryWrapper<UserDO>().eq(UserDO::getIsDeleted, false)));
        long platformAdmins = count(userMapper.selectCount(
                new LambdaQueryWrapper<UserDO>()
                        .eq(UserDO::getIsPlatformAdmin, true)
                        .eq(UserDO::getIsDeleted, false)));
        long pendingUnbind = count(coupleSpaceMapper.selectCount(
                new LambdaQueryWrapper<CoupleSpaceDO>()
                        .in(CoupleSpaceDO::getStatus, 0, 1, 2, 3)
                        .apply("EXISTS (SELECT 1 FROM couple_space_unbind_request r "
                                + "WHERE r.space_id = couple_space.id AND r.status = 0)")));

        return Response.success(AdminDashboardSummaryVO.builder()
                .pendingReportCount(pendingReports == null ? 0L : pendingReports)
                .totalSpaceCount(totalSpaces)
                .waitingSpaceCount(waiting)
                .normalSpaceCount(normal)
                .frozenSpaceCount(frozen)
                .archivedSpaceCount(archived)
                .unbindPendingSpaceCount(pendingUnbind)
                .unboundSpaceCount(unbound)
                .publicSpaceCount(publicSpaces)
                .totalUserCount(totalUsers)
                .activeUserCount(activeUsers)
                .platformAdminCount(platformAdmins)
                .generatedAt(LocalDateTime.now().format(FORMATTER))
                .build());
    }

    private long count(Long value) {
        return value == null ? 0L : value;
    }

    private long number(Object value) {
        return value instanceof Number ? ((Number) value).longValue() : 0L;
    }
}
