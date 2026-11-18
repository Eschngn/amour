package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.chengliuxiang.amour.common.domain.dos.PageViewEventDO;
import com.chengliuxiang.amour.common.model.stat.PageViewChannelStat;
import com.chengliuxiang.amour.common.model.stat.PageViewDailyChannelStat;
import com.chengliuxiang.amour.common.model.stat.PageViewDailyStat;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 页面浏览事件与活跃度聚合。
 *
 * <p>所有聚合查询都限定在 {@code view_date} 的闭区间内，并依赖
 * {@code (view_date, client_type, visitor_key)} 索引，避免对事件表做无界全表扫描。
 * {@code view_date} 在 SQLite 与 MySQL 中都使用 yyyy-MM-dd 字符串存储，
 * 因此日期比较、分组和 COUNT(DISTINCT) 在两种数据库上语义一致。</p>
 *
 * <p>渠道（client_type）只作为统计分组维度，任何查询都不得把它当作权限条件。
 * 历史数据没有渠道字段，迁移时统一回填为 web。</p>
 */
public interface PageViewEventMapper extends BaseMapper<PageViewEventDO> {

    /**
     * 每日 PV / UV（全部渠道合计）。只返回有数据的日期，缺失日期由服务层补 0。
     */
    @Select("SELECT view_date AS viewDate, COUNT(*) AS pv, COUNT(DISTINCT visitor_key) AS uv "
            + "FROM page_view_event "
            + "WHERE view_date >= #{startDate} AND view_date <= #{endDate} "
            + "GROUP BY view_date ORDER BY view_date ASC")
    List<PageViewDailyStat> selectDailyStats(@Param("startDate") String startDate,
                                             @Param("endDate") String endDate);

    /**
     * 渠道归一化 SQL 片段。
     *
     * <p>迁移后 {@code client_type} 已有 NOT NULL DEFAULT 'web'，但仍对手工导入的
     * NULL / 空串 / 大小写变体做一次归一，保证 SQLite 与 MySQL 的分组语义一致：
     * 缺省值统一归为 web，大小写差异统一为小写。<p>
     */
    String NORMALIZED_CLIENT_TYPE = "CASE WHEN client_type IS NULL OR TRIM(client_type) = '' "
            + "THEN 'web' ELSE LOWER(TRIM(client_type)) END";

    /**
     * 按日期 + 渠道聚合的 PV / UV。只返回有数据的组合，缺失日期与渠道由服务层补 0。
     *
     * <p>渠道表达式与 GROUP BY 使用同一归一化结果，避免 NULL / 空串 / 大小写变体
     * 被拆成多个分组，导致同一渠道的数值被拆分。</p>
     */
    @Select("SELECT view_date AS viewDate, " + NORMALIZED_CLIENT_TYPE + " AS clientType, "
            + "COUNT(*) AS pv, COUNT(DISTINCT visitor_key) AS uv "
            + "FROM page_view_event "
            + "WHERE view_date >= #{startDate} AND view_date <= #{endDate} "
            + "GROUP BY view_date, " + NORMALIZED_CLIENT_TYPE + " "
            + "ORDER BY view_date ASC, " + NORMALIZED_CLIENT_TYPE + " ASC")
    List<PageViewDailyChannelStat> selectDailyChannelStats(@Param("startDate") String startDate,
                                                           @Param("endDate") String endDate);

    /**
     * 区间去重访客数（全部渠道合计）。UV 不能由每日 UV 相加得到，必须整段区间单独去重。
     */
    @Select("SELECT COUNT(DISTINCT visitor_key) FROM page_view_event "
            + "WHERE view_date >= #{startDate} AND view_date <= #{endDate}")
    Long countDistinctVisitors(@Param("startDate") String startDate,
                               @Param("endDate") String endDate);

    /**
     * 按渠道统计区间 PV / UV。区间 UV 必须按渠道单独去重，
     * 既不能由每日 UV 相加，也不能由各渠道 UV 相加得到总量。
     */
    @Select("SELECT " + NORMALIZED_CLIENT_TYPE + " AS clientType, COUNT(*) AS pv, "
            + "COUNT(DISTINCT visitor_key) AS uv "
            + "FROM page_view_event "
            + "WHERE view_date >= #{startDate} AND view_date <= #{endDate} "
            + "GROUP BY " + NORMALIZED_CLIENT_TYPE)
    List<PageViewChannelStat> selectChannelStats(@Param("startDate") String startDate,
                                                 @Param("endDate") String endDate);

    /**
     * 删除保留期之前的事件，由每日清理任务调用。
     */
    @Delete("DELETE FROM page_view_event WHERE view_date < #{beforeDate}")
    int deleteBefore(@Param("beforeDate") String beforeDate);

    /**
     * 幂等键是否已存在。SQLite 与 MySQL 对唯一约束的错误类型不同，
     * 服务层在写入异常后用它确认是否为重复事件。
     */
    @Select("SELECT COUNT(*) FROM page_view_event WHERE event_id = #{eventId}")
    Long countByEventId(@Param("eventId") String eventId);
}
