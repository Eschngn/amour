package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.chengliuxiang.amour.common.domain.dos.AnniversaryDO;

import java.util.List;

public interface AnniversaryMapper extends BaseMapper<AnniversaryDO> {

    default IPage<AnniversaryDO> selectAdminPage(long current, long size, Long spaceId, String title,
                                                 String category, Integer repeatType, Integer visibility) {
        return selectPage(new Page<>(current, size), new LambdaQueryWrapper<AnniversaryDO>()
                .eq(AnniversaryDO::getIsDeleted, false)
                .eq(spaceId != null, AnniversaryDO::getSpaceId, spaceId)
                .like(title != null, AnniversaryDO::getTitle, title)
                .eq(category != null, AnniversaryDO::getCategory, category)
                .eq(repeatType != null, AnniversaryDO::getRepeatType, repeatType)
                .eq(visibility != null, AnniversaryDO::getVisibility, visibility)
                .orderByAsc(AnniversaryDO::getSortOrder)
                .orderByAsc(AnniversaryDO::getAnniversaryDate)
                .orderByDesc(AnniversaryDO::getId));
    }

    default AnniversaryDO selectActiveById(Long spaceId, Long id) {
        return selectOne(new LambdaQueryWrapper<AnniversaryDO>()
                .eq(AnniversaryDO::getSpaceId, spaceId)
                .eq(AnniversaryDO::getId, id)
                .eq(AnniversaryDO::getIsDeleted, false));
    }

    default int insertAnniversary(AnniversaryDO anniversary) {
        return insert(anniversary);
    }

    default int updateAnniversary(AnniversaryDO anniversary) {
        return update(anniversary, new LambdaUpdateWrapper<AnniversaryDO>()
                .eq(AnniversaryDO::getId, anniversary.getId())
                .eq(AnniversaryDO::getSpaceId, anniversary.getSpaceId()));
    }

    /**
     * 查询空间内对成员可见的纪念日（排除隐藏内容）。
     */
    default List<AnniversaryDO> selectSpaceList(Long spaceId) {
        return selectList(new LambdaQueryWrapper<AnniversaryDO>()
                .eq(AnniversaryDO::getSpaceId, spaceId)
                .eq(AnniversaryDO::getIsDeleted, false)
                .ne(AnniversaryDO::getVisibility, 2)
                .orderByAsc(AnniversaryDO::getSortOrder)
                .orderByAsc(AnniversaryDO::getAnniversaryDate)
                .orderByAsc(AnniversaryDO::getId));
    }

    /**
     * 查询空间内公开到恋爱广场的纪念日。
     */
    default List<AnniversaryDO> selectPublicList(Long spaceId) {
        return selectList(new LambdaQueryWrapper<AnniversaryDO>()
                .eq(AnniversaryDO::getSpaceId, spaceId)
                .eq(AnniversaryDO::getIsDeleted, false)
                .eq(AnniversaryDO::getVisibility, 1)
                .orderByAsc(AnniversaryDO::getSortOrder)
                .orderByAsc(AnniversaryDO::getAnniversaryDate)
                .orderByAsc(AnniversaryDO::getId));
    }

    /** 统计空间内全部未删除的纪念日数量，供后台内容概览使用。 */
    default Long countActiveBySpaceId(Long spaceId) {
        return selectCount(new LambdaQueryWrapper<AnniversaryDO>()
                .eq(AnniversaryDO::getSpaceId, spaceId)
                .eq(AnniversaryDO::getIsDeleted, false));
    }

    /**
     * 统计空间内公开到恋爱广场且未删除的纪念日数量。
     */
    default Long countPublicBySpaceId(Long spaceId) {
        return selectCount(new LambdaQueryWrapper<AnniversaryDO>()
                .eq(AnniversaryDO::getSpaceId, spaceId)
                .eq(AnniversaryDO::getIsDeleted, false)
                .eq(AnniversaryDO::getVisibility, 1));
    }

    /**
     * 查询空间内最新公开纪念日，用于恋爱广场卡片摘要。
     */
    default List<AnniversaryDO> selectLatestPublic(Long spaceId, int limit) {
        return selectPage(new Page<>(1, limit, false), new LambdaQueryWrapper<AnniversaryDO>()
                .eq(AnniversaryDO::getSpaceId, spaceId)
                .eq(AnniversaryDO::getIsDeleted, false)
                .eq(AnniversaryDO::getVisibility, 1)
                .orderByDesc(AnniversaryDO::getAnniversaryDate)
                .orderByDesc(AnniversaryDO::getId))
                .getRecords();
    }
}
