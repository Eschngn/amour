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

    default StoryNodeDO selectActiveById(Long spaceId, Long id) {
        return selectOne(new LambdaQueryWrapper<StoryNodeDO>()
                .eq(StoryNodeDO::getSpaceId, spaceId)
                .eq(StoryNodeDO::getId, id)
                .eq(StoryNodeDO::getIsDeleted, false));
    }

    default int insertStoryNode(StoryNodeDO node) {
        return insert(node);
    }

    /**
     * 用户端管理列表：包含隐藏内容，按章节与排序值展示。
     */
    default List<StoryNodeDO> selectManageList(Long spaceId) {
        return selectList(new LambdaQueryWrapper<StoryNodeDO>()
                .eq(StoryNodeDO::getSpaceId, spaceId)
                .eq(StoryNodeDO::getIsDeleted, false)
                .orderByAsc(StoryNodeDO::getChapterId)
                .orderByAsc(StoryNodeDO::getSortOrder)
                .orderByAsc(StoryNodeDO::getHappenedTime)
                .orderByAsc(StoryNodeDO::getId));
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
                .eq(StoryNodeDO::getIsDeleted, false));
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
