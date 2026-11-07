package com.chengliuxiang.amour.web.service;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.collection.CollUtil;
import com.chengliuxiang.amour.common.domain.dos.CoupleMemberDO;
import com.chengliuxiang.amour.common.domain.dos.CoupleSpaceDO;
import com.chengliuxiang.amour.common.domain.mapper.CoupleMemberMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleSpaceMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import lombok.Getter;
import org.springframework.stereotype.Component;

import javax.annotation.Resource;
import java.util.List;
import java.util.Objects;

/**
 * 情侣空间内容读写授权。
 *
 * <p>所有用户端内容接口都必须通过本服务解析目标空间，禁止信任客户端传入的 spaceId / userId。
 * 目标空间只由 Sa-Token 登录态与数据库中的有效成员关系推导。</p>
 *
 * <p>状态规则：</p>
 * <ul>
 *     <li>等待绑定(status=0)与正常(status=1)允许读取；</li>
 *     <li>等待绑定期间的写入只允许空间发起人；正常状态允许任一有效成员；</li>
 *     <li>冻结、归档、删除等待期、已解绑一律拒绝读写，并返回明确的业务错误。</li>
 * </ul>
 */
@Component
public class SpaceContentAccessService {

    private static final int STATUS_WAITING = 0;
    private static final int STATUS_NORMAL = 1;
    private static final int STATUS_FROZEN = 2;
    private static final int STATUS_ARCHIVED = 3;
    private static final int STATUS_DELETING = 4;
    private static final int STATUS_DELETED = 5;

    private static final int MEMBER_ROLE_CREATOR = 1;
    private static final int MEMBER_STATUS_ACTIVE = 1;

    @Resource
    private CoupleMemberMapper coupleMemberMapper;

    @Resource
    private CoupleSpaceMapper coupleSpaceMapper;

    /**
     * 校验当前登录用户可读取当前空间内容，返回空间与成员上下文。
     */
    public SpaceAccess requireReadable() {
        return requireAccess(false);
    }

    /**
     * 校验当前登录用户可写入当前空间内容，返回空间与成员上下文。
     */
    public SpaceAccess requireEditable() {
        return requireAccess(true);
    }

    public Long requireReadableSpaceId() {
        return requireReadable().getSpace().getId();
    }

    public Long requireEditableSpaceId() {
        return requireEditable().getSpace().getId();
    }

    private SpaceAccess requireAccess(boolean write) {
        Long userId = StpUtil.getLoginIdAsLong();
        CoupleMemberDO membership = requireActiveMembership(userId);
        CoupleSpaceDO space = coupleSpaceMapper.findById(membership.getSpaceId());
        if (space == null) {
            throw new BizException(ResponseCodeEnum.SPACE_NOT_EXIST);
        }
        validateSpaceStatus(space);
        if (write && Objects.equals(space.getStatus(), STATUS_WAITING) && !isCreator(space, membership, userId)) {
            throw new BizException(ResponseCodeEnum.SPACE_CONTENT_EDIT_NOT_ALLOWED);
        }
        return new SpaceAccess(userId, space, membership);
    }

    private CoupleMemberDO requireActiveMembership(Long userId) {
        List<CoupleMemberDO> memberships = coupleMemberMapper.selectActiveInLiveSpaces(userId);
        if (CollUtil.isEmpty(memberships)) {
            // 与现有内容接口保持一致：历史 status=5 空间的残留成员返回“已解绑”，
            // 完全没有成员关系时返回“空间不存在”，避免泄露其他空间的信息。
            if (coupleMemberMapper.countActiveByUserId(userId) > 0) {
                throw new BizException(ResponseCodeEnum.SPACE_UNBOUND);
            }
            throw new BizException(ResponseCodeEnum.SPACE_NOT_EXIST);
        }
        CoupleMemberDO membership = memberships.get(0);
        if (membership.getStatus() == null || membership.getStatus() != MEMBER_STATUS_ACTIVE) {
            throw new BizException(ResponseCodeEnum.SPACE_NOT_MEMBER);
        }
        return membership;
    }

    private void validateSpaceStatus(CoupleSpaceDO space) {
        Integer status = space.getStatus();
        if (status == null) {
            throw new BizException(ResponseCodeEnum.SPACE_STATUS_NOT_ALLOWED);
        }
        if (status == STATUS_DELETED) {
            throw new BizException(ResponseCodeEnum.SPACE_UNBOUND);
        }
        if (status == STATUS_FROZEN) {
            throw new BizException(ResponseCodeEnum.SPACE_FROZEN);
        }
        if (status == STATUS_ARCHIVED) {
            throw new BizException(ResponseCodeEnum.SPACE_ARCHIVED);
        }
        if (status == STATUS_DELETING) {
            throw new BizException(ResponseCodeEnum.SPACE_STATUS_NOT_ALLOWED);
        }
        if (status != STATUS_WAITING && status != STATUS_NORMAL) {
            throw new BizException(ResponseCodeEnum.SPACE_STATUS_NOT_ALLOWED);
        }
        // 读取在等待绑定/正常状态都允许；写入时等待绑定状态的发起人身份由 requireAccess 继续校验。
    }

    private boolean isCreator(CoupleSpaceDO space, CoupleMemberDO membership, Long userId) {
        return Objects.equals(space.getCreatedBy(), userId)
                || Objects.equals(membership.getMemberRole(), MEMBER_ROLE_CREATOR);
    }

    /**
     * 空间内容操作的上下文。只暴露服务端解析出的空间、成员与用户 ID。
     */
    @Getter
    public static class SpaceAccess {

        private final Long userId;

        private final CoupleSpaceDO space;

        private final CoupleMemberDO membership;

        public SpaceAccess(Long userId, CoupleSpaceDO space, CoupleMemberDO membership) {
            this.userId = userId;
            this.space = space;
            this.membership = membership;
        }

        public Long getSpaceId() {
            return space.getId();
        }

        public boolean isNormalSpace() {
            return Objects.equals(space.getStatus(), STATUS_NORMAL);
        }

        /**
         * 公开内容前必须已完成两人绑定：仅正常状态空间允许 visibility=1。
         */
        public boolean canPublishContent() {
            return isNormalSpace();
        }
    }
}
