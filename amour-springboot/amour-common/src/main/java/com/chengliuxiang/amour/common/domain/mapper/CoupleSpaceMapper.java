package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.chengliuxiang.amour.common.domain.dos.CoupleSpaceDO;

import java.util.List;

public interface CoupleSpaceMapper extends BaseMapper<CoupleSpaceDO> {

    default CoupleSpaceDO selectBySpaceCode(String spaceCode) {
        return selectOne(new LambdaQueryWrapper<CoupleSpaceDO>()
                .eq(CoupleSpaceDO::getSpaceCode, spaceCode));
    }

    default CoupleSpaceDO findById(Long id) {
        return selectById(id);
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
