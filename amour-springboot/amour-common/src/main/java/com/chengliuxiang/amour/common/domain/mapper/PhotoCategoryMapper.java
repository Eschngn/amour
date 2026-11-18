package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.chengliuxiang.amour.common.domain.dos.PhotoCategoryDO;
import java.util.List;

public interface PhotoCategoryMapper extends BaseMapper<PhotoCategoryDO> {

    default List<PhotoCategoryDO> selectEnabledBySpaceId(Long spaceId) {
        return selectList(new LambdaQueryWrapper<PhotoCategoryDO>()
                .eq(PhotoCategoryDO::getSpaceId, spaceId)
                .eq(PhotoCategoryDO::getIsEnabled, true)
                .orderByAsc(PhotoCategoryDO::getSortOrder)
                .orderByAsc(PhotoCategoryDO::getId));
    }

    default int saveAdminCategory(PhotoCategoryDO category) {
        return insert(category);
    }

    default int modifyAdminCategory(PhotoCategoryDO category) {
        return update(category, new LambdaUpdateWrapper<PhotoCategoryDO>()
                .eq(PhotoCategoryDO::getId, category.getId())
                .eq(PhotoCategoryDO::getSpaceId, category.getSpaceId()));
    }

    default int removeAdminCategory(Long spaceId, Long id) {
        return delete(new LambdaQueryWrapper<PhotoCategoryDO>()
                .eq(PhotoCategoryDO::getSpaceId, spaceId)
                .eq(PhotoCategoryDO::getId, id));
    }

    default PhotoCategoryDO findCategoryById(Long spaceId, Long id) {
        return selectOne(new LambdaQueryWrapper<PhotoCategoryDO>()
                .eq(PhotoCategoryDO::getSpaceId, spaceId)
                .eq(PhotoCategoryDO::getId, id));
    }

    default List<PhotoCategoryDO> findByIds(Long spaceId, List<Long> ids) {
        return selectList(new LambdaQueryWrapper<PhotoCategoryDO>()
                .eq(PhotoCategoryDO::getSpaceId, spaceId)
                .in(PhotoCategoryDO::getId, ids));
    }

    default List<PhotoCategoryDO> findAdminList(Long spaceId) {
        return selectList(new LambdaQueryWrapper<PhotoCategoryDO>()
                .eq(spaceId != null, PhotoCategoryDO::getSpaceId, spaceId)
                .orderByAsc(PhotoCategoryDO::getSortOrder)
                .orderByAsc(PhotoCategoryDO::getId));
    }

    default Long countByName(Long spaceId, String categoryName, Long excludedId) {
        return selectCount(new LambdaQueryWrapper<PhotoCategoryDO>()
                .eq(PhotoCategoryDO::getSpaceId, spaceId)
                .eq(PhotoCategoryDO::getCategoryName, categoryName)
                .ne(excludedId != null, PhotoCategoryDO::getId, excludedId));
    }

    /**
     * 批量排序：只更新 sort_order，条件同时包含 space_id，禁止跨空间改写。
     */
    default int updateSortOrder(Long spaceId, Long id, Integer sortOrder) {
        return update(null, new LambdaUpdateWrapper<PhotoCategoryDO>()
                .eq(PhotoCategoryDO::getSpaceId, spaceId)
                .eq(PhotoCategoryDO::getId, id)
                .set(PhotoCategoryDO::getSortOrder, sortOrder));
    }

    default PhotoCategoryDO findLastBySortOrder(Long spaceId) {
        return selectOne(new LambdaQueryWrapper<PhotoCategoryDO>()
                .eq(PhotoCategoryDO::getSpaceId, spaceId)
                .orderByDesc(PhotoCategoryDO::getSortOrder)
                .orderByDesc(PhotoCategoryDO::getId)
                .last("LIMIT 1"));
    }

    /**
     * 销毁留档：读取空间内全部相册分类（含停用）。
     */
    default List<PhotoCategoryDO> selectAllBySpaceIdForArchive(Long spaceId) {
        return selectList(new LambdaQueryWrapper<PhotoCategoryDO>()
                .eq(PhotoCategoryDO::getSpaceId, spaceId)
                .orderByAsc(PhotoCategoryDO::getId));
    }

    default int insertForArchiveRestore(PhotoCategoryDO category) {
        return insert(category);
    }
}
