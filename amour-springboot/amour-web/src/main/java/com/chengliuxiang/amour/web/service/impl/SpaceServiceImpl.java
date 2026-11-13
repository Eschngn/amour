package com.chengliuxiang.amour.web.service.impl;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.chengliuxiang.amour.common.domain.dos.CoupleInvitationDO;
import com.chengliuxiang.amour.common.domain.dos.CoupleMemberDO;
import com.chengliuxiang.amour.common.domain.dos.CoupleSpaceDO;
import com.chengliuxiang.amour.common.domain.dos.CoupleSpaceRestoreConfirmDO;
import com.chengliuxiang.amour.common.domain.dos.CoupleSpaceUnbindRequestDO;
import com.chengliuxiang.amour.common.domain.dos.UserDO;
import com.chengliuxiang.amour.common.domain.mapper.CoupleInvitationMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleMemberMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleSpaceMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleSpaceRestoreConfirmMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleSpaceUnbindRequestMapper;
import com.chengliuxiang.amour.common.domain.mapper.UserMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.space.AcceptInvitationReqVO;
import com.chengliuxiang.amour.web.model.vo.space.CreateInvitationReqVO;
import com.chengliuxiang.amour.web.model.vo.space.CreateInvitationRspVO;
import com.chengliuxiang.amour.web.model.vo.space.CreateSpaceReqVO;
import com.chengliuxiang.amour.web.model.vo.space.InvitationIdReqVO;
import com.chengliuxiang.amour.web.model.vo.space.InvitationPreviewVO;
import com.chengliuxiang.amour.web.model.vo.space.InvitationTokenReqVO;
import com.chengliuxiang.amour.web.model.vo.space.InvitationVO;
import com.chengliuxiang.amour.web.model.vo.space.RestoreConfirmVO;
import com.chengliuxiang.amour.web.model.vo.space.SpaceMemberVO;
import com.chengliuxiang.amour.web.model.vo.space.SpaceStatusVO;
import com.chengliuxiang.amour.web.model.vo.space.SpaceUnbindRequesterVO;
import com.chengliuxiang.amour.web.model.vo.space.SpaceVisibilityReqVO;
import com.chengliuxiang.amour.web.model.vo.space.SpaceVisibilityVO;
import com.chengliuxiang.amour.web.model.vo.space.UnbindStatusVO;
import com.chengliuxiang.amour.web.model.vo.space.UpdateSpaceReqVO;
import com.chengliuxiang.amour.web.service.SpaceService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import javax.annotation.PostConstruct;
import javax.annotation.Resource;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collection;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Slf4j
public class SpaceServiceImpl implements SpaceService {

    /**
     * 情侣空间最多容纳两名成员。
     */
    private static final int MEMBER_LIMIT = 2;

    private static final int SPACE_STATUS_WAITING = 0;
    private static final int SPACE_STATUS_NORMAL = 1;
    private static final int SPACE_STATUS_FROZEN = 2;
    private static final int SPACE_STATUS_ARCHIVED = 3;
    private static final int SPACE_STATUS_DELETED = 5;

    private static final int MEMBER_STATUS_ACTIVE = 1;
    private static final int MEMBER_STATUS_LEFT = 3;
    private static final int MEMBER_ROLE_CREATOR = 1;
    private static final int MEMBER_ROLE_PARTNER = 2;

    private static final int SPACE_VISIBILITY_PRIVATE = 0;
    private static final int SPACE_VISIBILITY_PUBLIC = 1;

    private static final int INVITATION_STATUS_PENDING = 0;
    private static final int INVITATION_STATUS_ACCEPTED = 1;
    private static final int INVITATION_STATUS_REVOKED = 2;
    private static final int INVITATION_STATUS_EXPIRED = 3;
    private static final int INVITATION_STATUS_REJECTED = 4;

    private static final int UNBIND_STATUS_PENDING = 0;
    private static final int UNBIND_STATUS_APPROVED = 1;
    private static final int UNBIND_STATUS_REJECTED = 2;
    private static final int UNBIND_STATUS_CANCELLED = 3;

    private static final String DEFAULT_SPACE_NAME = "我们的故事";
    private static final String SPACE_CODE_PREFIX = "SPACE-";
    private static final String SPACE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int SPACE_CODE_LENGTH = 12;
    private static final int SPACE_CODE_RETRY = 5;
    private static final long INVITATION_EXPIRE_DAYS = 7L;
    private static final int INVITATION_TOKEN_BYTES = 32;

    private static final SecureRandom RANDOM = new SecureRandom();

    @Resource
    private CoupleSpaceMapper coupleSpaceMapper;
    @Resource
    private CoupleMemberMapper coupleMemberMapper;
    @Resource
    private CoupleInvitationMapper coupleInvitationMapper;
    @Resource
    private CoupleSpaceRestoreConfirmMapper restoreConfirmMapper;
    @Resource
    private CoupleSpaceUnbindRequestMapper unbindRequestMapper;
    @Resource
    private UserMapper userMapper;
    @Resource
    private PlatformTransactionManager transactionManager;

    private TransactionTemplate transactionTemplate;

    /**
     * 用户级内存锁：保证同一用户的创建空间、接受邀请、确认恢复串行执行。
     * 数据库唯一索引与条件更新作为跨实例的最终防线。
     */
    private final ConcurrentHashMap<Long, ReentrantLock> userLocks = new ConcurrentHashMap<>();

    /**
     * 空间级内存锁：保证同一空间的退出、冻结、归档、恢复与可见性变更串行执行。
     * 加锁顺序固定为 userLock → spaceLock，避免死锁；数据库条件更新是跨实例的最终防线。
     */
    private final ConcurrentHashMap<Long, ReentrantLock> spaceLocks = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    @Override
    public Response<SpaceStatusVO> createSpace(CreateSpaceReqVO reqVO) {
        Long userId = currentUserId();
        ReentrantLock lock = userLock(userId);
        lock.lock();
        try {
            // 事务必须在锁内提交，否则并发请求可能在提交前拿到锁并读到旧数据。
            return transactionTemplate.execute(status -> doCreateSpace(userId, reqVO));
        } finally {
            lock.unlock();
        }
    }

    private Response<SpaceStatusVO> doCreateSpace(Long userId, CreateSpaceReqVO reqVO) {
        // 先锁用户行：与后台人工恢复、接受邀请保持同一把数据库级用户锁，
        // 避免多实例部署时「恢复旧空间」与「创建新空间」互相看不到对方的提交。
        userMapper.lockById(userId);
        // 只把「未解绑空间」中的有效成员关系视为占用；status=5 的历史残留不阻挡用户开始新空间。
        if (countActiveMembershipsInLiveSpaces(userId) > 0) {
            throw new BizException(ResponseCodeEnum.SPACE_ALREADY_EXISTS);
        }
        LocalDateTime now = LocalDateTime.now();
        CoupleSpaceDO space = CoupleSpaceDO.builder()
                .spaceName(StrUtil.blankToDefault(StrUtil.trim(reqVO.getSpaceName()), DEFAULT_SPACE_NAME))
                .description(StrUtil.blankToDefault(StrUtil.trim(reqVO.getDescription()), ""))
                .coverImage("")
                .status(SPACE_STATUS_WAITING)
                .visibility(0)
                .loveStartTime(reqVO.getLoveStartTime())
                .createdBy(userId)
                .createTime(now)
                .updateTime(now)
                .build();
        insertSpaceWithUniqueCode(space);

        CoupleMemberDO member = CoupleMemberDO.builder()
                .spaceId(space.getId())
                .userId(userId)
                .memberRole(MEMBER_ROLE_CREATOR)
                .status(MEMBER_STATUS_ACTIVE)
                .joinedAt(now)
                .createTime(now)
                .updateTime(now)
                .build();
        coupleMemberMapper.insertMember(member);
        return Response.success(buildSpaceStatus(space, userId));
    }

    @Override
    public Response<SpaceStatusVO> getCurrentSpace() {
        Long userId = currentUserId();
        CoupleMemberDO membership = getActiveMembership(userId);
        if (membership == null) {
            return Response.success(null);
        }
        CoupleSpaceDO space = coupleSpaceMapper.findById(membership.getSpaceId());
        // 已完成解绑的空间（status=5）对双方都不再是「我的情侣空间」，
        // 即使历史上残留了有效成员关系也不返回空间数据。
        if (space == null || isDeletedSpace(space)) {
            return Response.success(null);
        }
        return Response.success(buildSpaceStatus(space, userId));
    }

    @Override
    public Response<SpaceStatusVO> updateSpace(UpdateSpaceReqVO reqVO) {
        Long userId = currentUserId();
        return withSpaceLock(userId, spaceId ->
                transactionTemplate.execute(status -> doUpdateSpace(userId, spaceId, reqVO)));
    }

