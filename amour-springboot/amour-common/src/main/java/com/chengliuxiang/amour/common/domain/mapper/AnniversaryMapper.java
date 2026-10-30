package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.chengliuxiang.amour.common.domain.dos.AnniversaryDO;

public interface AnniversaryMapper extends BaseMapper<AnniversaryDO> {

    default IPage<AnniversaryDO> selectAdminPage(long current, long size, String title, String category,
                                                  Integer repeatType, Boolean isVisible) {
        return selectPage(new Page<>(current, size), new LambdaQueryWrapper<AnniversaryDO>()
                .eq(AnniversaryDO::getIsDeleted, false)
                .like(title != null, AnniversaryDO::getTitle, title)
                .eq(category != null, AnniversaryDO::getCategory, category)
                .eq(repeatType != null, AnniversaryDO::getRepeatType, repeatType)
                .eq(isVisible != null, AnniversaryDO::getIsVisible, isVisible)
                .orderByAsc(AnniversaryDO::getSortOrder)
                .orderByAsc(AnniversaryDO::getAnniversaryDate)
                .orderByDesc(AnniversaryDO::getId));
    }

    default AnniversaryDO selectActiveById(Long id) {
        return selectOne(new LambdaQueryWrapper<AnniversaryDO>()
                .eq(AnniversaryDO::getId, id)
                .eq(AnniversaryDO::getIsDeleted, false));
    }

    default int insertAnniversary(AnniversaryDO anniversary) {
        return insert(anniversary);
    }

    default int updateAnniversary(AnniversaryDO anniversary) {
        return updateById(anniversary);
    }

    default java.util.List<AnniversaryDO> selectVisibleList() {
        return selectList(new LambdaQueryWrapper<AnniversaryDO>()
                .eq(AnniversaryDO::getIsDeleted, false)
                .eq(AnniversaryDO::getIsVisible, true)
                .orderByAsc(AnniversaryDO::getSortOrder)
                .orderByAsc(AnniversaryDO::getAnniversaryDate)
                .orderByAsc(AnniversaryDO::getId));
    }
}
