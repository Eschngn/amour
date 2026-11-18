package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.chengliuxiang.amour.common.domain.dos.CoupleSpaceArchiveDO;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 情侣空间销毁留档 Mapper。
 *
 * <p>留档只新增、不物理删除：同一次销毁对应一条记录，管理员恢复后写入 restoredAt / restoredBy，
 * 历史留档继续保留可追溯。</p>
 */
public interface CoupleSpaceArchiveMapper extends BaseMapper<CoupleSpaceArchiveDO> {

    default CoupleSpaceArchiveDO selectLatestBySpaceId(Long spaceId) {
        if (spaceId == null) {
            return null;
        }
        return selectOne(new LambdaQueryWrapper<CoupleSpaceArchiveDO>()
                .eq(CoupleSpaceArchiveDO::getSpaceId, spaceId)
                .orderByDesc(CoupleSpaceArchiveDO::getArchiveRound)
                .orderByDesc(CoupleSpaceArchiveDO::getId)
                .last("LIMIT 1"));
    }

    /**
     * 最新一条仍处于「未恢复」状态的留档，用于重复销毁幂等判定与恢复目标。
     */
    default CoupleSpaceArchiveDO selectLatestActiveBySpaceId(Long spaceId) {
        if (spaceId == null) {
            return null;
        }
        return selectOne(new LambdaQueryWrapper<CoupleSpaceArchiveDO>()
                .eq(CoupleSpaceArchiveDO::getSpaceId, spaceId)
                .isNull(CoupleSpaceArchiveDO::getRestoredAt)
                .orderByDesc(CoupleSpaceArchiveDO::getArchiveRound)
                .orderByDesc(CoupleSpaceArchiveDO::getId)
                .last("LIMIT 1"));
    }

    default List<CoupleSpaceArchiveDO> selectBySpaceId(Long spaceId) {
        return selectList(new LambdaQueryWrapper<CoupleSpaceArchiveDO>()
                .eq(CoupleSpaceArchiveDO::getSpaceId, spaceId)
                .orderByDesc(CoupleSpaceArchiveDO::getArchiveRound)
                .orderByDesc(CoupleSpaceArchiveDO::getId));
    }

    default CoupleSpaceArchiveDO findById(Long id) {
        return selectById(id);
    }

    default Long countBySpaceId(Long spaceId) {
        return selectCount(new LambdaQueryWrapper<CoupleSpaceArchiveDO>()
                .eq(CoupleSpaceArchiveDO::getSpaceId, spaceId));
    }

    /**
     * 下一个留档轮次：同一空间多次「销毁 → 恢复 → 再销毁」时递增，保证历史可追溯。
     */
    default int nextArchiveRound(Long spaceId) {
        CoupleSpaceArchiveDO latest = selectLatestBySpaceId(spaceId);
        return latest == null || latest.getArchiveRound() == null ? 1 : latest.getArchiveRound() + 1;
    }

    default int insertArchive(CoupleSpaceArchiveDO archive) {
        return insert(archive);
    }

    /**
     * 条件标记恢复：只有仍未被恢复的留档才能被标记，天然幂等并防止并发重复恢复。
     */
    default int markRestored(Long archiveId, Long restoredBy, LocalDateTime restoredAt) {
        return update(null, new LambdaUpdateWrapper<CoupleSpaceArchiveDO>()
                .eq(CoupleSpaceArchiveDO::getId, archiveId)
                .isNull(CoupleSpaceArchiveDO::getRestoredAt)
                .set(CoupleSpaceArchiveDO::getRestoredAt, restoredAt)
                .set(CoupleSpaceArchiveDO::getRestoredBy, restoredBy)
                .set(CoupleSpaceArchiveDO::getUpdateTime, restoredAt));
    }

    /**
     * 后台留档分页：可按空间 ID / 关键字（空间名、spaceCode）以及是否已恢复筛选。
     */
    default IPage<CoupleSpaceArchiveDO> selectAdminPage(long current, long size, Long spaceId,
                                                        String keyword, Boolean restored) {
        LambdaQueryWrapper<CoupleSpaceArchiveDO> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(spaceId != null, CoupleSpaceArchiveDO::getSpaceId, spaceId);
        if (keyword != null && !keyword.trim().isEmpty()) {
            String trimmed = keyword.trim();
            wrapper.and(w -> w.like(CoupleSpaceArchiveDO::getSpaceName, trimmed)
                    .or().like(CoupleSpaceArchiveDO::getSpaceCode, trimmed));
        }
        if (restored != null) {
            if (restored) {
                wrapper.isNotNull(CoupleSpaceArchiveDO::getRestoredAt);
            } else {
                wrapper.isNull(CoupleSpaceArchiveDO::getRestoredAt);
            }
        }
        wrapper.orderByDesc(CoupleSpaceArchiveDO::getDestroyedAt)
                .orderByDesc(CoupleSpaceArchiveDO::getId);
        return selectPage(new Page<>(current, size), wrapper);
    }
}
