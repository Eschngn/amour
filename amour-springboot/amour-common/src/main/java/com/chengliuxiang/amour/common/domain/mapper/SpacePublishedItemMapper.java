package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.chengliuxiang.amour.common.domain.dos.SpacePublishedItemDO;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Collections;
import java.util.List;

/**
 * 恋爱广场唯一公开数据来源：只包含审核通过且未被下架的版本快照。
 */
public interface SpacePublishedItemMapper extends BaseMapper<SpacePublishedItemDO> {

    default List<SpacePublishedItemDO> selectBySpaceId(Long spaceId) {
        return selectList(new LambdaQueryWrapper<SpacePublishedItemDO>()
                .eq(SpacePublishedItemDO::getSpaceId, spaceId)
                .orderByAsc(SpacePublishedItemDO::getItemType)
                .orderByAsc(SpacePublishedItemDO::getItemId));
    }

    default List<SpacePublishedItemDO> selectPublishedBySpaceId(Long spaceId) {
        return selectList(new LambdaQueryWrapper<SpacePublishedItemDO>()
                .eq(SpacePublishedItemDO::getSpaceId, spaceId)
                .eq(SpacePublishedItemDO::getPublishStatus, 1)
                .orderByAsc(SpacePublishedItemDO::getItemType)
                .orderByAsc(SpacePublishedItemDO::getItemId));
    }

    default List<SpacePublishedItemDO> selectPublishedBySpaceIds(Collection<Long> spaceIds) {
        if (spaceIds == null || spaceIds.isEmpty()) {
            return Collections.emptyList();
        }
        return selectList(new LambdaQueryWrapper<SpacePublishedItemDO>()
                .in(SpacePublishedItemDO::getSpaceId, spaceIds)
                .eq(SpacePublishedItemDO::getPublishStatus, 1));
    }

    default SpacePublishedItemDO selectBySpaceAndItem(Long spaceId, String itemType, Long itemId) {
        return selectOne(new LambdaQueryWrapper<SpacePublishedItemDO>()
                .eq(SpacePublishedItemDO::getSpaceId, spaceId)
                .eq(SpacePublishedItemDO::getItemType, itemType)
                .eq(SpacePublishedItemDO::getItemId, itemId)
                .last("LIMIT 1"));
    }

    default long countBySpaceId(Long spaceId) {
        Long count = selectCount(new LambdaQueryWrapper<SpacePublishedItemDO>()
                .eq(SpacePublishedItemDO::getSpaceId, spaceId));
        return count == null ? 0L : count;
    }

    default int unpublishItem(Long spaceId, String itemType, Long itemId, String reason,
                              LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<SpacePublishedItemDO>()
                .eq(SpacePublishedItemDO::getSpaceId, spaceId)
                .eq(SpacePublishedItemDO::getItemType, itemType)
                .eq(SpacePublishedItemDO::getItemId, itemId)
                .eq(SpacePublishedItemDO::getPublishStatus, 1)
                .set(SpacePublishedItemDO::getPublishStatus, 0)
                .set(SpacePublishedItemDO::getUnpublishedAt, updateTime)
                .set(SpacePublishedItemDO::getUnpublishReason, reason)
                .set(SpacePublishedItemDO::getUpdateTime, updateTime));
    }

    default int unpublishAllBySpaceId(Long spaceId, String reason, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<SpacePublishedItemDO>()
                .eq(SpacePublishedItemDO::getSpaceId, spaceId)
                .eq(SpacePublishedItemDO::getPublishStatus, 1)
                .set(SpacePublishedItemDO::getPublishStatus, 0)
                .set(SpacePublishedItemDO::getUnpublishedAt, updateTime)
                .set(SpacePublishedItemDO::getUnpublishReason, reason)
                .set(SpacePublishedItemDO::getUpdateTime, updateTime));
    }

    default long countRecentlyUnpublished(LocalDateTime since) {
        Long count = selectCount(new LambdaQueryWrapper<SpacePublishedItemDO>()
                .eq(SpacePublishedItemDO::getPublishStatus, 0)
                .ge(SpacePublishedItemDO::getUnpublishedAt, since));
        return count == null ? 0L : count;
    }

    default long countBySpaceIdAndStatus(Long spaceId, Integer publishStatus) {
        Long count = selectCount(new LambdaQueryWrapper<SpacePublishedItemDO>()
                .eq(SpacePublishedItemDO::getSpaceId, spaceId)
                .eq(SpacePublishedItemDO::getPublishStatus, publishStatus));
        return count == null ? 0L : count;
    }
}
