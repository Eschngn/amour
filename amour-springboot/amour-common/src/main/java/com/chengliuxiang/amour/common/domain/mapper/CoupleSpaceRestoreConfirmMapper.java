package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.chengliuxiang.amour.common.domain.dos.CoupleSpaceRestoreConfirmDO;

import java.time.LocalDateTime;
import java.util.List;

public interface CoupleSpaceRestoreConfirmMapper extends BaseMapper<CoupleSpaceRestoreConfirmDO> {

    default CoupleSpaceRestoreConfirmDO selectBySpaceAndUser(Long spaceId, Long userId) {
        return selectOne(new LambdaQueryWrapper<CoupleSpaceRestoreConfirmDO>()
                .eq(CoupleSpaceRestoreConfirmDO::getSpaceId, spaceId)
                .eq(CoupleSpaceRestoreConfirmDO::getUserId, userId));
    }

    default List<CoupleSpaceRestoreConfirmDO> selectBySpaceId(Long spaceId) {
        return selectList(new LambdaQueryWrapper<CoupleSpaceRestoreConfirmDO>()
                .eq(CoupleSpaceRestoreConfirmDO::getSpaceId, spaceId)
                .orderByAsc(CoupleSpaceRestoreConfirmDO::getId));
    }

    default int touch(Long id, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<CoupleSpaceRestoreConfirmDO>()
                .eq(CoupleSpaceRestoreConfirmDO::getId, id)
                .set(CoupleSpaceRestoreConfirmDO::getUpdateTime, updateTime));
    }

    default int deleteBySpaceId(Long spaceId) {
        return delete(new LambdaQueryWrapper<CoupleSpaceRestoreConfirmDO>()
                .eq(CoupleSpaceRestoreConfirmDO::getSpaceId, spaceId));
    }

    /**
     * 只清理指定成员的恢复确认，保留空间内其他成员的确认记录。
     */
    default int deleteBySpaceIdAndUserId(Long spaceId, Long userId) {
        return delete(new LambdaQueryWrapper<CoupleSpaceRestoreConfirmDO>()
                .eq(CoupleSpaceRestoreConfirmDO::getSpaceId, spaceId)
                .eq(CoupleSpaceRestoreConfirmDO::getUserId, userId));
    }
}
