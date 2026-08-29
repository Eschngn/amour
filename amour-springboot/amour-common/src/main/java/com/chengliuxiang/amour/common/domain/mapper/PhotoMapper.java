package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.chengliuxiang.amour.common.domain.dos.PhotoDO;
import java.time.LocalDateTime;

public interface PhotoMapper extends BaseMapper<PhotoDO> {

    default IPage<PhotoDO> selectVisiblePage(long current, long size, Long categoryId) {
        return selectPage(new Page<>(current, size), new LambdaQueryWrapper<PhotoDO>()
                .eq(PhotoDO::getIsDeleted, false)
                .eq(PhotoDO::getIsVisible, true)
                .eq(categoryId != null, PhotoDO::getPhotoCategoryId, categoryId)
                .orderByAsc(PhotoDO::getSortOrder)
                .orderByDesc(PhotoDO::getTakenTime)
                .orderByDesc(PhotoDO::getId));
    }

    default PhotoDO selectCoverPhoto() {
        return selectOne(new LambdaQueryWrapper<PhotoDO>()
                .eq(PhotoDO::getIsDeleted, false)
                .eq(PhotoDO::getIsVisible, true)
                .eq(PhotoDO::getIsCover, true)
                .orderByDesc(PhotoDO::getUpdateTime)
                .orderByDesc(PhotoDO::getId)
                .last("LIMIT 1"));
    }

    default IPage<PhotoDO> findAdminPage(long current, long size, String title,
                                            Long categoryId, Boolean visible) {
        return selectPage(new Page<>(current, size), new LambdaQueryWrapper<PhotoDO>()
                .eq(PhotoDO::getIsDeleted, false)
                .like(cn.hutool.core.util.StrUtil.isNotBlank(title), PhotoDO::getTitle,
                        cn.hutool.core.util.StrUtil.trim(title))
                .eq(categoryId != null, PhotoDO::getPhotoCategoryId, categoryId)
                .eq(visible != null, PhotoDO::getIsVisible, visible)
                .orderByAsc(PhotoDO::getSortOrder)
                .orderByDesc(PhotoDO::getTakenTime)
                .orderByDesc(PhotoDO::getId));
    }

    default int saveAdminPhoto(PhotoDO photo) {
        return insert(photo);
    }

    default int markDeletedById(Long id, LocalDateTime updateTime) {
        return updateById(PhotoDO.builder().id(id).isDeleted(true).isCover(false)
                .updateTime(updateTime).build());
    }

    default int modifyPhoto(Long id, String title, String description, Long categoryId, String url,
                            java.time.LocalDateTime takenTime, String location, Integer sortOrder,
                            boolean cover, boolean visible, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<PhotoDO>()
                .eq(PhotoDO::getId, id)
                .eq(PhotoDO::getIsDeleted, false)
                .set(PhotoDO::getTitle, title)
                .set(PhotoDO::getDescription, description)
                .set(PhotoDO::getPhotoCategoryId, categoryId)
                .set(PhotoDO::getUrl, url)
                .set(PhotoDO::getTakenTime, takenTime)
                .set(PhotoDO::getLocation, location)
                .set(PhotoDO::getSortOrder, sortOrder)
                .set(PhotoDO::getIsCover, cover)
                .set(PhotoDO::getIsVisible, visible)
                .set(PhotoDO::getUpdateTime, updateTime));
    }

    default int modifyVisibleStatus(Long id, Boolean visible, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<PhotoDO>()
                .eq(PhotoDO::getId, id)
                .eq(PhotoDO::getIsDeleted, false)
                .set(PhotoDO::getIsVisible, visible)
                .set(!visible, PhotoDO::getIsCover, false)
                .set(PhotoDO::getUpdateTime, updateTime));
    }

    default int clearOtherCovers(Long excludedId, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<PhotoDO>()
                .eq(PhotoDO::getIsDeleted, false)
                .eq(PhotoDO::getIsCover, true)
                .ne(excludedId != null, PhotoDO::getId, excludedId)
                .set(PhotoDO::getIsCover, false)
                .set(PhotoDO::getUpdateTime, updateTime));
    }

    default PhotoDO findActiveById(Long id) {
        return selectOne(new LambdaQueryWrapper<PhotoDO>()
                .eq(PhotoDO::getId, id)
                .eq(PhotoDO::getIsDeleted, false));
    }

    default Long countActiveByCategoryId(Long categoryId) {
        return selectCount(new LambdaQueryWrapper<PhotoDO>()
                .eq(PhotoDO::getPhotoCategoryId, categoryId)
                .eq(PhotoDO::getIsDeleted, false));
    }
}
