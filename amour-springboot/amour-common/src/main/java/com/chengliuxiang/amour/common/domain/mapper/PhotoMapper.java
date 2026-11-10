package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.chengliuxiang.amour.common.domain.dos.PhotoDO;
import java.time.LocalDateTime;
import java.util.List;

public interface PhotoMapper extends BaseMapper<PhotoDO> {

    /**
     * 查询空间内对成员可见的照片（排除隐藏内容）。
     */
    default IPage<PhotoDO> selectSpacePage(long current, long size, Long spaceId, Long categoryId) {
        return selectPage(new Page<>(current, size), new LambdaQueryWrapper<PhotoDO>()
                .eq(PhotoDO::getSpaceId, spaceId)
                .eq(PhotoDO::getIsDeleted, false)
                .ne(PhotoDO::getVisibility, 2)
                .eq(categoryId != null, PhotoDO::getPhotoCategoryId, categoryId)
                .orderByAsc(PhotoDO::getSortOrder)
                .orderByDesc(PhotoDO::getTakenTime)
                .orderByDesc(PhotoDO::getId));
    }

    /**
     * 查询空间内公开到恋爱广场的照片。
     */
    default IPage<PhotoDO> selectPublicPage(long current, long size, Long spaceId, Long categoryId) {
        return selectPage(new Page<>(current, size), new LambdaQueryWrapper<PhotoDO>()
                .eq(PhotoDO::getSpaceId, spaceId)
                .eq(PhotoDO::getIsDeleted, false)
                .eq(PhotoDO::getVisibility, 1)
                .eq(categoryId != null, PhotoDO::getPhotoCategoryId, categoryId)
                .orderByAsc(PhotoDO::getSortOrder)
                .orderByDesc(PhotoDO::getTakenTime)
                .orderByDesc(PhotoDO::getId));
    }

    /**
     * 查询空间内全部公开照片，用于恋爱广场空间详情。
     */
    default List<PhotoDO> selectPublicList(Long spaceId) {
        return selectList(new LambdaQueryWrapper<PhotoDO>()
                .eq(PhotoDO::getSpaceId, spaceId)
                .eq(PhotoDO::getIsDeleted, false)
                .eq(PhotoDO::getVisibility, 1)
                .orderByAsc(PhotoDO::getSortOrder)
                .orderByDesc(PhotoDO::getTakenTime)
                .orderByDesc(PhotoDO::getId));
    }

    /** 统计空间内全部未删除的照片数量，供后台内容概览使用。 */
    default Long countActiveBySpaceId(Long spaceId) {
        return selectCount(new LambdaQueryWrapper<PhotoDO>()
                .eq(PhotoDO::getSpaceId, spaceId)
                .eq(PhotoDO::getIsDeleted, false));
    }

    /**
     * 统计空间内公开到恋爱广场且未删除的照片数量。
     */
    default Long countPublicBySpaceId(Long spaceId) {
        return selectCount(new LambdaQueryWrapper<PhotoDO>()
                .eq(PhotoDO::getSpaceId, spaceId)
                .eq(PhotoDO::getIsDeleted, false)
                .eq(PhotoDO::getVisibility, 1));
    }

    /**
     * 查询空间内最新公开照片，用于恋爱广场卡片摘要。
     */
    default List<PhotoDO> selectLatestPublic(Long spaceId, int limit) {
        return selectPage(new Page<>(1, limit, false), new LambdaQueryWrapper<PhotoDO>()
                .eq(PhotoDO::getSpaceId, spaceId)
                .eq(PhotoDO::getIsDeleted, false)
                .eq(PhotoDO::getVisibility, 1)
                .orderByDesc(PhotoDO::getTakenTime)
                .orderByDesc(PhotoDO::getId))
                .getRecords();
    }

    default PhotoDO selectCoverPhoto(Long spaceId) {
        return selectOne(new LambdaQueryWrapper<PhotoDO>()
                .eq(PhotoDO::getSpaceId, spaceId)
                .eq(PhotoDO::getIsDeleted, false)
                .eq(PhotoDO::getIsCover, true)
                .orderByDesc(PhotoDO::getUpdateTime)
                .orderByDesc(PhotoDO::getId)
                .last("LIMIT 1"));
    }

    /**
     * 用户端相册管理分页：包含隐藏照片，但只返回当前空间的数据。
     */
    default IPage<PhotoDO> selectManagePage(long current, long size, Long spaceId, Long categoryId) {
        return selectPage(new Page<>(current, size), new LambdaQueryWrapper<PhotoDO>()
                .eq(PhotoDO::getSpaceId, spaceId)
                .eq(PhotoDO::getIsDeleted, false)
                .eq(categoryId != null, PhotoDO::getPhotoCategoryId, categoryId)
                .orderByAsc(PhotoDO::getSortOrder)
                .orderByDesc(PhotoDO::getTakenTime)
                .orderByDesc(PhotoDO::getId));
    }

    default IPage<PhotoDO> findAdminPage(long current, long size, Long spaceId, String title,
                                         Long categoryId, Integer visibility) {
        return selectPage(new Page<>(current, size), new LambdaQueryWrapper<PhotoDO>()
                .eq(PhotoDO::getIsDeleted, false)
                .eq(spaceId != null, PhotoDO::getSpaceId, spaceId)
                .like(cn.hutool.core.util.StrUtil.isNotBlank(title), PhotoDO::getTitle,
                        cn.hutool.core.util.StrUtil.trim(title))
                .eq(categoryId != null, PhotoDO::getPhotoCategoryId, categoryId)
                .eq(visibility != null, PhotoDO::getVisibility, visibility)
                .orderByAsc(PhotoDO::getSortOrder)
                .orderByDesc(PhotoDO::getTakenTime)
                .orderByDesc(PhotoDO::getId));
    }

