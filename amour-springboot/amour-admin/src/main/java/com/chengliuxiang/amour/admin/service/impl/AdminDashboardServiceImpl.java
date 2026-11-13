package com.chengliuxiang.amour.admin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.chengliuxiang.amour.admin.model.vo.dashboard.AdminDashboardActivityDailyVO;
import com.chengliuxiang.amour.admin.model.vo.dashboard.AdminDashboardActivityReqVO;
import com.chengliuxiang.amour.admin.model.vo.dashboard.AdminDashboardActivityVO;
import com.chengliuxiang.amour.admin.model.vo.dashboard.AdminDashboardSummaryVO;
import com.chengliuxiang.amour.admin.security.AdminAuthorizationService;
import com.chengliuxiang.amour.admin.service.AdminDashboardService;
import com.chengliuxiang.amour.common.constant.AdminPermissionConstants;
import com.chengliuxiang.amour.common.constant.PageViewConstants;
import com.chengliuxiang.amour.common.domain.dos.CoupleSpaceDO;
import com.chengliuxiang.amour.common.domain.dos.UserDO;
import com.chengliuxiang.amour.common.domain.mapper.ContentReportMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleSpaceMapper;
import com.chengliuxiang.amour.common.domain.mapper.PageViewEventMapper;
import com.chengliuxiang.amour.common.domain.mapper.UserMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.model.stat.PageViewDailyStat;
import com.chengliuxiang.amour.common.utils.Response;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 工作台只使用数据库真实计数，不展示推算或虚构的活跃度指标。
 */
@Service
public class AdminDashboardServiceImpl implements AdminDashboardService {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final ZoneId ZONE = ZoneId.of(PageViewConstants.TIME_ZONE);

    @Resource
    private CoupleSpaceMapper coupleSpaceMapper;
    @Resource
    private ContentReportMapper contentReportMapper;
    @Resource
    private UserMapper userMapper;
    @Resource
    private PageViewEventMapper pageViewEventMapper;
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

    @Override
    public Response<AdminDashboardActivityVO> activity(AdminDashboardActivityReqVO reqVO) {
        adminAuthorizationService.requirePermission(AdminPermissionConstants.DASHBOARD_QUERY);

        LocalDate today = LocalDate.now(ZONE);
        LocalDate startDate;
        LocalDate endDate;
        boolean startBlank = reqVO == null || isBlank(reqVO.getStartDate());
        boolean endBlank = reqVO == null || isBlank(reqVO.getEndDate());
        if (startBlank && endBlank) {
            endDate = today;
            startDate = today.minusDays(PageViewConstants.DEFAULT_RANGE_DAYS - 1L);
        } else if (startBlank || endBlank) {
            throw new BizException(ResponseCodeEnum.ACTIVITY_RANGE_INVALID);
        } else {
            startDate = parseDate(reqVO.getStartDate());
            endDate = parseDate(reqVO.getEndDate());
        }

        if (endDate.isAfter(today) || startDate.isAfter(endDate)) {
            throw new BizException(ResponseCodeEnum.ACTIVITY_RANGE_INVALID);
        }
        long dayCount = ChronoUnit.DAYS.between(startDate, endDate) + 1;
        if (dayCount > PageViewConstants.MAX_RANGE_DAYS) {
            throw new BizException(ResponseCodeEnum.ACTIVITY_RANGE_TOO_LARGE);
        }

        LocalDate previousEnd = startDate.minusDays(1);
        LocalDate previousStart = previousEnd.minusDays(dayCount - 1);

        List<PageViewDailyStat> rows = pageViewEventMapper.selectDailyStats(
                startDate.toString(), endDate.toString());
        Map<String, PageViewDailyStat> statByDate = new HashMap<>();
        if (rows != null) {
            for (PageViewDailyStat row : rows) {
                if (row != null && row.getViewDate() != null) {
                    statByDate.put(row.getViewDate(), row);
                }
            }
        }

        List<AdminDashboardActivityDailyVO> daily = new ArrayList<>((int) dayCount);
        long totalPv = 0L;
        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            PageViewDailyStat stat = statByDate.get(date.toString());
            long pv = stat == null ? 0L : safeLong(stat.getPv());
            long uv = stat == null ? 0L : safeLong(stat.getUv());
            totalPv += pv;
            daily.add(AdminDashboardActivityDailyVO.builder()
                    .date(date.toString())
                    .pv(pv)
                    .uv(uv)
                    .build());
        }

        Long totalUvValue = pageViewEventMapper.countDistinctVisitors(
                startDate.toString(), endDate.toString());
        long totalUv = safeLong(totalUvValue);

        long previousPv = 0L;
        List<PageViewDailyStat> previousRows = pageViewEventMapper.selectDailyStats(
                previousStart.toString(), previousEnd.toString());
        if (previousRows != null) {
            for (PageViewDailyStat row : previousRows) {
                previousPv += row == null ? 0L : safeLong(row.getPv());
            }
        }
        Long previousUvValue = pageViewEventMapper.countDistinctVisitors(
                previousStart.toString(), previousEnd.toString());
        long previousUv = safeLong(previousUvValue);

        return Response.success(AdminDashboardActivityVO.builder()
                .startDate(startDate.toString())
                .endDate(endDate.toString())
                .days((int) dayCount)
                .totalPv(totalPv)
                .totalUv(totalUv)
                .averagePv(round1((double) totalPv / dayCount))
                .averageUv(round1((double) totalUv / dayCount))
                .previousStartDate(previousStart.toString())
                .previousEndDate(previousEnd.toString())
                .previousTotalPv(previousPv)
                .previousTotalUv(previousUv)
                .pvChangeRate(changeRate(totalPv, previousPv))
                .uvChangeRate(changeRate(totalUv, previousUv))
                .daily(daily)
                .generatedAt(LocalDateTime.now(ZONE).format(FORMATTER))
                .timezone(PageViewConstants.TIME_ZONE)
                .coverage(PageViewConstants.COVERAGE_WEB_SPA)
                .maxRangeDays(PageViewConstants.MAX_RANGE_DAYS)
                .retentionDays(PageViewConstants.RETENTION_DAYS)
                .build());
    }

    private LocalDate parseDate(String raw) {
        try {
            return LocalDate.parse(raw.trim(), DateTimeFormatter.ISO_LOCAL_DATE);
        } catch (DateTimeParseException | NullPointerException exception) {
            throw new BizException(ResponseCodeEnum.ACTIVITY_RANGE_INVALID);
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    /**
     * 上一周期为 0 时不计算百分比，避免出现 Infinity / NaN。
     */
    private Double changeRate(long current, long previous) {
        if (previous <= 0) {
            return null;
        }
        return round1((current - previous) * 100.0 / previous);
    }

    private Double round1(double value) {
        if (Double.isNaN(value) || Double.isInfinite(value)) {
            return null;
        }
        return Math.round(value * 10.0) / 10.0;
    }

    private long count(Long value) {
        return value == null ? 0L : value;
    }

    private long number(Object value) {
        return value instanceof Number ? ((Number) value).longValue() : 0L;
    }

    private long safeLong(Long value) {
        return value == null ? 0L : value;
    }
}
