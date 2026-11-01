package com.chengliuxiang.amour.web.service.impl;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.chengliuxiang.amour.common.domain.dos.CoupleInvitationDO;
import com.chengliuxiang.amour.common.domain.dos.CoupleMemberDO;
import com.chengliuxiang.amour.common.domain.dos.CoupleSpaceDO;
import com.chengliuxiang.amour.common.domain.dos.CoupleSpaceRestoreConfirmDO;
import com.chengliuxiang.amour.common.domain.dos.UserDO;
import com.chengliuxiang.amour.common.domain.mapper.CoupleInvitationMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleMemberMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleSpaceMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleSpaceRestoreConfirmMapper;
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

    private static final int MEMBER_STATUS_ACTIVE = 1;
    private static final int MEMBER_ROLE_CREATOR = 1;
    private static final int MEMBER_ROLE_PARTNER = 2;

    private static final int INVITATION_STATUS_PENDING = 0;
    private static final int INVITATION_STATUS_ACCEPTED = 1;
    private static final int INVITATION_STATUS_REVOKED = 2;
    private static final int INVITATION_STATUS_EXPIRED = 3;
    private static final int INVITATION_STATUS_REJECTED = 4;

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
    private UserMapper userMapper;
    @Resource
    private PlatformTransactionManager transactionManager;

    private TransactionTemplate transactionTemplate;

    /**
     * 用户级内存锁：保证同一用户的创建空间、接受邀请、确认恢复串行执行。
     * 数据库唯一索引与条件更新作为跨实例的最终防线。
     */
    private final ConcurrentHashMap<Long, ReentrantLock> userLocks = new ConcurrentHashMap<>();

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
        if (coupleMemberMapper.countActiveByUserId(userId) > 0) {
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
        if (space == null) {
            return Response.success(null);
        }
        return Response.success(buildSpaceStatus(space, userId));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<CreateInvitationRspVO> createInvitation(CreateInvitationReqVO reqVO) {
        Long userId = currentUserId();
        CoupleMemberDO membership = requireActiveMembership(userId);
        CoupleSpaceDO space = requireSpace(membership.getSpaceId());
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
            if (coupleMemberMapper.countActiveByUserId(invitee.getId()) > 0) {
                throw new BizException(ResponseCodeEnum.USER_ALREADY_IN_SPACE);
            }
            inviteeUserId = invitee.getId();

            // 同一受邀账号只保留最新一条待接受邀请，避免旧链接继续生效。
            CoupleInvitationDO previous = coupleInvitationMapper.selectPendingBySpaceAndInvitee(space.getId(), inviteeUserId);
            if (previous != null) {
                coupleInvitationMapper.revoke(previous.getId(), space.getId(), now);
            }
        }

        String token = generateInvitationToken();
        LocalDateTime expiresAt = now.plusDays(INVITATION_EXPIRE_DAYS);
        CoupleInvitationDO invitation = CoupleInvitationDO.builder()
                .spaceId(space.getId())
                .inviterUserId(userId)
                .inviteeUserId(inviteeUserId)
                .tokenHash(hashToken(token))
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
        return Response.success(buildInvitationVOs(invitations));
    }

    @Override
    public Response<List<InvitationVO>> listReceivedInvitations() {
        Long userId = currentUserId();
        List<CoupleInvitationDO> invitations = coupleInvitationMapper
                .selectPendingByInvitee(userId, LocalDateTime.now());
        return Response.success(buildInvitationVOs(invitations));
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
                    && coupleMemberMapper.countActiveByUserId(currentUserId) > 0;
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
            // 事务必须在锁内提交，避免并发加入不同空间时读到未提交数据导致重复加入。
            return transactionTemplate.execute(status -> doAcceptInvitation(userId, reqVO));
        } finally {
            lock.unlock();
        }
    }

    private Response<SpaceStatusVO> doAcceptInvitation(Long userId, AcceptInvitationReqVO reqVO) {
        LocalDateTime now = LocalDateTime.now();
        CoupleInvitationDO invitation = findInvitationForAccept(reqVO, userId);
        if (invitation.getInviteeUserId() != null && !invitation.getInviteeUserId().equals(userId)) {
            throw new BizException(ResponseCodeEnum.INVITATION_FORBIDDEN);
        }
        validateInvitationPending(invitation, now);

        CoupleSpaceDO space = requireSpace(invitation.getSpaceId());
        CoupleMemberDO existing = coupleMemberMapper.selectBySpaceAndUser(space.getId(), userId);
        if (existing != null && existing.getStatus() == MEMBER_STATUS_ACTIVE) {
            throw new BizException(ResponseCodeEnum.ALREADY_SPACE_MEMBER);
        }
        if (coupleMemberMapper.countActiveByUserId(userId) > 0) {
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
    @Transactional(rollbackFor = Exception.class)
    public Response<Void> freezeSpace() {
        Long userId = currentUserId();
        CoupleMemberDO membership = requireActiveMembership(userId);
        CoupleSpaceDO space = requireSpace(membership.getSpaceId());
        LocalDateTime now = LocalDateTime.now();

        int updated = coupleSpaceMapper.freeze(space.getId(), now);
        if (updated == 0) {
            throw new BizException(ResponseCodeEnum.SPACE_STATUS_NOT_ALLOWED);
        }
        coupleInvitationMapper.revokePendingBySpaceId(space.getId(), now);
        restoreConfirmMapper.deleteBySpaceId(space.getId());
        return Response.success();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Void> archiveSpace() {
        Long userId = currentUserId();
        CoupleMemberDO membership = requireActiveMembership(userId);
        CoupleSpaceDO space = requireSpace(membership.getSpaceId());
        LocalDateTime now = LocalDateTime.now();

        int updated = coupleSpaceMapper.archive(space.getId(), now);
        if (updated == 0) {
            throw new BizException(ResponseCodeEnum.SPACE_STATUS_NOT_ALLOWED);
        }
        coupleInvitationMapper.revokePendingBySpaceId(space.getId(), now);
        restoreConfirmMapper.deleteBySpaceId(space.getId());
        return Response.success();
    }

    @Override
    public Response<RestoreConfirmVO> confirmRestore() {
        Long userId = currentUserId();
        ReentrantLock lock = userLock(userId);
        lock.lock();
        try {
            CoupleMemberDO membership = requireActiveMembership(userId);
            CoupleSpaceDO space = requireSpace(membership.getSpaceId());
            if (!isRestorableStatus(space.getStatus())) {
                throw new BizException(ResponseCodeEnum.RESTORE_NOT_REQUIRED);
            }
            Long spaceId = space.getId();
            LocalDateTime now = LocalDateTime.now();

            // 第一阶段：单独提交当前用户的确认记录，保证另一方后续评估时可以看到。
            transactionTemplate.execute(status -> {
                saveRestoreConfirm(spaceId, userId, now);
                return null;
            });

            // 第二阶段：重新开启事务读取已提交的全部确认，双方均确认时恢复空间。
            return transactionTemplate.execute(status -> evaluateRestore(spaceId, now));
        } finally {
            lock.unlock();
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
                .archivedAt(space.getArchivedAt())
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

    private List<InvitationVO> buildInvitationVOs(List<CoupleInvitationDO> invitations) {
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
        List<CoupleMemberDO> memberships = coupleMemberMapper.selectActiveByUserId(userId);
        if (CollUtil.isEmpty(memberships)) {
            return null;
        }
        if (memberships.size() > 1) {
            log.warn("用户 {} 存在多个有效空间成员关系，数量：{}", userId, memberships.size());
        }
        return memberships.get(0);
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
                return "已删除";
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
