package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.chengliuxiang.amour.common.domain.dos.StoryNodeDO;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface StoryNodeMapper extends BaseMapper<StoryNodeDO> {

    default IPage<StoryNodeDO> selectAdminPage(long current, long size, Long spaceId, String title) {
        return selectPage(new Page<>(current, size), new LambdaQueryWrapper<StoryNodeDO>()
                .eq(spaceId != null, StoryNodeDO::getSpaceId, spaceId)
                .like(title != null, StoryNodeDO::getTitle, title)
                .eq(StoryNodeDO::getIsDeleted, false)
                .orderByAsc(StoryNodeDO::getChapterId)
                .orderByAsc(StoryNodeDO::getHappenedTime));
    }

    /**
     * 后台治理分页：显式空间过滤、真实 visibility、可查看逻辑删除。
     */
    default IPage<StoryNodeDO> selectAdminGovernancePage(long current, long size, Long spaceId,
                                                         String keyword, Integer visibility,
                                                         boolean includeDeleted) {
        return selectPage(new Page<>(current, size), new LambdaQueryWrapper<StoryNodeDO>()
                .eq(spaceId != null, StoryNodeDO::getSpaceId, spaceId)
                .eq(!includeDeleted, StoryNodeDO::getIsDeleted, false)
                .eq(visibility != null, StoryNodeDO::getVisibility, visibility)
                .and(cn.hutool.core.util.StrUtil.isNotBlank(keyword), w -> w
                        .like(StoryNodeDO::getTitle, cn.hutool.core.util.StrUtil.trim(keyword))
                        .or().like(StoryNodeDO::getSummary, cn.hutool.core.util.StrUtil.trim(keyword)))
                .orderByDesc(StoryNodeDO::getUpdateTime)
                .orderByDesc(StoryNodeDO::getId));
    }

    /**
     * 后台详情：同时匹配 id 与 spaceId，不因逻辑删除而隐藏已删除内容。
     */
    default StoryNodeDO selectAdminById(Long spaceId, Long id) {
        return selectOne(new LambdaQueryWrapper<StoryNodeDO>()
                .eq(StoryNodeDO::getSpaceId, spaceId)
                .eq(StoryNodeDO::getId, id));
    }

    /**
     * 后台可见性处置：条件更新同时匹配 spaceId，避免跨空间篡改。
     */
    default int moderateVisibility(Long spaceId, Long id, Integer visibility,
                                   Long updatedBy, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<StoryNodeDO>()
                .eq(StoryNodeDO::getSpaceId, spaceId)
                .eq(StoryNodeDO::getId, id)
                .eq(StoryNodeDO::getIsDeleted, false)
                .set(StoryNodeDO::getVisibility, visibility)
                .set(StoryNodeDO::getUpdatedBy, updatedBy)
                .set(StoryNodeDO::getUpdateTime, updateTime));
    }

    default StoryNodeDO selectActiveById(Long spaceId, Long id) {
        return selectOne(new LambdaQueryWrapper<StoryNodeDO>()
                .eq(StoryNodeDO::getSpaceId, spaceId)
                .eq(StoryNodeDO::getId, id)
                .eq(StoryNodeDO::getIsDeleted, false));
    }

    /**
     * 审核通过前占用内容版本：版本不一致时返回 0，调用方必须拒绝本次审核。
     */
    default int claimRevision(Long spaceId, Long id, int expectedRevision, LocalDateTime now) {
        return update(null, new LambdaUpdateWrapper<StoryNodeDO>()
                .eq(StoryNodeDO::getSpaceId, spaceId)
                .eq(StoryNodeDO::getId, id)
                .eq(StoryNodeDO::getIsDeleted, false)
                .eq(StoryNodeDO::getRevision, expectedRevision)
                .setSql("revision = revision + 1")
                .set(StoryNodeDO::getUpdateTime, now));
    }

    default int insertStoryNode(StoryNodeDO node) {
        return insert(node);
    }

    /**
     * 用户端管理列表：包含隐藏内容，按全局排序值展示。
     *
     * <p>章节筛选后的列表由前端按 sort_order（章节内排序）重新排列，
     * 因此同一份数据可以同时支撑全局视图与章节视图。</p>
     */
    default List<StoryNodeDO> selectManageList(Long spaceId) {
        return selectList(new LambdaQueryWrapper<StoryNodeDO>()
                .eq(StoryNodeDO::getSpaceId, spaceId)
                .eq(StoryNodeDO::getIsDeleted, false)
                .orderByAsc(StoryNodeDO::getGlobalSortOrder)
                .orderByAsc(StoryNodeDO::getId));
    }

    /** 查询空间内最大的全局排序值，用于把新故事追加到全部故事末尾。 */
    default Integer findMaxGlobalSortOrder(Long spaceId) {
        StoryNodeDO last = selectOne(new LambdaQueryWrapper<StoryNodeDO>()
                .eq(StoryNodeDO::getSpaceId, spaceId)
                .eq(StoryNodeDO::getIsDeleted, false)
                .orderByDesc(StoryNodeDO::getGlobalSortOrder)
                .orderByDesc(StoryNodeDO::getId)
                .last("LIMIT 1"));
        return last == null || last.getGlobalSortOrder() == null ? 0 : last.getGlobalSortOrder();
    }

    /** 全局排序：只更新 global_sort_order，不触碰章节内排序。 */
    default int updateGlobalSortOrder(Long spaceId, Long id, Integer globalSortOrder) {
        return update(null, new LambdaUpdateWrapper<StoryNodeDO>()
                .eq(StoryNodeDO::getSpaceId, spaceId)
                .eq(StoryNodeDO::getId, id)
                .eq(StoryNodeDO::getIsDeleted, false)
                .set(StoryNodeDO::getGlobalSortOrder, globalSortOrder));
    }

    /**
     * 用户端软删除故事：条件同时包含 space_id，禁止跨空间删除。
     */
    default int softDelete(Long spaceId, Long id, Long userId, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<StoryNodeDO>()
                .eq(StoryNodeDO::getSpaceId, spaceId)
                .eq(StoryNodeDO::getId, id)
                .eq(StoryNodeDO::getIsDeleted, false)
                .set(StoryNodeDO::getIsDeleted, true)
                .set(StoryNodeDO::getUpdatedBy, userId)
                .set(StoryNodeDO::getUpdateTime, updateTime));
    }

    default int updateStoryNode(StoryNodeDO node) {
        return update(node, new LambdaUpdateWrapper<StoryNodeDO>()
                .eq(StoryNodeDO::getId, node.getId())
                .eq(StoryNodeDO::getSpaceId, node.getSpaceId())
                .eq(StoryNodeDO::getIsDeleted, false)
                .setSql("revision = revision + 1"));
    }

    /**
     * 查询指定章节内的有效故事，排序规则与管理列表保持一致。
     * 用于章节内排序的范围校验与“追加到末尾”的排序值计算。
     */
    default List<StoryNodeDO> selectActiveByChapterId(Long spaceId, Long chapterId) {
        return selectList(new LambdaQueryWrapper<StoryNodeDO>()
                .eq(StoryNodeDO::getSpaceId, spaceId)
                .eq(StoryNodeDO::getChapterId, chapterId)
                .eq(StoryNodeDO::getIsDeleted, false)
                .orderByAsc(StoryNodeDO::getSortOrder)
                .orderByAsc(StoryNodeDO::getHappenedTime)
                .orderByAsc(StoryNodeDO::getId));
    }

    /**
     * 批量排序：只更新 sort_order，并同时限制空间与章节，禁止借排序跨章节移动故事。
     */
    default int updateSortOrder(Long spaceId, Long chapterId, Long id, Integer sortOrder) {
        return update(null, new LambdaUpdateWrapper<StoryNodeDO>()
                .eq(StoryNodeDO::getSpaceId, spaceId)
                .eq(StoryNodeDO::getChapterId, chapterId)
                .eq(StoryNodeDO::getId, id)
                .eq(StoryNodeDO::getIsDeleted, false)
                .set(StoryNodeDO::getSortOrder, sortOrder));
    }

    default List<StoryNodeDO> selectMilestones(Long spaceId) {
        return selectList(new LambdaQueryWrapper<StoryNodeDO>()
                .eq(StoryNodeDO::getSpaceId, spaceId)
                .eq(StoryNodeDO::getIsMilestone, true)
                .eq(StoryNodeDO::getIsDeleted, false)
                .ne(StoryNodeDO::getVisibility, 2)
                .orderByAsc(StoryNodeDO::getHappenedTime));
    }

    /**
     * 查询空间内对成员可见的故事节点（排除隐藏内容）。
     */
    default List<StoryNodeDO> selectSpaceList(Long spaceId) {
        return selectList(new LambdaQueryWrapper<StoryNodeDO>()
                .eq(StoryNodeDO::getSpaceId, spaceId)
                .eq(StoryNodeDO::getIsDeleted, false)
                .ne(StoryNodeDO::getVisibility, 2)
                .orderByAsc(StoryNodeDO::getChapterId)
                .orderByAsc(StoryNodeDO::getSortOrder));
    }

    /**
     * 查询空间内公开到恋爱广场的故事节点。
     */
    default List<StoryNodeDO> selectPublicList(Long spaceId) {
        return selectList(new LambdaQueryWrapper<StoryNodeDO>()
                .eq(StoryNodeDO::getSpaceId, spaceId)
                .eq(StoryNodeDO::getIsDeleted, false)
                .eq(StoryNodeDO::getVisibility, 1)
                .orderByAsc(StoryNodeDO::getChapterId)
                .orderByAsc(StoryNodeDO::getSortOrder));
    }

    /** 统计空间内全部未删除的故事数量，供后台内容概览使用。 */
    default Long countActiveBySpaceId(Long spaceId) {
        return selectCount(new LambdaQueryWrapper<StoryNodeDO>()
                .eq(StoryNodeDO::getSpaceId, spaceId)
                .eq(StoryNodeDO::getIsDeleted, false));
    }

    /**
     * 统计空间内公开到恋爱广场且未删除的故事数量。
     */
    default Long countPublicBySpaceId(Long spaceId) {
        return selectCount(new LambdaQueryWrapper<StoryNodeDO>()
                .eq(StoryNodeDO::getSpaceId, spaceId)
                .eq(StoryNodeDO::getIsDeleted, false)
                .eq(StoryNodeDO::getVisibility, 1));
    }

    /**
     * 查询空间内最新公开故事，用于恋爱广场卡片摘要。
     */
    default List<StoryNodeDO> selectLatestPublic(Long spaceId, int limit) {
        return selectPage(new Page<>(1, limit, false), new LambdaQueryWrapper<StoryNodeDO>()
                .eq(StoryNodeDO::getSpaceId, spaceId)
                .eq(StoryNodeDO::getIsDeleted, false)
                .eq(StoryNodeDO::getVisibility, 1)
                .orderByDesc(StoryNodeDO::getHappenedTime)
                .orderByDesc(StoryNodeDO::getId))
                .getRecords();
    }

    default StoryNodeDO selectSpaceNodeById(Long spaceId, Long id) {
        return selectOne(new LambdaQueryWrapper<StoryNodeDO>()
                .eq(StoryNodeDO::getSpaceId, spaceId)
                .eq(StoryNodeDO::getId, id)
                .eq(StoryNodeDO::getIsDeleted, false)
                .ne(StoryNodeDO::getVisibility, 2));
    }

    default StoryNodeDO selectPublicById(Long spaceId, Long id) {
        return selectOne(new LambdaQueryWrapper<StoryNodeDO>()
                .eq(StoryNodeDO::getSpaceId, spaceId)
                .eq(StoryNodeDO::getId, id)
                .eq(StoryNodeDO::getIsDeleted, false)
                .eq(StoryNodeDO::getVisibility, 1));
    }

    default List<StoryNodeDO> selectSpaceNodesByChapterId(Long spaceId, Long chapterId) {
        return selectList(new LambdaQueryWrapper<StoryNodeDO>()
                .eq(StoryNodeDO::getSpaceId, spaceId)
                .eq(StoryNodeDO::getChapterId, chapterId)
                .eq(StoryNodeDO::getIsDeleted, false)
                .ne(StoryNodeDO::getVisibility, 2)
                .orderByAsc(StoryNodeDO::getHappenedTime)
                .orderByAsc(StoryNodeDO::getId));
    }

    default List<StoryNodeDO> selectSpaceNodesByChapterIds(Long spaceId, Collection<Long> chapterIds) {
        return selectList(new LambdaQueryWrapper<StoryNodeDO>()
                .eq(StoryNodeDO::getSpaceId, spaceId)
                .in(StoryNodeDO::getChapterId, chapterIds)
                .eq(StoryNodeDO::getIsDeleted, false)
                .ne(StoryNodeDO::getVisibility, 2));
    }

    default Long countByChapterId(Long spaceId, Long chapterId) {
        return selectCount(new LambdaQueryWrapper<StoryNodeDO>()
                .eq(StoryNodeDO::getSpaceId, spaceId)
                .eq(StoryNodeDO::getChapterId, chapterId)
                .eq(StoryNodeDO::getIsDeleted, false));
    }
}
