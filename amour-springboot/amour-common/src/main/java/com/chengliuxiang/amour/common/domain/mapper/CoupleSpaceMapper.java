package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.chengliuxiang.amour.common.domain.dos.CoupleSpaceDO;

import java.time.LocalDateTime;
import java.util.List;

public interface CoupleSpaceMapper extends BaseMapper<CoupleSpaceDO> {

    default CoupleSpaceDO selectBySpaceCode(String spaceCode) {
        return selectOne(new LambdaQueryWrapper<CoupleSpaceDO>()
                .eq(CoupleSpaceDO::getSpaceCode, spaceCode));
    }

    default CoupleSpaceDO findById(Long id) {
        return selectById(id);
    }

    /**
     * 等待绑定的空间在第二位成员加入时原子切换为正常状态。
     * 返回 0 表示空间已被其他成员绑定或状态已变化。
     */
    default int bind(Long spaceId, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<CoupleSpaceDO>()
                .eq(CoupleSpaceDO::getId, spaceId)
                .eq(CoupleSpaceDO::getStatus, 0)
                .set(CoupleSpaceDO::getStatus, 1)
                .set(CoupleSpaceDO::getUpdateTime, updateTime));
    }

    /**
     * 冻结空间：只允许从等待绑定或正常状态进入冻结。
     */
    default int freeze(Long spaceId, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<CoupleSpaceDO>()
                .eq(CoupleSpaceDO::getId, spaceId)
                .in(CoupleSpaceDO::getStatus, 0, 1)
                .set(CoupleSpaceDO::getStatus, 2)
                .set(CoupleSpaceDO::getUpdateTime, updateTime));
    }

    /**
     * 归档空间：允许从等待绑定、正常或冻结状态进入归档。
     */
    default int archive(Long spaceId, LocalDateTime archivedAt) {
        return update(null, new LambdaUpdateWrapper<CoupleSpaceDO>()
                .eq(CoupleSpaceDO::getId, spaceId)
                .in(CoupleSpaceDO::getStatus, 0, 1, 2)
                .set(CoupleSpaceDO::getStatus, 3)
                .set(CoupleSpaceDO::getArchivedAt, archivedAt)
                .set(CoupleSpaceDO::getUpdateTime, archivedAt));
    }

    /**
     * 双方确认后恢复空间：冻结或归档状态恢复为正常。
     */
    default int restore(Long spaceId, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<CoupleSpaceDO>()
                .eq(CoupleSpaceDO::getId, spaceId)
                .in(CoupleSpaceDO::getStatus, 2, 3)
                .set(CoupleSpaceDO::getStatus, 1)
                .set(CoupleSpaceDO::getArchivedAt, null)
                .set(CoupleSpaceDO::getUpdateTime, updateTime));
    }

    default List<CoupleSpaceDO> selectByCreatedBy(Long userId) {
        return selectList(new LambdaQueryWrapper<CoupleSpaceDO>()
                .eq(CoupleSpaceDO::getCreatedBy, userId)
                .orderByDesc(CoupleSpaceDO::getId));
    }

    /**
     * 查询恋爱广场中公开且状态正常的空间。
     */
    default IPage<CoupleSpaceDO> selectPublicPage(long current, long size) {
        return selectPage(new Page<>(current, size), new LambdaQueryWrapper<CoupleSpaceDO>()
                .eq(CoupleSpaceDO::getStatus, 1)
                .eq(CoupleSpaceDO::getVisibility, 1)
                .orderByDesc(CoupleSpaceDO::getPublicAt)
                .orderByDesc(CoupleSpaceDO::getId));
    }

    default CoupleSpaceDO selectPublicById(Long id) {
        return selectOne(new LambdaQueryWrapper<CoupleSpaceDO>()
                .eq(CoupleSpaceDO::getId, id)
                .eq(CoupleSpaceDO::getStatus, 1)
                .eq(CoupleSpaceDO::getVisibility, 1));
    }

    default IPage<CoupleSpaceDO> selectAdminPage(long current, long size, String keyword, Integer status, Integer visibility) {
        return selectPage(new Page<>(current, size), new LambdaQueryWrapper<CoupleSpaceDO>()
                .eq(status != null, CoupleSpaceDO::getStatus, status)
                .eq(visibility != null, CoupleSpaceDO::getVisibility, visibility)
                .and(org.apache.commons.lang3.StringUtils.isNotBlank(keyword), w -> w
                        .like(CoupleSpaceDO::getSpaceName, keyword)
                        .or().like(CoupleSpaceDO::getSpaceCode, keyword))
                .orderByDesc(CoupleSpaceDO::getId));
    }
}