    /**
     * 编辑空间基础信息：仅等待另一半加入（status=0 且只有一名有效成员）时允许。
     *
     * <p>更新条件同时带上 status=0，避免与「接受邀请」并发时把已正常绑定的空间改掉。</p>
     */
    private Response<SpaceStatusVO> doUpdateSpace(Long userId, Long spaceId, UpdateSpaceReqVO reqVO) {
        requireActiveMembershipInSpace(userId, spaceId);
        CoupleSpaceDO space = requireSpace(spaceId);
        if (isDeletedSpace(space)) {
            throw new BizException(ResponseCodeEnum.SPACE_UNBOUND);
        }
        Long activeCount = coupleMemberMapper.countActiveBySpaceId(spaceId);
        if (space.getStatus() == null || space.getStatus() != SPACE_STATUS_WAITING
                || activeCount == null || activeCount >= MEMBER_LIMIT) {
            throw new BizException(ResponseCodeEnum.SPACE_UPDATE_NOT_ALLOWED);
        }

        String spaceName = StrUtil.blankToDefault(StrUtil.trim(reqVO.getSpaceName()), DEFAULT_SPACE_NAME);
        String description = StrUtil.blankToDefault(StrUtil.trim(reqVO.getDescription()), "");
        LocalDateTime now = LocalDateTime.now();
        int updated = coupleSpaceMapper.updateBasicInfo(
                spaceId, spaceName, description, reqVO.getLoveStartTime(), now);
        if (updated == 0) {
            throw new BizException(ResponseCodeEnum.SPACE_UPDATE_NOT_ALLOWED);
        }
        return Response.success(buildSpaceStatus(requireSpace(spaceId), userId));
    }

    @Override
    public Response<CreateInvitationRspVO> createInvitation(CreateInvitationReqVO reqVO) {
        Long userId = currentUserId();
        // 与解绑确认共用空间锁：确认解绑会撤销全部待处理邀请，
        // 只有把创建邀请也串行化，才能保证并发后不残留有效邀请。
        return withSpaceLock(userId, spaceId ->
                transactionTemplate.execute(status -> doCreateInvitation(userId, spaceId, reqVO)));
    }

    private Response<CreateInvitationRspVO> doCreateInvitation(Long userId, Long spaceId,
                                                               CreateInvitationReqVO reqVO) {
        // 与人工恢复共用用户行锁：避免恢复关闭冲突空间后，并发创建的邀请残留在已关闭空间。
        userMapper.lockById(userId);
        requireActiveMembershipInSpace(userId, spaceId);
        CoupleSpaceDO space = requireSpace(spaceId);
        if (isDeletedSpace(space)) {
            throw new BizException(ResponseCodeEnum.SPACE_UNBOUND);
        }
        LocalDateTime now = LocalDateTime.now();

        if (coupleMemberMapper.countActiveBySpaceId(space.getId()) >= MEMBER_LIMIT) {
            throw new BizException(ResponseCodeEnum.SPACE_MEMBER_LIMIT);
        }
        if (space.getStatus() != SPACE_STATUS_WAITING) {
            throw new BizException(ResponseCodeEnum.SPACE_STATUS_NOT_ALLOWED);
        }

        Long inviteeUserId = null;
        String inviteeAmourId = StrUtil.trimToNull(reqVO.getInviteeAmourId());
        if (inviteeAmourId != null) {
            UserDO invitee = userMapper.selectByAmourId(inviteeAmourId);
            if (invitee == null) {
                throw new BizException(ResponseCodeEnum.USER_NOT_EXIST);
            }
            if (invitee.getId().equals(userId)) {
                throw new BizException(ResponseCodeEnum.ALREADY_SPACE_MEMBER);
            }
            CoupleMemberDO targetMembership = coupleMemberMapper.selectBySpaceAndUser(space.getId(), invitee.getId());
            if (targetMembership != null && targetMembership.getStatus() == MEMBER_STATUS_ACTIVE) {
                throw new BizException(ResponseCodeEnum.ALREADY_SPACE_MEMBER);
            }
            if (countActiveMembershipsInLiveSpaces(invitee.getId()) > 0) {
                throw new BizException(ResponseCodeEnum.USER_ALREADY_IN_SPACE);
            }
            inviteeUserId = invitee.getId();
        }

        // 同一空间只保留最新一条待接受邀请：生成新链接后，旧链接立即失效。
        coupleInvitationMapper.revokePendingBySpaceId(space.getId(), now);

        String token = generateInvitationToken();
        LocalDateTime expiresAt = now.plusDays(INVITATION_EXPIRE_DAYS);
        CoupleInvitationDO invitation = CoupleInvitationDO.builder()
                .spaceId(space.getId())
                .inviterUserId(userId)
                .inviteeUserId(inviteeUserId)
                .tokenHash(hashToken(token))
                .tokenValue(token)
                .status(INVITATION_STATUS_PENDING)
                .expiresAt(expiresAt)
                .createTime(now)
                .updateTime(now)
                .build();
        coupleInvitationMapper.insertInvitation(invitation);

        return Response.success(CreateInvitationRspVO.builder()
                .invitationId(invitation.getId())
                .token(token)
                .expiresAt(expiresAt)
                .inviteeAmourId(inviteeAmourId)
                .build());
    }

    @Override
    public Response<List<InvitationVO>> listSpaceInvitations() {
        Long userId = currentUserId();
        CoupleMemberDO membership = requireActiveMembership(userId);
        List<CoupleInvitationDO> invitations = coupleInvitationMapper
                .selectPendingBySpaceId(membership.getSpaceId(), LocalDateTime.now());
        return Response.success(buildInvitationVOs(invitations, true));
    }

