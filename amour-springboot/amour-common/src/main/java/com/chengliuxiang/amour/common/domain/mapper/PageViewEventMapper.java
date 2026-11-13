package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.chengliuxiang.amour.common.domain.dos.PageViewEventDO;
import com.chengliuxiang.amour.common.model.stat.PageViewDailyStat;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 页面浏览事件与活跃度聚合。
 *
 * <p>所有聚合查询都限定在 {@code view_date} 的闭区间内，并依赖
 * {@code (view_date, visitor_key)} 索引，避免对事件表做无界全表扫描。
 * {@code view_date} 在 SQLite 与 MySQL 中都使用 yyyy-MM-dd 字符串存储，
 * 因此日期比较、分组和 COUNT(DISTINCT) 在两种数据库上语义一致。</p>
 */
public interface PageViewEventMapper extends BaseMapper<PageViewEventDO> {

    /**
     * 每日 PV / UV。只返回有数据的日期，缺失日期由服务层补 0。
     */
    @Select("SELECT view_date AS viewDate, COUNT(*) AS pv, COUNT(DISTINCT visitor_key) AS uv "
            + "FROM page_view_event "
            + "WHERE view_date >= #{startDate} AND view_date <= #{endDate} "
            + "GROUP BY view_date ORDER BY view_date ASC")
    List<PageViewDailyStat> selectDailyStats(@Param("startDate") String startDate,
                                             @Param("endDate") String endDate);

    /**
     * 区间去重访客数。UV 不能由每日 UV 相加得到，必须整段区间单独去重。
     */
    @Select("SELECT COUNT(DISTINCT visitor_key) FROM page_view_event "
            + "WHERE view_date >= #{startDate} AND view_date <= #{endDate}")
    Long countDistinctVisitors(@Param("startDate") String startDate,
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
