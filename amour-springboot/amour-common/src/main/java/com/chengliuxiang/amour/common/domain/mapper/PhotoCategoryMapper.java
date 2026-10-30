package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.chengliuxiang.amour.common.domain.dos.PhotoCategoryDO;
import java.util.List;

public interface PhotoCategoryMapper extends BaseMapper<PhotoCategoryDO> {

    default List<PhotoCategoryDO> selectEnabledList() {
        return selectList(new LambdaQueryWrapper<PhotoCategoryDO>()
                .eq(PhotoCategoryDO::getIsEnabled, true)
                .orderByAsc(PhotoCategoryDO::getSortOrder)
                .orderByAsc(PhotoCategoryDO::getId));
    }

    default int saveAdminCategory(PhotoCategoryDO category) {
        return insert(category);
    }

    default int modifyAdminCategory(PhotoCategoryDO category) {
        return updateById(category);
    }

    default int removeAdminCategory(Long id) {
        return deleteById(id);
    }

    default PhotoCategoryDO findCategoryById(Long id) {
        return selectById(id);
    }

    default List<PhotoCategoryDO> findByIds(List<Long> ids) {
        return selectBatchIds(ids);
    }

    default List<PhotoCategoryDO> findAdminList() {
        return selectList(new LambdaQueryWrapper<PhotoCategoryDO>()
                .orderByAsc(PhotoCategoryDO::getSortOrder)
                .orderByAsc(PhotoCategoryDO::getId));
    }

    default Long countByNameExcludingId(String categoryName, Long excludedId) {
        return selectCount(new LambdaQueryWrapper<PhotoCategoryDO>()
                .eq(PhotoCategoryDO::getCategoryName, categoryName)
                .ne(excludedId != null, PhotoCategoryDO::getId, excludedId));
    }

    default PhotoCategoryDO findLastBySortOrder() {
        return selectOne(new LambdaQueryWrapper<PhotoCategoryDO>()
                .orderByDesc(PhotoCategoryDO::getSortOrder)
                .orderByDesc(PhotoCategoryDO::getId)
                .last("LIMIT 1"));
    }
}
