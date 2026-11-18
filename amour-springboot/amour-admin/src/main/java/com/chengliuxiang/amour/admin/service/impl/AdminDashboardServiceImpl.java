package com.chengliuxiang.amour.admin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.chengliuxiang.amour.admin.model.vo.dashboard.AdminDashboardActivityChannelDailyVO;
import com.chengliuxiang.amour.admin.model.vo.dashboard.AdminDashboardActivityChannelVO;
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
import com.chengliuxiang.amour.common.domain.mapper.CoupleSpaceMapper;
import com.chengliuxiang.amour.common.domain.mapper.PageViewEventMapper;
import com.chengliuxiang.amour.common.domain.mapper.SpacePublishedItemMapper;
import com.chengliuxiang.amour.common.domain.mapper.SpaceReviewItemMapper;
import com.chengliuxiang.amour.common.domain.mapper.SpaceReviewSubmissionMapper;
import com.chengliuxiang.amour.common.domain.mapper.UserMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.model.stat.PageViewChannelStat;
import com.chengliuxiang.amour.common.model.stat.PageViewDailyChannelStat;
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
import java.util.LinkedHashMap;
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
    private SpaceReviewSubmissionMapper spaceReviewSubmissionMapper;
    @Resource
    private SpaceReviewItemMapper spaceReviewItemMapper;
    @Resource
    private SpacePublishedItemMapper spacePublishedItemMapper;
    @Resource
    private UserMapper userMapper;
    @Resource
    private PageViewEventMapper pageViewEventMapper;
    @Resource
    private AdminAuthorizationService adminAuthorizationService;

    @Override
    public Response<AdminDashboardSummaryVO> summary() {
        adminAuthorizationService.requirePermission(AdminPermissionConstants.DASHBOARD_QUERY);

        long pendingSpaceReviews = spaceReviewSubmissionMapper.countPendingSpaces();
        long pendingReviewItems = spaceReviewItemMapper.countPendingItems();
        long pendingContentReviews = spaceReviewItemMapper.countPendingContentItems();
        LocalDateTime recentSince = LocalDateTime.now().minusDays(7);
        long recentRejected = spaceReviewSubmissionMapper.countByStatusSince("REJECTED", recentSince);
        long recentUnpublished = spacePublishedItemMapper.countRecentlyUnpublished(recentSince);
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
        long destroyed = 0;
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
                case 6:
                    destroyed = count;
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
                .pendingSpaceReviewCount(pendingSpaceReviews)
                .pendingReviewItemCount(pendingReviewItems)
                .pendingContentReviewCount(pendingContentReviews)
                .recentRejectedReviewCount(recentRejected)
                .recentUnpublishedCount(recentUnpublished)
                .totalSpaceCount(totalSpaces)
                .waitingSpaceCount(waiting)
                .normalSpaceCount(normal)
                .frozenSpaceCount(frozen)
                .archivedSpaceCount(archived)
                .unbindPendingSpaceCount(pendingUnbind)
                .unboundSpaceCount(unbound)
                .destroyedSpaceCount(destroyed)
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

        String startKey = startDate.toString();
        String endKey = endDate.toString();
        String previousStartKey = previousStart.toString();
        String previousEndKey = previousEnd.toString();

        // 每日合计：保持原有 totalPv / daily.pv 口径不变。
        List<PageViewDailyStat> rows = pageViewEventMapper.selectDailyStats(startKey, endKey);
        Map<String, PageViewDailyStat> statByDate = new HashMap<>();
        if (rows != null) {
            for (PageViewDailyStat row : rows) {
                if (row != null && row.getViewDate() != null) {
                    statByDate.put(row.getViewDate(), row);
                }
            }
        }

        // 每日分渠道：缺失的日期 + 渠道组合由服务层补 0。
        Map<String, Map<String, PageViewDailyChannelStat>> channelStatsByDate = new HashMap<>();
        List<PageViewDailyChannelStat> channelRows =
                pageViewEventMapper.selectDailyChannelStats(startKey, endKey);
        if (channelRows != null) {
            for (PageViewDailyChannelStat row : channelRows) {
                if (row == null || row.getViewDate() == null) {
                    continue;
                }
                // 迁移后 client_type 已有默认值；这里再兜底一次，避免手工导入的旧数据落空。
                String clientType = PageViewConstants.normalizeClientType(row.getClientType());
                if (clientType == null) {
                    continue;
                }
                channelStatsByDate
                        .computeIfAbsent(row.getViewDate(), key -> new HashMap<>())
                        .put(clientType, row);
            }
        }

        List<AdminDashboardActivityDailyVO> daily = new ArrayList<>((int) dayCount);
        List<Map<String, AdminDashboardActivityChannelDailyVO>> channelDailyByDay =
                new ArrayList<>((int) dayCount);
        long totalPv = 0L;
        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            String dateKey = date.toString();
            PageViewDailyStat stat = statByDate.get(dateKey);
            long pv = stat == null ? 0L : safeLong(stat.getPv());
            long uv = stat == null ? 0L : safeLong(stat.getUv());
            totalPv += pv;

            Map<String, PageViewDailyChannelStat> channelStats =
                    channelStatsByDate.getOrDefault(dateKey, Collections.emptyMap());
            long webPv = channelPv(channelStats, PageViewConstants.CLIENT_TYPE_WEB);
            long webUv = channelUv(channelStats, PageViewConstants.CLIENT_TYPE_WEB);
            long miniPv = channelPv(channelStats, PageViewConstants.CLIENT_TYPE_MINIPROGRAM);
            long miniUv = channelUv(channelStats, PageViewConstants.CLIENT_TYPE_MINIPROGRAM);

            daily.add(AdminDashboardActivityDailyVO.builder()
                    .date(dateKey)
                    .pv(pv)
                    .uv(uv)
                    .webPv(webPv)
                    .webUv(webUv)
                    .miniprogramPv(miniPv)
                    .miniprogramUv(miniUv)
                    .build());

            Map<String, AdminDashboardActivityChannelDailyVO> perChannel =
                    new LinkedHashMap<>(PageViewConstants.SUPPORTED_CLIENT_TYPES.size());
            perChannel.put(PageViewConstants.CLIENT_TYPE_WEB,
                    AdminDashboardActivityChannelDailyVO.builder()
                            .date(dateKey).pv(webPv).uv(webUv).build());
            perChannel.put(PageViewConstants.CLIENT_TYPE_MINIPROGRAM,
                    AdminDashboardActivityChannelDailyVO.builder()
                            .date(dateKey).pv(miniPv).uv(miniUv).build());
            channelDailyByDay.add(perChannel);
        }

        // 区间 UV 必须整段去重，不能把每日 UV 相加。
        Long totalUvValue = pageViewEventMapper.countDistinctVisitors(startKey, endKey);
        long totalUv = safeLong(totalUvValue);

        long previousPv = 0L;
        List<PageViewDailyStat> previousRows =
                pageViewEventMapper.selectDailyStats(previousStartKey, previousEndKey);
        if (previousRows != null) {
            for (PageViewDailyStat row : previousRows) {
                previousPv += row == null ? 0L : safeLong(row.getPv());
            }
        }
        Long previousUvValue = pageViewEventMapper.countDistinctVisitors(previousStartKey, previousEndKey);
        long previousUv = safeLong(previousUvValue);

        // 分渠道区间数据：UV 按渠道独立整段去重。
        Map<String, PageViewChannelStat> channelStats = toChannelStatMap(
                pageViewEventMapper.selectChannelStats(startKey, endKey));
        Map<String, PageViewChannelStat> previousChannelStats = toChannelStatMap(
                pageViewEventMapper.selectChannelStats(previousStartKey, previousEndKey));

        List<AdminDashboardActivityChannelVO> channels =
                new ArrayList<>(PageViewConstants.SUPPORTED_CLIENT_TYPES.size());
        for (String clientType : PageViewConstants.SUPPORTED_CLIENT_TYPES) {
            PageViewChannelStat current = channelStats.get(clientType);
            PageViewChannelStat previous = previousChannelStats.get(clientType);
            long channelPv = current == null ? 0L : safeLong(current.getPv());
            long channelUv = current == null ? 0L : safeLong(current.getUv());
            long previousChannelPv = previous == null ? 0L : safeLong(previous.getPv());
            long previousChannelUv = previous == null ? 0L : safeLong(previous.getUv());

            List<AdminDashboardActivityChannelDailyVO> channelDaily =
                    new ArrayList<>((int) dayCount);
            for (int index = 0; index < channelDailyByDay.size(); index += 1) {
                String dateKey = daily.get(index).getDate();
                AdminDashboardActivityChannelDailyVO item = channelDailyByDay.get(index).get(clientType);
                channelDaily.add(item == null
                        ? AdminDashboardActivityChannelDailyVO.builder()
                                .date(dateKey).pv(0L).uv(0L).build()
                        : item);
            }

            channels.add(AdminDashboardActivityChannelVO.builder()
                    .clientType(clientType)
                    .clientTypeText(PageViewConstants.clientTypeText(clientType))
                    .totalPv(channelPv)
                    .totalUv(channelUv)
                    .averagePv(round1((double) channelPv / dayCount))
                    .averageUv(round1((double) channelUv / dayCount))
                    .pvShare(share(channelPv, totalPv))
                    .uvShare(share(channelUv, totalUv))
                    .previousTotalPv(previousChannelPv)
                    .previousTotalUv(previousChannelUv)
                    .pvChangeRate(changeRate(channelPv, previousChannelPv))
                    .uvChangeRate(changeRate(channelUv, previousChannelUv))
                    .daily(channelDaily)
                    .build());
        }

        return Response.success(AdminDashboardActivityVO.builder()
                .startDate(startKey)
                .endDate(endKey)
                .days((int) dayCount)
                .totalPv(totalPv)
                .totalUv(totalUv)
                .averagePv(round1((double) totalPv / dayCount))
                .averageUv(round1((double) totalUv / dayCount))
                .previousStartDate(previousStartKey)
                .previousEndDate(previousEndKey)
                .previousTotalPv(previousPv)
                .previousTotalUv(previousUv)
                .pvChangeRate(changeRate(totalPv, previousPv))
                .uvChangeRate(changeRate(totalUv, previousUv))
                .daily(daily)
                .channels(channels)
                .generatedAt(LocalDateTime.now(ZONE).format(FORMATTER))
                .timezone(PageViewConstants.TIME_ZONE)
                .coverage(PageViewConstants.COVERAGE_WEB_AND_MINIPROGRAM)
                .channelNote("渠道来自采集端上报的客户端类型标识（web / miniprogram），"
                        + "服务端按白名单校验，仅用于统计分组，不作为鉴权或权限判断依据。")
                .historyNote("渠道字段上线前的历史浏览记录没有渠道信息，迁移后统一按 Web 归类；"
                        + "历史数据无法反推真实小程序来源，不做猜测性归属。")
                .maxRangeDays(PageViewConstants.MAX_RANGE_DAYS)
                .retentionDays(PageViewConstants.RETENTION_DAYS)
                .build());
    }

    /**
     * 渠道聚合结果按渠道索引；缺少的渠道由调用方补 0。
     */
    private Map<String, PageViewChannelStat> toChannelStatMap(List<PageViewChannelStat> rows) {
        Map<String, PageViewChannelStat> result = new HashMap<>();
        if (rows == null) {
            return result;
        }
        for (PageViewChannelStat row : rows) {
            if (row == null) {
                continue;
            }
            String clientType = PageViewConstants.normalizeClientType(row.getClientType());
            if (clientType == null) {
                continue;
            }
            result.put(clientType, row);
        }
        return result;
    }

    private long channelPv(Map<String, PageViewDailyChannelStat> stats, String clientType) {
        PageViewDailyChannelStat stat = stats.get(clientType);
        return stat == null ? 0L : safeLong(stat.getPv());
    }

    private long channelUv(Map<String, PageViewDailyChannelStat> stats, String clientType) {
        PageViewDailyChannelStat stat = stats.get(clientType);
        return stat == null ? 0L : safeLong(stat.getUv());
    }

    /**
     * 占比：总量为 0 时返回 null，前端显示“—”，不出现 NaN / Infinity。
     */
    private Double share(long part, long total) {
        if (total <= 0) {
            return null;
        }
        return round1(part * 100.0 / total);
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
