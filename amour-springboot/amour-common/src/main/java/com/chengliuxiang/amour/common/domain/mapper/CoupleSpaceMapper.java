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
     * 编辑等待绑定空间的基础信息：只在 status=0 时生效，避免另一半加入后仍被修改。
     */
    default int updateBasicInfo(Long spaceId, String spaceName, String description,
                                LocalDateTime loveStartTime, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<CoupleSpaceDO>()
                .eq(CoupleSpaceDO::getId, spaceId)
                .eq(CoupleSpaceDO::getStatus, 0)
                .set(CoupleSpaceDO::getSpaceName, spaceName)
                .set(CoupleSpaceDO::getDescription, description)
                .set(CoupleSpaceDO::getLoveStartTime, loveStartTime)
                .setSql("revision = revision + 1")
                .set(CoupleSpaceDO::getUpdateTime, updateTime));
    }

    /**
     * 空间首页编辑：等待绑定或正常状态均可保存空间名、简介与恋爱开始时间。
     *
     * <p>只更新 couple_space 这一份事实来源，不再把 love_start_time 写入 couple_space_config，
     * 避免 SpaceStatusVO 与空间配置出现两份互相覆盖的数据。</p>
     */
    default int updateHomeInfo(Long spaceId, String spaceName, String description,
                               LocalDateTime loveStartTime, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<CoupleSpaceDO>()
                .eq(CoupleSpaceDO::getId, spaceId)
                .in(CoupleSpaceDO::getStatus, 0, 1)
                .set(CoupleSpaceDO::getSpaceName, spaceName)
                .set(CoupleSpaceDO::getDescription, description)
                .set(CoupleSpaceDO::getLoveStartTime, loveStartTime)
                .setSql("revision = revision + 1")
                .set(CoupleSpaceDO::getUpdateTime, updateTime));
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
     * 冻结空间：只允许从等待绑定或正常状态进入冻结，并强制空间级可见性为私密。
     */
    default int freeze(Long spaceId, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<CoupleSpaceDO>()
                .eq(CoupleSpaceDO::getId, spaceId)
                .in(CoupleSpaceDO::getStatus, 0, 1)
                .set(CoupleSpaceDO::getStatus, 2)
                .set(CoupleSpaceDO::getVisibility, 0)
                .set(CoupleSpaceDO::getUpdateTime, updateTime));
    }

    /**
     * 归档空间：允许从等待绑定、正常或冻结状态进入归档，并强制空间级可见性为私密。
     *
     * <p>新版本用户端已不提供归档入口（归档改由解绑申请取代），
     * 该方法保留给历史 status=3 数据的兼容维护，不应从用户接口直接调用。</p>
     */
    default int archive(Long spaceId, LocalDateTime archivedAt) {
        return update(null, new LambdaUpdateWrapper<CoupleSpaceDO>()
                .eq(CoupleSpaceDO::getId, spaceId)
                .in(CoupleSpaceDO::getStatus, 0, 1, 2)
                .set(CoupleSpaceDO::getStatus, 3)
                .set(CoupleSpaceDO::getVisibility, 0)
                .set(CoupleSpaceDO::getArchivedAt, archivedAt)
                .set(CoupleSpaceDO::getUpdateTime, archivedAt));
    }

    /**
     * 设置空间级公开/隐藏。隐藏额外允许冻结/归档但绝不改写状态。
     * 公开只能由审核通过后的 {@link #publishApproved} 写入。
     */
    default int updateVisibility(Long spaceId, int visibility, LocalDateTime now) {
        LambdaUpdateWrapper<CoupleSpaceDO> wrapper = new LambdaUpdateWrapper<CoupleSpaceDO>()
                .eq(CoupleSpaceDO::getId, spaceId)
                .set(CoupleSpaceDO::getVisibility, visibility)
                .set(CoupleSpaceDO::getUpdateTime, now);
        if (visibility == 0) {
            wrapper.in(CoupleSpaceDO::getStatus, 0, 1, 2, 3);
        } else {
            wrapper.eq(CoupleSpaceDO::getStatus, 1)
                    .apply("(SELECT COUNT(*) FROM couple_member WHERE space_id = {0} AND status = 1) = 2", spaceId);
        }
        return update(null, wrapper);
    }

    /**
     * 双方确认后恢复空间：冻结或归档状态恢复为正常，清空归档时间，并保持私密（不自动重新公开）。
     */
    default int restore(Long spaceId, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<CoupleSpaceDO>()
                .eq(CoupleSpaceDO::getId, spaceId)
                .in(CoupleSpaceDO::getStatus, 2, 3)
                .set(CoupleSpaceDO::getStatus, 1)
                .set(CoupleSpaceDO::getVisibility, 0)
                .set(CoupleSpaceDO::getArchivedAt, null)
                .set(CoupleSpaceDO::getUpdateTime, updateTime));
    }

    /**
     * 双方确认解绑：空间进入已删除状态，强制私密并写入 deletedAt。
     * 只允许从等待绑定/正常/冻结/归档进入，已删除空间重复确认返回 0。
     */
    default int markUnbound(Long spaceId, LocalDateTime deletedAt) {
        return update(null, new LambdaUpdateWrapper<CoupleSpaceDO>()
                .eq(CoupleSpaceDO::getId, spaceId)
                .in(CoupleSpaceDO::getStatus, 0, 1, 2, 3)
                .set(CoupleSpaceDO::getStatus, 5)
                .set(CoupleSpaceDO::getVisibility, 0)
                .set(CoupleSpaceDO::getDeletedAt, deletedAt)
                .set(CoupleSpaceDO::getUpdateTime, deletedAt));
    }

    /**
     * 管理员人工恢复：只允许从 status=5（双方已解绑）恢复到正常且私密的空间。
     * 清空归档/解绑时间，保留 publicAt、spaceCode、创建者与全部内容。
     */
    default int restoreUnbound(Long spaceId, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<CoupleSpaceDO>()
                .eq(CoupleSpaceDO::getId, spaceId)
                .eq(CoupleSpaceDO::getStatus, 5)
                .set(CoupleSpaceDO::getStatus, 1)
                .set(CoupleSpaceDO::getVisibility, 0)
                .set(CoupleSpaceDO::getArchivedAt, null)
                .set(CoupleSpaceDO::getDeletedAt, null)
                .set(CoupleSpaceDO::getUpdateTime, updateTime));
    }

    /**
     * 后台人工恢复时安全关闭「等待绑定且只有一名有效成员」的冲突空间。
     *
     * <p>条件更新同时校验：空间仍为 status=0、且当前只有 1 名有效成员。
     * 任一条件不满足（例如并发加入第三名成员）时返回 0，调用方必须回滚整笔恢复事务。
     * 只改空间状态与可见性，不删除任何内容。</p>
     */
    default int closeWaitingSingleMemberSpace(Long spaceId, LocalDateTime deletedAt) {
        return update(null, new LambdaUpdateWrapper<CoupleSpaceDO>()
                .eq(CoupleSpaceDO::getId, spaceId)
                .eq(CoupleSpaceDO::getStatus, 0)
                .apply("(SELECT COUNT(*) FROM couple_member WHERE space_id = {0} AND status = 1) = 1", spaceId)
                .set(CoupleSpaceDO::getStatus, 5)
                .set(CoupleSpaceDO::getVisibility, 0)
                .set(CoupleSpaceDO::getDeletedAt, deletedAt)
                .set(CoupleSpaceDO::getUpdateTime, deletedAt));
    }

    default List<CoupleSpaceDO> selectByCreatedBy(Long userId) {
        return selectList(new LambdaQueryWrapper<CoupleSpaceDO>()
                .eq(CoupleSpaceDO::getCreatedBy, userId)
                .orderByDesc(CoupleSpaceDO::getId));
    }

    /**
     * 审核通过前占用空间版本：只有工作版本仍等于审核快照版本时才成功。
     * 成功后版本 +1，防止旧审核结果覆盖用户在审核期间产生的新版本。
     */
    default int claimRevision(Long spaceId, int expectedRevision, LocalDateTime now) {
        return update(null, new LambdaUpdateWrapper<CoupleSpaceDO>()
                .eq(CoupleSpaceDO::getId, spaceId)
                .eq(CoupleSpaceDO::getRevision, expectedRevision)
                .setSql("revision = revision + 1")
                .set(CoupleSpaceDO::getUpdateTime, now));
    }

    /**
     * 审核通过后把空间切换为公开。
     *
     * <p>只允许 status=1 且仍有两名有效成员；publicAt 仅在首次公开时写入。
     * 使用条件更新，重复审核通过不会重复刷新首次公开时间。</p>
     */
    default int publishApproved(Long spaceId, LocalDateTime firstPublicAt, LocalDateTime now) {
        return update(null, new LambdaUpdateWrapper<CoupleSpaceDO>()
                .eq(CoupleSpaceDO::getId, spaceId)
                .eq(CoupleSpaceDO::getStatus, 1)
                .apply("(SELECT COUNT(*) FROM couple_member WHERE space_id = {0} AND status = 1) = 2", spaceId)
                .set(CoupleSpaceDO::getVisibility, 1)
                .set(firstPublicAt != null, CoupleSpaceDO::getPublicAt, firstPublicAt)
                .setSql("revision = revision + 1")
                .set(CoupleSpaceDO::getUpdateTime, now));
    }

    /**
     * 管理员下架整个空间：只改空间可见性，不改写 status，也不删除任何成员内容。
     */
    default int adminUnpublish(Long spaceId, LocalDateTime now) {
        return update(null, new LambdaUpdateWrapper<CoupleSpaceDO>()
                .eq(CoupleSpaceDO::getId, spaceId)
                .set(CoupleSpaceDO::getVisibility, 0)
                .setSql("revision = revision + 1")
                .set(CoupleSpaceDO::getUpdateTime, now));
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
                        .or().like(CoupleSpaceDO::getSpaceCode, keyword)
                        .or().apply("EXISTS (SELECT 1 FROM couple_member cm "
                                + "JOIN `user` u ON u.id = cm.user_id "
                                + "WHERE cm.space_id = couple_space.id "
                                + "AND u.amour_id LIKE {0})", "%" + keyword + "%"))
                .orderByDesc(CoupleSpaceDO::getId));
    }

    /**
     * 工作台空间状态计数。返回每行包含 status 与 count 两个字段。
     */
    default List<java.util.Map<String, Object>> selectStatusCounts() {
        return selectMaps(new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<CoupleSpaceDO>()
                .select("status AS status", "COUNT(*) AS total")
                .groupBy("status"));
    }
}