    /**
     * 后台治理分页：显式空间过滤、真实 visibility、可查看逻辑删除。
     */
    default IPage<PhotoDO> findAdminGovernancePage(long current, long size, Long spaceId,
                                                    String keyword, Integer visibility,
                                                    boolean includeDeleted) {
        return selectPage(new Page<>(current, size), new LambdaQueryWrapper<PhotoDO>()
                .eq(spaceId != null, PhotoDO::getSpaceId, spaceId)
                .eq(!includeDeleted, PhotoDO::getIsDeleted, false)
                .eq(visibility != null, PhotoDO::getVisibility, visibility)
                .like(cn.hutool.core.util.StrUtil.isNotBlank(keyword), PhotoDO::getTitle,
                        cn.hutool.core.util.StrUtil.trim(keyword))
                .orderByDesc(PhotoDO::getUpdateTime)
                .orderByDesc(PhotoDO::getId));
    }

    /**
     * 后台详情：同时匹配 id 与 spaceId，不因逻辑删除而隐藏已删除内容。
     */
    default PhotoDO findAdminById(Long spaceId, Long id) {
        return selectOne(new LambdaQueryWrapper<PhotoDO>()
                .eq(PhotoDO::getSpaceId, spaceId)
                .eq(PhotoDO::getId, id));
    }

    default int markDeletedByAdmin(Long spaceId, Long id, Long updatedBy, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<PhotoDO>()
                .eq(PhotoDO::getSpaceId, spaceId)
                .eq(PhotoDO::getId, id)
                .eq(PhotoDO::getIsDeleted, false)
                .set(PhotoDO::getIsDeleted, true)
                .set(PhotoDO::getIsCover, false)
                .set(PhotoDO::getUpdatedBy, updatedBy)
                .set(PhotoDO::getUpdateTime, updateTime));
    }

    default int moderateVisibility(Long spaceId, Long id, Integer visibility,
                                   Long updatedBy, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<PhotoDO>()
                .eq(PhotoDO::getSpaceId, spaceId)
                .eq(PhotoDO::getId, id)
                .eq(PhotoDO::getIsDeleted, false)
                .set(PhotoDO::getVisibility, visibility)
                .set(visibility != null && visibility != 1, PhotoDO::getIsCover, false)
                .set(PhotoDO::getUpdatedBy, updatedBy)
                .set(PhotoDO::getUpdateTime, updateTime));
    }

    default int saveAdminPhoto(PhotoDO photo) {
        return insert(photo);
    }

    default int markDeletedById(Long spaceId, Long id, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<PhotoDO>()
                .eq(PhotoDO::getSpaceId, spaceId)
                .eq(PhotoDO::getId, id)
                .eq(PhotoDO::getIsDeleted, false)
                .set(PhotoDO::getIsDeleted, true)
                .set(PhotoDO::getIsCover, false)
                .set(PhotoDO::getUpdateTime, updateTime));
    }

    default int modifyPhoto(Long spaceId, Long id, String title, String description, Long categoryId,
                            String url, LocalDateTime takenTime, String location, Integer sortOrder,
                            boolean cover, Integer visibility, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<PhotoDO>()
                .eq(PhotoDO::getSpaceId, spaceId)
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
                .set(PhotoDO::getVisibility, visibility)
                .set(PhotoDO::getUpdateTime, updateTime));
    }

    default int modifyVisibility(Long spaceId, Long id, Integer visibility, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<PhotoDO>()
                .eq(PhotoDO::getSpaceId, spaceId)
                .eq(PhotoDO::getId, id)
                .eq(PhotoDO::getIsDeleted, false)
                .set(PhotoDO::getVisibility, visibility)
                .set(visibility != null && visibility != 1, PhotoDO::getIsCover, false)
                .set(PhotoDO::getUpdateTime, updateTime));
    }

    default int clearOtherCovers(Long spaceId, Long excludedId, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<PhotoDO>()
                .eq(PhotoDO::getSpaceId, spaceId)
                .eq(PhotoDO::getIsDeleted, false)
                .eq(PhotoDO::getIsCover, true)
                .ne(excludedId != null, PhotoDO::getId, excludedId)
                .set(PhotoDO::getIsCover, false)
                .set(PhotoDO::getUpdateTime, updateTime));
    }

    default PhotoDO findActiveById(Long spaceId, Long id) {
        return selectOne(new LambdaQueryWrapper<PhotoDO>()
                .eq(PhotoDO::getSpaceId, spaceId)
                .eq(PhotoDO::getId, id)
                .eq(PhotoDO::getIsDeleted, false));
    }

    default Long countActiveByCategoryId(Long spaceId, Long categoryId) {
        return selectCount(new LambdaQueryWrapper<PhotoDO>()
                .eq(PhotoDO::getSpaceId, spaceId)
                .eq(PhotoDO::getPhotoCategoryId, categoryId)
                .eq(PhotoDO::getIsDeleted, false));
    }
}