    @Override
    public Response<List<InvitationVO>> listReceivedInvitations() {
        Long userId = currentUserId();
        List<CoupleInvitationDO> invitations = coupleInvitationMapper
                .selectPendingByInvitee(userId, LocalDateTime.now());
        return Response.success(buildInvitationVOs(invitations, false));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Void> revokeInvitation(InvitationIdReqVO reqVO) {
        Long userId = currentUserId();
        CoupleInvitationDO invitation = coupleInvitationMapper.findById(reqVO.getInvitationId());
        if (invitation == null) {
            throw new BizException(ResponseCodeEnum.INVITATION_NOT_EXIST);
        }
        CoupleMemberDO membership = coupleMemberMapper.selectBySpaceAndUser(invitation.getSpaceId(), userId);
        if (membership == null || membership.getStatus() != MEMBER_STATUS_ACTIVE) {
            throw new BizException(ResponseCodeEnum.INVITATION_FORBIDDEN);
        }
        validateInvitationPending(invitation, LocalDateTime.now());

        int updated = coupleInvitationMapper.revoke(invitation.getId(), invitation.getSpaceId(), LocalDateTime.now());
        if (updated == 0) {
            throw new BizException(ResponseCodeEnum.INVITATION_NOT_PENDING);
        }
        return Response.success();
    }

    @Override
    public Response<InvitationPreviewVO> previewInvitation(InvitationTokenReqVO reqVO) {
        CoupleInvitationDO invitation = coupleInvitationMapper.selectByTokenHash(hashToken(reqVO.getToken()));
        if (invitation == null) {
            throw new BizException(ResponseCodeEnum.INVITATION_NOT_EXIST);
        }
        CoupleSpaceDO space = coupleSpaceMapper.findById(invitation.getSpaceId());
        if (space == null) {
            throw new BizException(ResponseCodeEnum.SPACE_NOT_EXIST);
        }

        LocalDateTime now = LocalDateTime.now();
        int status = displayInvitationStatus(invitation, now);
        int memberCount = coupleMemberMapper.countActiveBySpaceId(space.getId()).intValue();
        UserDO inviter = userMapper.findById(invitation.getInviterUserId());

        Object loginId = StpUtil.getLoginIdDefaultNull();
        Long currentUserId = loginId == null ? null : Long.valueOf(String.valueOf(loginId));
        boolean needLogin = currentUserId == null;
        boolean inviteeRestricted = invitation.getInviteeUserId() != null;
        Boolean inviteeMatched = null;
        boolean alreadyMember = false;
        boolean inOtherSpace = false;
        if (currentUserId != null) {
            inviteeMatched = !inviteeRestricted || invitation.getInviteeUserId().equals(currentUserId);
            CoupleMemberDO membership = coupleMemberMapper.selectBySpaceAndUser(space.getId(), currentUserId);
            alreadyMember = membership != null && membership.getStatus() == MEMBER_STATUS_ACTIVE;
            inOtherSpace = !alreadyMember
                    && countActiveMembershipsInLiveSpaces(currentUserId) > 0;
        }

        boolean joinable = status == INVITATION_STATUS_PENDING
                && space.getStatus() == SPACE_STATUS_WAITING
                && memberCount < MEMBER_LIMIT
                && (currentUserId == null
                || (Boolean.TRUE.equals(inviteeMatched) && !alreadyMember && !inOtherSpace));

        return Response.success(InvitationPreviewVO.builder()
                .invitationId(invitation.getId())
                .spaceId(space.getId())
                .spaceCode(space.getSpaceCode())
                .spaceName(space.getSpaceName())
                .description(space.getDescription())
                .coverImage(space.getCoverImage())
                .inviterAmourId(inviter == null ? "" : StrUtil.blankToDefault(inviter.getAmourId(), ""))
                .inviterName(inviter == null ? "恋人" : StrUtil.blankToDefault(inviter.getDisplayName(), "恋人"))
                .status(status)
                .statusText(invitationStatusText(status))
                .spaceStatus(space.getStatus())
                .memberCount(memberCount)
                .memberLimit(MEMBER_LIMIT)
                .expiresAt(invitation.getExpiresAt())
                .needLogin(needLogin)
                .inviteeRestricted(inviteeRestricted)
                .inviteeMatched(inviteeMatched)
                .alreadyMember(alreadyMember)
                .inOtherSpace(inOtherSpace)
                .joinable(joinable)
                .message(resolvePreviewMessage(status, space, memberCount, currentUserId,
                        inviteeRestricted, inviteeMatched, alreadyMember, inOtherSpace))
                .build());
    }

    @Override
    public Response<SpaceStatusVO> acceptInvitation(AcceptInvitationReqVO reqVO) {
        Long userId = currentUserId();
        ReentrantLock lock = userLock(userId);
        lock.lock();
        try {
            // 先按邀请定位空间，再按 userLock → spaceLock 的固定顺序加锁，
            // 避免与「确认解绑」并发时把邀请接受进一个刚刚被解绑的空间。
            Long spaceId = resolveInvitationSpaceId(reqVO, userId);
            ReentrantLock spaceLock = spaceLock(spaceId);
            spaceLock.lock();
            try {
                // 事务必须在锁内提交，避免并发加入不同空间时读到未提交数据导致重复加入。
                return transactionTemplate.execute(status -> doAcceptInvitation(userId, reqVO, spaceId));
            } finally {
                spaceLock.unlock();
            }
        } finally {
            lock.unlock();
        }
    }

    private Long resolveInvitationSpaceId(AcceptInvitationReqVO reqVO, Long userId) {
        CoupleInvitationDO invitation = findInvitationForAccept(reqVO, userId);
        if (invitation.getInviteeUserId() != null && !invitation.getInviteeUserId().equals(userId)) {
            throw new BizException(ResponseCodeEnum.INVITATION_FORBIDDEN);
        }
        return invitation.getSpaceId();
    }

    private Response<SpaceStatusVO> doAcceptInvitation(Long userId, AcceptInvitationReqVO reqVO, Long expectedSpaceId) {
        // 与创建空间、后台人工恢复共用数据库级用户锁：接受邀请成功后不能与恢复操作交叉，
        // 否则可能同时留下「原空间恢复 + 新空间已成双人」的冲突状态。
        userMapper.lockById(userId);
        LocalDateTime now = LocalDateTime.now();
        CoupleInvitationDO invitation = findInvitationForAccept(reqVO, userId);
        if (invitation.getInviteeUserId() != null && !invitation.getInviteeUserId().equals(userId)) {
            throw new BizException(ResponseCodeEnum.INVITATION_FORBIDDEN);
        }
        if (!Objects.equals(invitation.getSpaceId(), expectedSpaceId)) {
            throw new BizException(ResponseCodeEnum.INVITATION_FORBIDDEN);
        }

        CoupleSpaceDO space = requireSpace(invitation.getSpaceId());
        if (isDeletedSpace(space)) {
            // 已完成解绑的空间不能被旧邀请重新绑定：优先返回稳定的「已解绑」错误。
            throw new BizException(ResponseCodeEnum.SPACE_UNBOUND);
        }
        validateInvitationPending(invitation, now);
        CoupleMemberDO existing = coupleMemberMapper.selectBySpaceAndUser(space.getId(), userId);
        if (existing != null && existing.getStatus() == MEMBER_STATUS_ACTIVE) {
            throw new BizException(ResponseCodeEnum.ALREADY_SPACE_MEMBER);
        }
        if (countActiveMembershipsInLiveSpaces(userId) > 0) {
            throw new BizException(ResponseCodeEnum.USER_ALREADY_IN_SPACE);
        }
        if (coupleMemberMapper.countActiveBySpaceId(space.getId()) >= MEMBER_LIMIT) {
            throw new BizException(ResponseCodeEnum.SPACE_MEMBER_LIMIT);
        }
        if (space.getStatus() != SPACE_STATUS_WAITING) {
            throw new BizException(ResponseCodeEnum.SPACE_STATUS_NOT_ALLOWED);
        }

        // 原子占用邀请，防止同一邀请被并发接受。
        int claimed = coupleInvitationMapper.claim(invitation.getId(), now);
        if (claimed == 0) {
            throw resolveInvitationClaimFailure(invitation.getId(), now);
        }

        // 原子占用空间唯一剩余席位，防止不同用户并发接受不同邀请后超过成员上限。
        int bound = coupleSpaceMapper.bind(space.getId(), now);
        if (bound == 0) {
            throw new BizException(ResponseCodeEnum.SPACE_MEMBER_LIMIT);
        }

        if (existing != null) {
            Integer memberRole = existing.getMemberRole() == null
                    ? MEMBER_ROLE_PARTNER : existing.getMemberRole();
            int activated = coupleMemberMapper.activate(space.getId(), userId, memberRole, now, now);
            if (activated == 0) {
                throw new BizException(ResponseCodeEnum.ALREADY_SPACE_MEMBER);
            }
        } else {
            CoupleMemberDO member = CoupleMemberDO.builder()
                    .spaceId(space.getId())
                    .userId(userId)
                    .memberRole(MEMBER_ROLE_PARTNER)
                    .status(MEMBER_STATUS_ACTIVE)
                    .joinedAt(now)
                    .createTime(now)
                    .updateTime(now)
                    .build();
            try {
                coupleMemberMapper.insertMember(member);
            } catch (DataIntegrityViolationException e) {
                throw new BizException(ResponseCodeEnum.ALREADY_SPACE_MEMBER);
            }
        }

        // 最终兜底校验，防止任何异常数据绕过成员上限。
        if (coupleMemberMapper.countActiveBySpaceId(space.getId()) > MEMBER_LIMIT) {
            throw new BizException(ResponseCodeEnum.SPACE_MEMBER_LIMIT);
        }

        CoupleSpaceDO latestSpace = coupleSpaceMapper.findById(space.getId());
        return Response.success(buildSpaceStatus(latestSpace == null ? space : latestSpace, userId));
    }

    @Override
    public Response<Void> freezeSpace() {
        Long userId = currentUserId();
        return withSpaceLock(userId, spaceId ->
                transactionTemplate.execute(status -> doFreezeSpace(userId, spaceId)));
    }

    private Response<Void> doFreezeSpace(Long userId, Long spaceId) {
        requireActiveMembershipInSpace(userId, spaceId);
        CoupleSpaceDO space = requireSpace(spaceId);
        if (isDeletedSpace(space)) {
            throw new BizException(ResponseCodeEnum.SPACE_UNBOUND);
        }
        LocalDateTime now = LocalDateTime.now();

        // 条件更新同时写入 status=2 与 visibility=0：冻结必然下架广场。
        int updated = coupleSpaceMapper.freeze(spaceId, now);
        if (updated == 0) {
            throw new BizException(ResponseCodeEnum.SPACE_STATUS_NOT_ALLOWED);
        }
        coupleInvitationMapper.revokePendingBySpaceId(spaceId, now);
        restoreConfirmMapper.deleteBySpaceId(spaceId);
        // 生命周期状态变化后，旧的解绑申请失效，只保留历史记录。
        unbindRequestMapper.cancelPendingBySpaceId(spaceId, userId, now);
        return Response.success();
    }

    /**
     * 兼容旧前端的「退出并解绑」入口。
     *
     * <p>新语义下不存在「单方立即退出」：/space/leave 只创建解绑申请，
     * 成员关系与空间状态保持不变，必须由另一方确认后才会真正解绑。</p>
     */
    @Override
    public Response<UnbindStatusVO> leaveSpace() {
        return requestUnbind();
    }

    @Override
    public Response<UnbindStatusVO> requestUnbind() {
        Long userId = currentUserId();
        // 事务在锁内提交，保证「检查 pending + 插入申请」不会产生重复申请。
        return withUnbindSpaceLock(userId, spaceId ->
                transactionTemplate.execute(status -> doRequestUnbind(userId, spaceId)));
    }

    private Response<UnbindStatusVO> doRequestUnbind(Long userId, Long spaceId) {
        requireActiveMembershipInSpace(userId, spaceId);
        CoupleSpaceDO space = requireSpace(spaceId);
        if (isDeletedSpace(space)) {
            throw new BizException(ResponseCodeEnum.SPACE_UNBOUND);
        }
        // 只有等待绑定或正常状态可以发起解绑；冻结/历史归档需先恢复。
        if (isRestorableStatus(space.getStatus())) {
            throw new BizException(ResponseCodeEnum.SPACE_LEAVE_REQUIRES_RESTORE);
        }
        if (space.getStatus() == null
                || (space.getStatus() != SPACE_STATUS_WAITING && space.getStatus() != SPACE_STATUS_NORMAL)) {
            throw new BizException(ResponseCodeEnum.SPACE_STATUS_NOT_ALLOWED);
        }
        // 必须先有另一名有效成员：单人等待绑定阶段不提供解绑入口。
        Long activeCount = coupleMemberMapper.countActiveBySpaceId(spaceId);
        if (activeCount == null || activeCount < MEMBER_LIMIT) {
            throw new BizException(ResponseCodeEnum.SPACE_UNBIND_REQUIRES_PARTNER);
        }
        LocalDateTime now = LocalDateTime.now();

        CoupleSpaceUnbindRequestDO pending = unbindRequestMapper.selectPendingBySpaceId(spaceId);
        if (pending != null) {
            return respondExistingUnbind(spaceId, pending, userId);
        }

        CoupleSpaceUnbindRequestDO request = CoupleSpaceUnbindRequestDO.builder()
                .spaceId(spaceId)
                .requesterUserId(userId)
                .status(UNBIND_STATUS_PENDING)
                .createTime(now)
                .updateTime(now)
                .build();
        try {
            unbindRequestMapper.insertRequest(request);
        } catch (DataIntegrityViolationException e) {
            // 唯一索引兜底：并发提交时只有一方能成功创建申请。
            CoupleSpaceUnbindRequestDO existing = unbindRequestMapper.selectPendingBySpaceId(spaceId);
            if (existing == null) {
                throw new BizException(ResponseCodeEnum.SPACE_UNBIND_ALREADY_PENDING);
            }
            return respondExistingUnbind(spaceId, existing, userId);
        }
        return Response.success(buildUnbindStatus(spaceId, request, userId));
    }

    /**
     * 已存在待处理解绑申请时的响应。
     *
     * <p>只有同一发起人的重复提交才按幂等成功返回；另一方同时申请时不能再次“申请成功”，
     * 需要返回 20054，由前端提示并自动刷新为待处理状态。</p>
     */
    private Response<UnbindStatusVO> respondExistingUnbind(
            Long spaceId, CoupleSpaceUnbindRequestDO pending, Long userId) {
        if (!Objects.equals(pending.getRequesterUserId(), userId)) {
            throw new BizException(ResponseCodeEnum.SPACE_UNBIND_ALREADY_PENDING);
        }
        return Response.success(buildUnbindStatus(spaceId, pending, userId));
    }

    @Override
    public Response<UnbindStatusVO> cancelUnbind() {
        Long userId = currentUserId();
        return withUnbindSpaceLock(userId, spaceId ->
                transactionTemplate.execute(status -> doCancelUnbind(userId, spaceId)));
    }

    private Response<UnbindStatusVO> doCancelUnbind(Long userId, Long spaceId) {
        requireActiveMembershipInSpace(userId, spaceId);
        CoupleSpaceUnbindRequestDO pending = requirePendingUnbind(spaceId);
        if (!Objects.equals(pending.getRequesterUserId(), userId)) {
            throw new BizException(ResponseCodeEnum.SPACE_UNBIND_NOT_REQUESTER);
        }
        LocalDateTime now = LocalDateTime.now();
        int cancelled = unbindRequestMapper.cancel(pending.getId(), spaceId, userId, now);
        if (cancelled == 0) {
            // 条件更新失败：申请可能已被并发处理，或已不属于当前用户。
            CoupleSpaceUnbindRequestDO latest = unbindRequestMapper.findById(pending.getId());
            if (latest != null && Objects.equals(latest.getStatus(), UNBIND_STATUS_PENDING)
                    && !Objects.equals(latest.getRequesterUserId(), userId)) {
                throw new BizException(ResponseCodeEnum.SPACE_UNBIND_CANNOT_CANCEL);
            }
            throw new BizException(ResponseCodeEnum.SPACE_UNBIND_ALREADY_RESOLVED);
        }
        CoupleSpaceUnbindRequestDO latest = unbindRequestMapper.findById(pending.getId());
        return Response.success(buildUnbindStatus(spaceId, latest, userId));
    }

    @Override
    public Response<UnbindStatusVO> rejectUnbind() {
        Long userId = currentUserId();
        return withUnbindSpaceLock(userId, spaceId ->
                transactionTemplate.execute(status -> doRejectUnbind(userId, spaceId)));
    }

    private Response<UnbindStatusVO> doRejectUnbind(Long userId, Long spaceId) {
        CoupleMemberDO membership = requireActiveMembershipInSpace(userId, spaceId);
        CoupleSpaceUnbindRequestDO pending = requirePendingUnbind(spaceId);
        if (Objects.equals(pending.getRequesterUserId(), membership.getUserId())) {
            // 发起人不能自己拒绝自己的申请，只能取消。
            throw new BizException(ResponseCodeEnum.SPACE_UNBIND_NOT_PARTNER);
        }
        requireCurrentPartner(spaceId, userId);
        LocalDateTime now = LocalDateTime.now();
        int rejected = unbindRequestMapper.reject(pending.getId(), spaceId, userId, now);
        if (rejected == 0) {
            throw new BizException(ResponseCodeEnum.SPACE_UNBIND_ALREADY_RESOLVED);
        }
        CoupleSpaceUnbindRequestDO latest = unbindRequestMapper.findById(pending.getId());
        return Response.success(buildUnbindStatus(spaceId, latest, userId));
    }

    @Override
    public Response<UnbindStatusVO> confirmUnbind() {
        Long userId = currentUserId();
        return withUnbindSpaceLock(userId, spaceId ->
                transactionTemplate.execute(status -> doConfirmUnbind(userId, spaceId)));
    }

    /**
     * 确认解绑：只由申请对应空间的「另一名有效成员」执行。
     *
     * <p>整笔操作在同一个事务内完成：申请 approved、两名成员 status=3 + leftAt、
     * 空间 status=5（已解绑/逻辑删除）+ visibility=0 + deletedAt、撤销待处理邀请、清理恢复确认、
     * 清理其它 pending 申请。任一步失败都抛异常由事务整体回滚，情侣内容一律不删除。</p>
     */
    private Response<UnbindStatusVO> doConfirmUnbind(Long userId, Long spaceId) {
        requireActiveMembershipInSpace(userId, spaceId);
        CoupleSpaceDO space = requireSpace(spaceId);
        if (isDeletedSpace(space)) {
            throw new BizException(ResponseCodeEnum.SPACE_UNBOUND);
        }
        if (isRestorableStatus(space.getStatus())) {
            throw new BizException(ResponseCodeEnum.SPACE_LEAVE_REQUIRES_RESTORE);
        }
        if (space.getStatus() == null
                || (space.getStatus() != SPACE_STATUS_WAITING && space.getStatus() != SPACE_STATUS_NORMAL)) {
            throw new BizException(ResponseCodeEnum.SPACE_STATUS_NOT_ALLOWED);
        }
        CoupleSpaceUnbindRequestDO pending = requirePendingUnbind(spaceId);
        if (Objects.equals(pending.getRequesterUserId(), userId)) {
            // 发起人不能确认自己的申请，必须由另一方确认。
            throw new BizException(ResponseCodeEnum.SPACE_UNBIND_NOT_PARTNER);
        }
        List<CoupleMemberDO> activeMembers = requireCurrentPartner(spaceId, userId);
        LocalDateTime now = LocalDateTime.now();

        // 1. 条件更新申请为已同意；失败说明已被并发处理。
        int approved = unbindRequestMapper.approve(pending.getId(), spaceId, userId, now);
        if (approved == 0) {
            throw new BizException(ResponseCodeEnum.SPACE_UNBIND_ALREADY_RESOLVED);
        }

        // 2. 两名有效成员一次性退出：写 status=3、leftAt、updateTime。
        int left = coupleMemberMapper.leaveAllActive(spaceId, MEMBER_STATUS_LEFT, now, now);
        if (left != activeMembers.size()) {
            throw new BizException(ResponseCodeEnum.SPACE_STATUS_NOT_ALLOWED);
        }

        // 3. 空间逻辑删除：status=5、visibility=0、deletedAt。
        int unbound = coupleSpaceMapper.markUnbound(spaceId, now);
        if (unbound == 0) {
            throw new BizException(ResponseCodeEnum.SPACE_UNBOUND);
        }

        // 4. 撤销该空间全部待处理邀请，清理恢复确认与其它 pending 申请；内容表不做任何改动。
        coupleInvitationMapper.revokePendingBySpaceId(spaceId, now);
        restoreConfirmMapper.deleteBySpaceId(spaceId);
        unbindRequestMapper.cancelPendingBySpaceId(spaceId, userId, now);

        CoupleSpaceUnbindRequestDO latest = unbindRequestMapper.findById(pending.getId());
        return Response.success(buildUnbindStatus(spaceId, latest, userId));
    }

    private CoupleSpaceUnbindRequestDO requirePendingUnbind(Long spaceId) {
        CoupleSpaceUnbindRequestDO pending = unbindRequestMapper.selectPendingBySpaceId(spaceId);
        if (pending == null) {
            throw new BizException(ResponseCodeEnum.SPACE_UNBIND_NOT_PENDING);
        }
        return pending;
    }

    /**
     * 校验空间内确实存在「另一名」有效成员，并返回全部有效成员。
     */
    private List<CoupleMemberDO> requireCurrentPartner(Long spaceId, Long userId) {
        List<CoupleMemberDO> activeMembers = coupleMemberMapper.selectActiveBySpaceId(spaceId);
        boolean hasPartner = activeMembers.stream()
                .anyMatch(member -> !Objects.equals(member.getUserId(), userId));
        if (!hasPartner) {
            throw new BizException(ResponseCodeEnum.SPACE_UNBIND_NOT_PARTNER);
        }
        return activeMembers;
    }

    private UnbindStatusVO buildUnbindStatus(Long spaceId, CoupleSpaceUnbindRequestDO request, Long currentUserId) {
        if (request == null) {
            return UnbindStatusVO.builder()
                    .spaceId(spaceId)
                    .pending(false)
                    .requestedByMe(false)
                    .canConfirm(false)
                    .canCancel(false)
                    .build();
        }
        boolean pending = Objects.equals(request.getStatus(), UNBIND_STATUS_PENDING);
        boolean requestedByMe = Objects.equals(request.getRequesterUserId(), currentUserId);
        UserDO requester = userMapper.findById(request.getRequesterUserId());
        return UnbindStatusVO.builder()
                .requestId(request.getId())
                .spaceId(spaceId)
                .status(request.getStatus())
                .statusText(unbindStatusText(request.getStatus()))
                .pending(pending)
                .requestedByMe(requestedByMe)
                .canConfirm(pending && !requestedByMe)
                .canCancel(pending && requestedByMe)
                .requester(buildUnbindRequesterVO(requester))
                .requestedAt(request.getCreateTime())
                .resolvedAt(request.getResolvedAt())
                .build();
    }

    private SpaceUnbindRequesterVO buildUnbindRequesterVO(UserDO user) {
        if (user == null) {
            return null;
        }
        return SpaceUnbindRequesterVO.builder()
                .amourId(StrUtil.blankToDefault(user.getAmourId(), ""))
                .displayName(StrUtil.blankToDefault(user.getDisplayName(), "恋人"))
                .avatar(StrUtil.blankToDefault(user.getAvatar(), ""))
                .build();
    }

    private String unbindStatusText(Integer status) {
        if (status == null) {
            return "";
        }
        switch (status) {
            case UNBIND_STATUS_PENDING:
                return "待同意";
            case UNBIND_STATUS_APPROVED:
                return "已同意";
            case UNBIND_STATUS_REJECTED:
                return "已拒绝";
            case UNBIND_STATUS_CANCELLED:
                return "已取消";
            default:
                return "未知状态";
        }
    }

    @Override
    public Response<SpaceVisibilityVO> updateVisibility(SpaceVisibilityReqVO reqVO) {
        Integer visibility = reqVO == null ? null : reqVO.getVisibility();
        if (visibility == null || (visibility != SPACE_VISIBILITY_PRIVATE && visibility != SPACE_VISIBILITY_PUBLIC)) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        Long userId = currentUserId();
        // 事务必须在锁内提交，避免成员退出与公开/隐藏交叉提交后出现公开但无人可见的空间。
        return withSpaceLock(userId, spaceId ->
                transactionTemplate.execute(status -> doUpdateVisibility(userId, spaceId, visibility)));
    }

    private Response<SpaceVisibilityVO> doUpdateVisibility(Long userId, Long spaceId, int visibility) {
        requireActiveMembershipInSpace(userId, spaceId);
        CoupleSpaceDO space = requireSpace(spaceId);
        if (isDeletedSpace(space)) {
            throw new BizException(ResponseCodeEnum.SPACE_UNBOUND);
        }
        LocalDateTime now = LocalDateTime.now();

        if (visibility == SPACE_VISIBILITY_PUBLIC) {
            if (isRestorableStatus(space.getStatus())) {
                throw new BizException(ResponseCodeEnum.SPACE_FROZEN_OR_ARCHIVED_NOT_PUBLIC);
            }
            Long activeCount = coupleMemberMapper.countActiveBySpaceId(spaceId);
            if (space.getStatus() == null || space.getStatus() != SPACE_STATUS_NORMAL
                    || activeCount == null || activeCount < MEMBER_LIMIT) {
                // 未完成两人绑定或尚未进入正常状态时，统一提示需要先完成绑定。
                throw new BizException(ResponseCodeEnum.SPACE_NOT_TWO_MEMBERS);
            }

            // 首次公开写入 publicAt；已经公开过的空间只重复设置 visibility=1，保留首次公开时间。
            int published = coupleSpaceMapper.publishWithFirstPublicAt(spaceId, now);
            if (published == 0) {
                int republished = coupleSpaceMapper.updateVisibility(spaceId, SPACE_VISIBILITY_PUBLIC, now);
                if (republished == 0) {
                    throw new BizException(ResponseCodeEnum.SPACE_STATUS_NOT_ALLOWED);
                }
            }
        } else {
            // 隐藏幂等：冻结/归档本来就强制私密，显式设为 0 也不改变 status/archivedAt。
            int hidden = coupleSpaceMapper.updateVisibility(spaceId, SPACE_VISIBILITY_PRIVATE, now);
            if (hidden == 0) {
                throw new BizException(ResponseCodeEnum.SPACE_STATUS_NOT_ALLOWED);
            }
        }

        CoupleSpaceDO latest = coupleSpaceMapper.findById(spaceId);
        if (latest == null) {
            throw new BizException(ResponseCodeEnum.SPACE_NOT_EXIST);
        }
        return Response.success(buildVisibilityVO(latest));
    }

    @Override
    public Response<RestoreConfirmVO> confirmRestore() {
        Long userId = currentUserId();
        ReentrantLock userLock = userLock(userId);
        userLock.lock();
        try {
            Long spaceId = requireActiveSpaceId(userId);
            // 整个确认流程持有空间锁：阶段一提交的确认记录不会被并发的归档/恢复交叉删除，
            // 避免出现 status=1 却残留历史确认记录的中间态。
            ReentrantLock spaceLock = spaceLock(spaceId);
            spaceLock.lock();
            try {
                CoupleSpaceDO space = requireSpace(spaceId);
                if (isDeletedSpace(space)) {
                    throw new BizException(ResponseCodeEnum.SPACE_UNBOUND);
                }
                if (!isRestorableStatus(space.getStatus())) {
                    throw new BizException(ResponseCodeEnum.RESTORE_NOT_REQUIRED);
                }
                LocalDateTime now = LocalDateTime.now();

                // 第一阶段：单独提交当前用户的确认记录，保证另一方后续评估时可以看到。
                transactionTemplate.execute(status -> {
                    CoupleSpaceDO latest = requireSpace(spaceId);
                    if (!isRestorableStatus(latest.getStatus())) {
                        throw new BizException(ResponseCodeEnum.RESTORE_NOT_REQUIRED);
                    }
                    saveRestoreConfirm(spaceId, userId, now);
                    return null;
                });

                // 第二阶段：重新开启事务读取已提交的全部确认，有几名有效成员就要求几人确认。
                return transactionTemplate.execute(status -> evaluateRestore(spaceId, now));
            } finally {
                spaceLock.unlock();
            }
        } finally {
            userLock.unlock();
        }
    }

    private void saveRestoreConfirm(Long spaceId, Long userId, LocalDateTime now) {
        CoupleSpaceRestoreConfirmDO existing = restoreConfirmMapper.selectBySpaceAndUser(spaceId, userId);
        if (existing != null) {
            restoreConfirmMapper.touch(existing.getId(), now);
            return;
        }
        CoupleSpaceRestoreConfirmDO confirm = CoupleSpaceRestoreConfirmDO.builder()
                .spaceId(spaceId)
                .userId(userId)
                .createTime(now)
                .updateTime(now)
                .build();
        try {
            restoreConfirmMapper.insert(confirm);
        } catch (DataIntegrityViolationException e) {
            // 并发重复确认时唯一索引会拦截，视为已确认。
            log.debug("恢复确认记录已存在，spaceId: {}, userId: {}", spaceId, userId);
        }
    }

    private Response<RestoreConfirmVO> evaluateRestore(Long spaceId, LocalDateTime now) {
        CoupleSpaceDO space = coupleSpaceMapper.findById(spaceId);
        if (space == null) {
            throw new BizException(ResponseCodeEnum.SPACE_NOT_EXIST);
        }
        List<CoupleMemberDO> activeMembers = coupleMemberMapper.selectActiveBySpaceId(spaceId);
        if (CollUtil.isEmpty(activeMembers)) {
            throw new BizException(ResponseCodeEnum.SPACE_NOT_MEMBER);
        }
        int requiredCount = activeMembers.size();

        if (!isRestorableStatus(space.getStatus())) {
            return Response.success(buildRestoreVO(true, space.getStatus(), requiredCount, requiredCount));
        }

        Set<Long> activeUserIds = activeMembers.stream()
                .map(CoupleMemberDO::getUserId)
                .collect(Collectors.toSet());
        int confirmedCount = (int) restoreConfirmMapper.selectBySpaceId(spaceId).stream()
                .filter(confirm -> activeUserIds.contains(confirm.getUserId()))
                .count();

        if (confirmedCount >= requiredCount) {
            int restored = coupleSpaceMapper.restore(spaceId, now);
            if (restored > 0) {
                restoreConfirmMapper.deleteBySpaceId(spaceId);
                return Response.success(buildRestoreVO(true, SPACE_STATUS_NORMAL, requiredCount, requiredCount));
            }
            CoupleSpaceDO latest = coupleSpaceMapper.findById(spaceId);
            if (latest != null && !isRestorableStatus(latest.getStatus())) {
                return Response.success(buildRestoreVO(true, latest.getStatus(), confirmedCount, requiredCount));
            }
        }
        return Response.success(buildRestoreVO(false, space.getStatus(), confirmedCount, requiredCount));
    }

    private RestoreConfirmVO buildRestoreVO(boolean restored, Integer status, int confirmedCount, int requiredCount) {
        return RestoreConfirmVO.builder()
                .restored(restored)
                .status(status)
                .statusText(spaceStatusText(status))
                .confirmedCount(confirmedCount)
                .requiredCount(requiredCount)
                .build();
    }

    private CoupleInvitationDO findInvitationForAccept(AcceptInvitationReqVO reqVO, Long userId) {
        CoupleInvitationDO invitation;
        if (StrUtil.isNotBlank(reqVO.getToken())) {
            invitation = coupleInvitationMapper.selectByTokenHash(hashToken(reqVO.getToken()));
        } else if (reqVO.getInvitationId() != null) {
            invitation = coupleInvitationMapper.findById(reqVO.getInvitationId());
            // 链接邀请没有指定受邀人，不能通过可枚举的邀请 ID 接受。
            if (invitation != null && invitation.getInviteeUserId() == null) {
                throw new BizException(ResponseCodeEnum.INVITATION_FORBIDDEN);
            }
            if (invitation != null && !invitation.getInviteeUserId().equals(userId)) {
                throw new BizException(ResponseCodeEnum.INVITATION_FORBIDDEN);
            }
        } else {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        if (invitation == null) {
            throw new BizException(ResponseCodeEnum.INVITATION_NOT_EXIST);
        }
        return invitation;
    }

    private void validateInvitationPending(CoupleInvitationDO invitation, LocalDateTime now) {
        if (invitation.getStatus() == INVITATION_STATUS_ACCEPTED) {
            throw new BizException(ResponseCodeEnum.INVITATION_ALREADY_ACCEPTED);
        }
        if (invitation.getStatus() != INVITATION_STATUS_PENDING) {
            throw new BizException(ResponseCodeEnum.INVITATION_NOT_PENDING);
        }
        if (invitation.getExpiresAt() == null || !now.isBefore(invitation.getExpiresAt())) {
            throw new BizException(ResponseCodeEnum.INVITATION_EXPIRED);
        }
    }

    private BizException resolveInvitationClaimFailure(Long invitationId, LocalDateTime now) {
        CoupleInvitationDO latest = coupleInvitationMapper.findById(invitationId);
        if (latest == null) {
            return new BizException(ResponseCodeEnum.INVITATION_NOT_EXIST);
        }
        if (latest.getStatus() == INVITATION_STATUS_ACCEPTED) {
            return new BizException(ResponseCodeEnum.INVITATION_ALREADY_ACCEPTED);
        }
        if (latest.getStatus() == INVITATION_STATUS_REVOKED
                || latest.getStatus() == INVITATION_STATUS_REJECTED) {
            return new BizException(ResponseCodeEnum.INVITATION_NOT_PENDING);
        }
        if (latest.getExpiresAt() != null && !now.isBefore(latest.getExpiresAt())) {
            return new BizException(ResponseCodeEnum.INVITATION_EXPIRED);
        }
        return new BizException(ResponseCodeEnum.INVITATION_NOT_PENDING);
    }

    private String resolvePreviewMessage(int status, CoupleSpaceDO space, int memberCount,
                                         Long currentUserId, boolean inviteeRestricted,
                                         Boolean inviteeMatched, boolean alreadyMember,
                                         boolean inOtherSpace) {
        if (status == INVITATION_STATUS_EXPIRED) {
            return "邀请已过期";
        }
        if (status != INVITATION_STATUS_PENDING) {
            return invitationStatusText(status);
        }
        if (space.getStatus() != SPACE_STATUS_WAITING) {
            return "空间当前不可加入";
        }
        if (memberCount >= MEMBER_LIMIT) {
            return "情侣空间成员人数已达上限";
        }
        if (currentUserId == null) {
            return "登录后即可接受邀请";
        }
        if (inviteeRestricted && !Boolean.TRUE.equals(inviteeMatched)) {
            return "该邀请已指定给其他账号";
        }
        if (alreadyMember) {
            return "你已经是该情侣空间的成员";
        }
        if (inOtherSpace) {
            return "你已加入其他情侣空间，无法重复加入";
        }
        return null;
    }

    private SpaceStatusVO buildSpaceStatus(CoupleSpaceDO space, Long currentUserId) {
        LocalDateTime now = LocalDateTime.now();
        List<CoupleMemberDO> activeMembers = coupleMemberMapper.selectActiveBySpaceId(space.getId());
        Set<Long> memberUserIds = activeMembers.stream()
                .map(CoupleMemberDO::getUserId)
                .collect(Collectors.toSet());
        Map<Long, UserDO> userMap = loadUserMap(memberUserIds);

        List<SpaceMemberVO> members = activeMembers.stream()
                .map(member -> buildMemberVO(member, userMap.get(member.getUserId())))
                .collect(Collectors.toList());
        int memberCount = activeMembers.size();
        CoupleMemberDO currentMembership = activeMembers.stream()
                .filter(member -> Objects.equals(member.getUserId(), currentUserId))
                .findFirst()
                .orElse(null);

        boolean restoreRequired = isRestorableStatus(space.getStatus());
        int confirmedCount = 0;
        boolean confirmedByMe = false;
        if (restoreRequired) {
            for (CoupleSpaceRestoreConfirmDO confirm : restoreConfirmMapper.selectBySpaceId(space.getId())) {
                if (memberUserIds.contains(confirm.getUserId())) {
                    confirmedCount++;
                    if (Objects.equals(confirm.getUserId(), currentUserId)) {
                        confirmedByMe = true;
                    }
                }
            }
        }

        Long pendingInvitationCount = coupleInvitationMapper.countPendingBySpaceId(space.getId(), now);

        // 解绑申请只暴露公开信息：发起人的 amourId / displayName / avatar，不返回内部 userId。
        CoupleSpaceUnbindRequestDO unbindRequest = isDeletedSpace(space)
                ? null : unbindRequestMapper.selectPendingBySpaceId(space.getId());
        boolean unbindPending = unbindRequest != null;
        boolean unbindRequestedByMe = unbindPending && Objects.equals(unbindRequest.getRequesterUserId(), currentUserId);
        boolean unbindCanConfirm = unbindPending && !unbindRequestedByMe && currentMembership != null
                && memberCount == MEMBER_LIMIT;
        SpaceUnbindRequesterVO unbindRequester = null;
        if (unbindPending) {
            unbindRequester = buildUnbindRequesterVO(userMapper.findById(unbindRequest.getRequesterUserId()));
        }
        // 只有不存在待处理申请时才暴露最近一次已处理结果，
        // 让发起人看到“已被拒绝”，同时避免与当前 pending 申请混淆。
        CoupleSpaceUnbindRequestDO latestResolvedUnbind =
                (!unbindPending && !isDeletedSpace(space))
                        ? unbindRequestMapper.selectLatestResolvedBySpaceId(space.getId())
                        : null;

        return SpaceStatusVO.builder()
                .spaceId(space.getId())
                .spaceCode(space.getSpaceCode())
                .spaceName(space.getSpaceName())
                .description(space.getDescription())
                .coverImage(space.getCoverImage())
                .status(space.getStatus())
                .statusText(spaceStatusText(space.getStatus()))
                .visibility(space.getVisibility())
                .loveStartTime(space.getLoveStartTime())
                .publicAt(space.getPublicAt())
                .canSetVisibility(canSetVisibility(space, memberCount))
                .archivedAt(space.getArchivedAt())
                .deletedAt(space.getDeletedAt())
                .createTime(space.getCreateTime())
                .memberLimit(MEMBER_LIMIT)
                .memberCount(memberCount)
                .currentUserRole(currentMembership == null ? null : currentMembership.getMemberRole())
                .creator(Objects.equals(space.getCreatedBy(), currentUserId))
                .canInvite(space.getStatus() == SPACE_STATUS_WAITING && memberCount < MEMBER_LIMIT)
                .pendingInvitationCount(pendingInvitationCount == null ? 0 : pendingInvitationCount.intValue())
                .restoreRequired(restoreRequired)
                .restoreConfirmedCount(confirmedCount)
                .restoreConfirmedByMe(confirmedByMe)
                .members(members)
                .unbindPending(unbindPending)
                .unbindRequestedByMe(unbindRequestedByMe)
                .unbindCanConfirm(unbindCanConfirm)
                .unbindCanCancel(unbindRequestedByMe)
                .unbindRequester(unbindRequester)
                .unbindRequestedAt(unbindPending ? unbindRequest.getCreateTime() : null)
                .unbindRequestId(unbindPending ? unbindRequest.getId() : null)
                .unbindLastStatus(latestResolvedUnbind == null ? null : latestResolvedUnbind.getStatus())
                .unbindLastRequestedByMe(latestResolvedUnbind == null ? null
                        : Objects.equals(latestResolvedUnbind.getRequesterUserId(), currentUserId))
                .unbindLastResolvedAt(latestResolvedUnbind == null ? null : latestResolvedUnbind.getResolvedAt())
                .build();
    }

    /**
     * 公开资格：空间正常且有两名有效成员。冻结/归档/等待绑定/单人空间一律不可公开。
     */
    private boolean canSetVisibility(CoupleSpaceDO space, int memberCount) {
        return space.getStatus() != null
                && space.getStatus() == SPACE_STATUS_NORMAL
                && memberCount >= MEMBER_LIMIT;
    }

    private SpaceVisibilityVO buildVisibilityVO(CoupleSpaceDO space) {
        Long activeCount = coupleMemberMapper.countActiveBySpaceId(space.getId());
        return SpaceVisibilityVO.builder()
                .spaceId(space.getId())
                .status(space.getStatus())
                .statusText(spaceStatusText(space.getStatus()))
                .visibility(space.getVisibility())
                .publicAt(space.getPublicAt())
                .canSetVisibility(canSetVisibility(space, activeCount == null ? 0 : activeCount.intValue()))
                .build();
    }

    private SpaceMemberVO buildMemberVO(CoupleMemberDO member, UserDO user) {
        return SpaceMemberVO.builder()
                .amourId(user == null ? "" : StrUtil.blankToDefault(user.getAmourId(), ""))
                .displayName(user == null ? "恋人" : StrUtil.blankToDefault(user.getDisplayName(), "恋人"))
                .avatar(user == null ? "" : StrUtil.blankToDefault(user.getAvatar(), ""))
                .memberRole(member.getMemberRole())
                .roleText(memberRoleText(member.getMemberRole()))
                .joinedAt(member.getJoinedAt())
                .build();
    }

    private List<InvitationVO> buildInvitationVOs(List<CoupleInvitationDO> invitations, boolean includeToken) {
        if (CollUtil.isEmpty(invitations)) {
            return Collections.emptyList();
        }
        Set<Long> userIds = new HashSet<>();
        Set<Long> spaceIds = new HashSet<>();
        for (CoupleInvitationDO invitation : invitations) {
            userIds.add(invitation.getInviterUserId());
            if (invitation.getInviteeUserId() != null) {
                userIds.add(invitation.getInviteeUserId());
            }
            spaceIds.add(invitation.getSpaceId());
        }
        Map<Long, UserDO> userMap = loadUserMap(userIds);
        Map<Long, CoupleSpaceDO> spaceMap = loadSpaceMap(spaceIds);
        LocalDateTime now = LocalDateTime.now();

        return invitations.stream()
                .map(invitation -> {
                    int status = displayInvitationStatus(invitation, now);
                    UserDO inviter = userMap.get(invitation.getInviterUserId());
                    UserDO invitee = invitation.getInviteeUserId() == null
                            ? null : userMap.get(invitation.getInviteeUserId());
                    CoupleSpaceDO space = spaceMap.get(invitation.getSpaceId());
                    return InvitationVO.builder()
                            .invitationId(invitation.getId())
                            .spaceId(invitation.getSpaceId())
                            .spaceCode(space == null ? "" : space.getSpaceCode())
                            .spaceName(space == null ? "" : space.getSpaceName())
                            .inviterAmourId(inviter == null ? "" : StrUtil.blankToDefault(inviter.getAmourId(), ""))
                            .inviterName(inviter == null ? "恋人" : StrUtil.blankToDefault(inviter.getDisplayName(), "恋人"))
                            .inviteeAmourId(invitee == null ? null : StrUtil.blankToDefault(invitee.getAmourId(), ""))
                            .inviteeName(invitee == null ? null : StrUtil.blankToDefault(invitee.getDisplayName(), "恋人"))
                            .token(includeToken ? invitation.getTokenValue() : null)
                            .status(status)
                            .statusText(invitationStatusText(status))
                            .expiresAt(invitation.getExpiresAt())
                            .acceptedAt(invitation.getAcceptedAt())
                            .createTime(invitation.getCreateTime())
                            .build();
                })
                .collect(Collectors.toList());
    }

    private Map<Long, UserDO> loadUserMap(Collection<Long> userIds) {
        if (CollUtil.isEmpty(userIds)) {
            return Collections.emptyMap();
        }
        return userMapper.findUsersByIds(userIds).stream()
                .collect(Collectors.toMap(UserDO::getId, Function.identity(), (left, right) -> left));
    }

    private Map<Long, CoupleSpaceDO> loadSpaceMap(Collection<Long> spaceIds) {
        if (CollUtil.isEmpty(spaceIds)) {
            return Collections.emptyMap();
        }
        return coupleSpaceMapper.selectBatchIds(spaceIds).stream()
                .collect(Collectors.toMap(CoupleSpaceDO::getId, Function.identity(), (left, right) -> left));
    }

    private CoupleMemberDO getActiveMembership(Long userId) {
        // status=5 的空间已完成解绑，历史残留的有效成员关系不再代表「当前空间」。
        List<CoupleMemberDO> memberships = coupleMemberMapper.selectActiveInLiveSpaces(userId);
        if (CollUtil.isEmpty(memberships)) {
            return null;
        }
        if (memberships.size() > 1) {
            // 多条有效关系说明数据已冲突（例如后台恢复旧空间时未收口新空间）。
            // 不能按 id 排序静默选择，否则不同用户可能看到不同空间。
            log.warn("用户 {} 存在多个有效空间成员关系，数量：{}，spaceIds：{}",
                    userId, memberships.size(),
                    memberships.stream().map(CoupleMemberDO::getSpaceId).collect(Collectors.toList()));
            throw new BizException(ResponseCodeEnum.SPACE_MEMBERSHIP_CONFLICT);
        }
        return memberships.get(0);
    }

    /**
     * 统计用户仍处于「未解绑空间」中的有效成员关系数量。
     * 已解绑(status=5)空间中的历史残留不计入，保证解绑后双方都能重新创建或加入空间。
     */
    private long countActiveMembershipsInLiveSpaces(Long userId) {
        return coupleMemberMapper.selectActiveInLiveSpaces(userId).size();
    }

    private CoupleMemberDO requireActiveMembership(Long userId) {
        CoupleMemberDO membership = getActiveMembership(userId);
        if (membership == null) {
            throw new BizException(ResponseCodeEnum.SPACE_NOT_MEMBER);
        }
        return membership;
    }

    private CoupleSpaceDO requireSpace(Long spaceId) {
        CoupleSpaceDO space = coupleSpaceMapper.findById(spaceId);
        if (space == null) {
            throw new BizException(ResponseCodeEnum.SPACE_NOT_EXIST);
        }
        return space;
    }

    private Long currentUserId() {
        return StpUtil.getLoginIdAsLong();
    }

    private ReentrantLock userLock(Long userId) {
        return userLocks.computeIfAbsent(userId, key -> new ReentrantLock());
    }

    private ReentrantLock spaceLock(Long spaceId) {
        return spaceLocks.computeIfAbsent(spaceId, key -> new ReentrantLock());
    }

    /**
     * 统一生命周期写操作的加锁顺序：userLock → spaceLock，并在返回时释放。
     * 目标空间只由当前登录用户的有效成员关系推导，忽略任何客户端传入的 spaceId / userId。
     */
    private <T> T withSpaceLock(Long userId, Function<Long, T> action) {
        ReentrantLock userLock = userLock(userId);
        userLock.lock();
        try {
            Long spaceId = requireActiveSpaceId(userId);
            ReentrantLock spaceLock = spaceLock(spaceId);
            spaceLock.lock();
            try {
                return action.apply(spaceId);
            } finally {
                spaceLock.unlock();
            }
        } finally {
            userLock.unlock();
        }
    }

    /**
     * 解绑相关写操作的加锁入口。
     *
     * <p>与生命周期写操作不同，这里要能定位到「成员关系仍有效、但空间已 status=5」的历史残留，
     * 才能返回明确的「空间已完成解绑」错误；没有有效成员关系时仍返回 20034。
     * 加锁顺序与 {@link #withSpaceLock} 保持一致：userLock → spaceLock。</p>
     */
    private <T> T withUnbindSpaceLock(Long userId, Function<Long, T> action) {
        ReentrantLock userLock = userLock(userId);
        userLock.lock();
        try {
            Long spaceId = requireAnyActiveSpaceId(userId);
            ReentrantLock spaceLock = spaceLock(spaceId);
            spaceLock.lock();
            try {
                return action.apply(spaceId);
            } finally {
                spaceLock.unlock();
            }
        } finally {
            userLock.unlock();
        }
    }

    private Long requireAnyActiveSpaceId(Long userId) {
        List<CoupleMemberDO> memberships = coupleMemberMapper.selectActiveByUserId(userId);
        if (CollUtil.isEmpty(memberships)) {
            throw new BizException(ResponseCodeEnum.SPACE_NOT_MEMBER);
        }
        Long deletedSpaceId = null;
        List<Long> liveSpaceIds = new ArrayList<>();
        for (CoupleMemberDO membership : memberships) {
            CoupleSpaceDO space = coupleSpaceMapper.findById(membership.getSpaceId());
            if (space == null) {
                continue;
            }
            if (!isDeletedSpace(space)) {
                // 优先定位仍在使用的空间，避免被 status=5 的历史残留抢走目标。
                liveSpaceIds.add(space.getId());
            } else if (deletedSpaceId == null) {
                deletedSpaceId = space.getId();
            }
        }
        if (liveSpaceIds.size() > 1) {
            // 多条有效关系时不能随机选一个空间继续解绑，必须让用户/管理员先处理冲突。
            log.warn("用户 {} 存在多个未解绑空间的有效成员关系：{}", userId, liveSpaceIds);
            throw new BizException(ResponseCodeEnum.SPACE_MEMBERSHIP_CONFLICT);
        }
        if (!liveSpaceIds.isEmpty()) {
            return liveSpaceIds.get(0);
        }
        if (deletedSpaceId != null) {
            return deletedSpaceId;
        }
        throw new BizException(ResponseCodeEnum.SPACE_NOT_MEMBER);
    }

    private Long requireActiveSpaceId(Long userId) {
        return requireActiveMembership(userId).getSpaceId();
    }

    /**
     * 锁内重新校验：用户仍然是该空间的有效成员，避免退出/被移除后继续写入。
     */
    private CoupleMemberDO requireActiveMembershipInSpace(Long userId, Long spaceId) {
        CoupleMemberDO membership = coupleMemberMapper.selectBySpaceAndUser(spaceId, userId);
        if (membership == null || membership.getStatus() == null
                || membership.getStatus() != MEMBER_STATUS_ACTIVE) {
            throw new BizException(ResponseCodeEnum.SPACE_NOT_MEMBER);
        }
        return membership;
    }

    private void insertSpaceWithUniqueCode(CoupleSpaceDO space) {
        for (int attempt = 0; attempt < SPACE_CODE_RETRY; attempt++) {
            space.setId(null);
            space.setSpaceCode(generateSpaceCode());
            try {
                coupleSpaceMapper.insert(space);
                return;
            } catch (DataIntegrityViolationException e) {
                log.warn("空间编码冲突，重新生成，spaceCode: {}", space.getSpaceCode());
            }
        }
        throw new BizException(ResponseCodeEnum.SPACE_CREATE_FAILED);
    }

    private String generateSpaceCode() {
        StringBuilder builder = new StringBuilder(SPACE_CODE_PREFIX.length() + SPACE_CODE_LENGTH);
        builder.append(SPACE_CODE_PREFIX);
        for (int i = 0; i < SPACE_CODE_LENGTH; i++) {
            builder.append(SPACE_CODE_ALPHABET.charAt(RANDOM.nextInt(SPACE_CODE_ALPHABET.length())));
        }
        return builder.toString();
    }

    private String generateInvitationToken() {
        byte[] bytes = new byte[INVITATION_TOKEN_BYTES];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.trim().getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder(hash.length * 2);
            for (byte value : hash) {
                builder.append(String.format("%02x", value));
            }
            return builder.toString();
        } catch (NoSuchAlgorithmException e) {
            log.error("计算邀请令牌摘要失败", e);
            throw new BizException(ResponseCodeEnum.SYSTEM_ERROR);
        }
    }

    private int displayInvitationStatus(CoupleInvitationDO invitation, LocalDateTime now) {
        if (invitation.getStatus() == INVITATION_STATUS_PENDING
                && invitation.getExpiresAt() != null
                && !now.isBefore(invitation.getExpiresAt())) {
            return INVITATION_STATUS_EXPIRED;
        }
        return invitation.getStatus();
    }

    private boolean isRestorableStatus(Integer status) {
        return status != null && (status == SPACE_STATUS_FROZEN || status == SPACE_STATUS_ARCHIVED);
    }

    /**
     * 已完成解绑（逻辑删除）的空间：普通用户不能再访问，也不能被旧邀请重新绑定。
     */
    private boolean isDeletedSpace(CoupleSpaceDO space) {
        return space != null && Objects.equals(space.getStatus(), SPACE_STATUS_DELETED);
    }

    private String spaceStatusText(Integer status) {
        if (status == null) {
            return "";
        }
        switch (status) {
            case SPACE_STATUS_WAITING:
                return "等待绑定";
            case SPACE_STATUS_NORMAL:
                return "正常";
            case SPACE_STATUS_FROZEN:
                return "已冻结";
            case SPACE_STATUS_ARCHIVED:
                return "已归档";
            case 4:
                return "删除等待期";
            case 5:
                return "已解绑";
            default:
                return "未知状态";
        }
    }

    private String invitationStatusText(Integer status) {
        if (status == null) {
            return "";
        }
        switch (status) {
            case INVITATION_STATUS_PENDING:
                return "待接受";
            case INVITATION_STATUS_ACCEPTED:
                return "已接受";
            case INVITATION_STATUS_REVOKED:
                return "已撤销";
            case INVITATION_STATUS_EXPIRED:
                return "已过期";
            case INVITATION_STATUS_REJECTED:
                return "已拒绝";
            default:
                return "未知状态";
        }
    }

    private String memberRoleText(Integer memberRole) {
        if (memberRole == null) {
            return "";
        }
        return memberRole == MEMBER_ROLE_CREATOR ? "空间发起人" : "另一半";
    }
}
