package com.chengliuxiang.amour.admin.service.impl;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceContentItemVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceDetailReqVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceDetailRspVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceInvitationVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceLifecycleEventVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceMemberVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpacePageReqVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpacePageRspVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceRestoreConflictVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceRestoreReqVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceRestoreRspVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceRestoreSummaryVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceUnbindSummaryVO;
import com.chengliuxiang.amour.admin.security.AdminAuthorizationService;
import com.chengliuxiang.amour.admin.service.AdminAuditService;
import com.chengliuxiang.amour.admin.service.AdminSpaceService;
import com.chengliuxiang.amour.common.constant.AdminAuditConstants;
import com.chengliuxiang.amour.common.constant.AdminPermissionConstants;
import com.chengliuxiang.amour.common.constant.ContentGovernanceConstants;
import com.chengliuxiang.amour.common.domain.dos.AdminAuditLogDO;
import com.chengliuxiang.amour.common.domain.dos.AnniversaryDO;
import com.chengliuxiang.amour.common.domain.dos.ContentReportDO;
import com.chengliuxiang.amour.common.domain.dos.CoupleInvitationDO;
import com.chengliuxiang.amour.common.domain.dos.CoupleMemberDO;
import com.chengliuxiang.amour.common.domain.dos.CoupleSpaceDO;
import com.chengliuxiang.amour.common.domain.dos.CoupleSpaceRestoreConfirmDO;
import com.chengliuxiang.amour.common.domain.dos.CoupleSpaceUnbindRequestDO;
import com.chengliuxiang.amour.common.domain.dos.MessageDO;
import com.chengliuxiang.amour.common.domain.dos.PhotoCategoryDO;
import com.chengliuxiang.amour.common.domain.dos.PhotoDO;
import com.chengliuxiang.amour.common.domain.dos.StoryChapterDO;
import com.chengliuxiang.amour.common.domain.dos.StoryNodeDO;
import com.chengliuxiang.amour.common.domain.dos.UserDO;
import com.chengliuxiang.amour.common.domain.mapper.AnniversaryMapper;
import com.chengliuxiang.amour.common.domain.mapper.ContentReportMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleInvitationMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleMemberMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleSpaceMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleSpaceRestoreConfirmMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleSpaceUnbindRequestMapper;
import com.chengliuxiang.amour.common.domain.mapper.MessageMapper;
import com.chengliuxiang.amour.common.domain.mapper.PhotoCategoryMapper;
import com.chengliuxiang.amour.common.domain.mapper.PhotoMapper;
import com.chengliuxiang.amour.common.domain.mapper.StoryChapterMapper;
import com.chengliuxiang.amour.common.domain.mapper.StoryNodeMapper;
import com.chengliuxiang.amour.common.domain.mapper.UserMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import javax.annotation.PostConstruct;
import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 后台情侣空间管理实现。
 *
 * <p>查询只返回后台需要的公开业务字段，不暴露密码、openid、内部 userId、邀请明文 token。
 * 人工恢复只处理 status=5（双方已完成解绑）空间，并在空间锁内通过事务一次性恢复
 * 两名已退出成员、空间状态与清理记录，任何一步失败都会整体回滚。</p>
 */
@Service
@Slf4j
public class AdminSpaceServiceImpl implements AdminSpaceService {

    private static final int SPACE_STATUS_WAITING = 0;
    private static final int SPACE_STATUS_NORMAL = 1;
    private static final int SPACE_STATUS_FROZEN = 2;
    private static final int SPACE_STATUS_ARCHIVED = 3;
    private static final int SPACE_STATUS_DELETED = 5;

    private static final int MEMBER_ROLE_CREATOR = 1;
    private static final int MEMBER_ROLE_PARTNER = 2;

    private static final int MEMBER_STATUS_INVITING = 0;
    private static final int MEMBER_STATUS_ACTIVE = 1;
    private static final int MEMBER_STATUS_PAUSED = 2;
    private static final int MEMBER_STATUS_LEFT = 3;
    private static final int MEMBER_STATUS_REMOVED = 4;

    private static final int SPACE_VISIBILITY_PRIVATE = 0;
    private static final int SPACE_VISIBILITY_PUBLIC = 1;

    private static final int INVITATION_STATUS_PENDING = 0;
    private static final int INVITATION_STATUS_ACCEPTED = 1;
    private static final int INVITATION_STATUS_REVOKED = 2;
    private static final int INVITATION_STATUS_EXPIRED = 3;
    private static final int INVITATION_STATUS_REJECTED = 4;

    private static final int UNBIND_STATUS_PENDING = 0;

    private static final int DEFAULT_PAGE_SIZE = 10;
    private static final int MAX_PAGE_SIZE = 100;
    private static final int CONTENT_INDEX_LIMIT = 50;

    private static final DateTimeFormatter DATE_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

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
    private StoryNodeMapper storyNodeMapper;
    @Resource
    private StoryChapterMapper storyChapterMapper;
    @Resource
    private PhotoMapper photoMapper;
    @Resource
    private PhotoCategoryMapper photoCategoryMapper;
    @Resource
    private MessageMapper messageMapper;
    @Resource
    private AnniversaryMapper anniversaryMapper;
    @Resource
    private ContentReportMapper contentReportMapper;
    @Resource
    private AdminAuditService adminAuditService;
    @Resource
    private AdminAuthorizationService adminAuthorizationService;
    @Resource
    private PlatformTransactionManager transactionManager;

    /**
     * 空间级内存锁：同一空间的多次人工恢复串行执行。
     * 数据库状态条件更新是跨实例的最终防线。
     */
    private final ConcurrentHashMap<Long, ReentrantLock> spaceLocks = new ConcurrentHashMap<>();

    private TransactionTemplate transactionTemplate;

    @PostConstruct
    public void init() {
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    @Override
    public Response<PageResult<AdminSpacePageRspVO>> findSpacePage(AdminSpacePageReqVO reqVO) {
        adminAuthorizationService.requirePermission(AdminPermissionConstants.SPACE_QUERY);
        AdminSpacePageReqVO query = reqVO == null ? new AdminSpacePageReqVO() : reqVO;
        validateFilters(query);

        long current = query.getCurrent() == null || query.getCurrent() < 1 ? 1 : query.getCurrent();
        long size = query.getSize() == null || query.getSize() < 1
                ? DEFAULT_PAGE_SIZE : Math.min(query.getSize(), MAX_PAGE_SIZE);

        IPage<CoupleSpaceDO> page = coupleSpaceMapper.selectAdminPage(
                current, size, StrUtil.trimToNull(query.getKeyword()), query.getStatus(), query.getVisibility());

        List<CoupleSpaceDO> spaces = page.getRecords();
        Map<Long, List<CoupleMemberDO>> memberMap = loadMemberMap(spaces);
        Map<Long, UserDO> userMap = loadUserMap(memberMap);
        Map<Long, List<AdminSpaceRestoreConflictVO>> conflictMap = loadRestoreConflictMap(spaces, memberMap);

        List<AdminSpacePageRspVO> records = spaces.stream()
                .map(space -> toResponse(space, memberMap.get(space.getId()), userMap,
                        conflictMap.getOrDefault(space.getId(), Collections.emptyList())))
                .collect(Collectors.toList());

        return Response.success(PageResult.<AdminSpacePageRspVO>builder()
                .current(page.getCurrent())
                .size(page.getSize())
                .total(page.getTotal())
                .records(records)
                .build());
    }

    @Override
    public Response<AdminSpaceDetailRspVO> findSpaceDetail(AdminSpaceDetailReqVO reqVO) {
        adminAuthorizationService.requirePermission(AdminPermissionConstants.SPACE_QUERY);
        if (reqVO == null || reqVO.getSpaceId() == null) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        CoupleSpaceDO space = coupleSpaceMapper.findById(reqVO.getSpaceId());
        if (space == null) {
            throw new BizException(ResponseCodeEnum.SPACE_NOT_EXIST);
        }

        Long spaceId = space.getId();
        List<CoupleMemberDO> members = coupleMemberMapper.selectBySpaceId(spaceId);
        List<CoupleInvitationDO> invitations = coupleInvitationMapper.selectBySpaceId(spaceId);
        List<StoryNodeDO> stories = storyNodeMapper.selectAdminGovernancePage(
                1, CONTENT_INDEX_LIMIT, spaceId, null, null, true).getRecords();
        List<PhotoDO> photos = photoMapper.findAdminGovernancePage(
                1, CONTENT_INDEX_LIMIT, spaceId, null, null, true).getRecords();
        List<MessageDO> messages = messageMapper.selectAdminGovernancePage(
                1, CONTENT_INDEX_LIMIT, spaceId, null, true).getRecords();
        List<AnniversaryDO> anniversaries = anniversaryMapper.selectAdminGovernancePage(
                1, CONTENT_INDEX_LIMIT, spaceId, null, null, true).getRecords();
        List<CoupleSpaceUnbindRequestDO> unbindRequests = unbindRequestMapper.selectBySpaceId(spaceId);
        List<CoupleSpaceRestoreConfirmDO> restoreConfirms = restoreConfirmMapper.selectBySpaceId(spaceId);

        Set<Long> userIds = new HashSet<>();
        members.forEach(member -> addUserId(userIds, member.getUserId()));
        invitations.forEach(invitation -> {
            addUserId(userIds, invitation.getInviterUserId());
            addUserId(userIds, invitation.getInviteeUserId());
        });
        stories.forEach(story -> addUserId(userIds, story.getCreatedBy()));
        photos.forEach(photo -> addUserId(userIds, photo.getCreatedBy()));
        messages.forEach(message -> addUserId(userIds, message.getUserId()));
        anniversaries.forEach(anniversary -> addUserId(userIds, anniversary.getCreatedBy()));
        unbindRequests.forEach(request -> addUserId(userIds, request.getRequesterUserId()));
        restoreConfirms.forEach(confirm -> addUserId(userIds, confirm.getUserId()));
        Map<Long, UserDO> userMap = loadUsers(userIds);

        Map<Long, String> chapterNameMap = storyChapterMapper.selectBySpaceId(spaceId).stream()
                .collect(Collectors.toMap(StoryChapterDO::getId,
                        chapter -> StrUtil.blankToDefault(chapter.getName(), ""),
                        (left, right) -> left));
        Map<Long, String> categoryNameMap = photoCategoryMapper.findAdminList(spaceId).stream()
                .collect(Collectors.toMap(PhotoCategoryDO::getId, PhotoCategoryDO::getCategoryName,
                        (left, right) -> left));
        Map<String, Long> pendingReportMap = buildPendingReportMap(spaceId);

        List<AdminSpaceMemberVO> memberVOs = members.stream()
                .map(member -> buildMemberVO(member, userMap.get(member.getUserId())))
                .collect(Collectors.toList());

        long storyCount = count(storyNodeMapper.countActiveBySpaceId(spaceId));
        long photoCount = count(photoMapper.countActiveBySpaceId(spaceId));
        long messageCount = count(messageMapper.countActiveBySpaceId(spaceId));
        long anniversaryCount = count(anniversaryMapper.countActiveBySpaceId(spaceId));

        List<AdminSpaceRestoreConflictVO> restoreConflicts = loadRestoreConflictMap(
                Collections.singletonList(space),
                Collections.singletonMap(spaceId, members))
                .getOrDefault(spaceId, Collections.emptyList());
        String restoreBlockReason = combineRestoreBlockReason(
                restoreBlockReason(space, members), restoreConflicts);

        Response<AdminSpaceDetailRspVO> response = Response.success(AdminSpaceDetailRspVO.builder()
                .spaceId(spaceId)
                .spaceCode(space.getSpaceCode())
                .spaceName(space.getSpaceName())
                .description(space.getDescription())
                .coverImage(space.getCoverImage())
                .status(space.getStatus())
                .statusText(spaceStatusText(space.getStatus()))
                .visibility(space.getVisibility())
                .visibilityText(visibilityText(space.getVisibility()))
                .loveStartTime(format(space.getLoveStartTime()))
                .publicAt(format(space.getPublicAt()))
                .archivedAt(format(space.getArchivedAt()))
                .deleteAfter(format(space.getDeleteAfter()))
                .deletedAt(format(space.getDeletedAt()))
                .createTime(format(space.getCreateTime()))
                .updateTime(format(space.getUpdateTime()))
                .memberCount(members.size())
                .activeMemberCount((int) members.stream()
                        .filter(member -> Objects.equals(member.getStatus(), MEMBER_STATUS_ACTIVE))
                        .count())
                .storyCount(storyCount)
                .photoCount(photoCount)
                .messageCount(messageCount)
                .anniversaryCount(anniversaryCount)
                .publicStoryCount(count(storyNodeMapper.countPublicBySpaceId(spaceId)))
                .publicPhotoCount(count(photoMapper.countPublicBySpaceId(spaceId)))
                .publicAnniversaryCount(count(anniversaryMapper.countPublicBySpaceId(spaceId)))
                .contentCount(storyCount + photoCount + messageCount + anniversaryCount)
                .members(memberVOs)
                .invitations(buildInvitationVOs(invitations, userMap))
                .timeline(buildTimeline(space, members, unbindRequests, userMap))
                .stories(buildStoryItems(stories, chapterNameMap, userMap, pendingReportMap))
                .photos(buildPhotoItems(photos, categoryNameMap, userMap, pendingReportMap))
                .messages(buildMessageItems(messages, userMap, pendingReportMap))
                .anniversaries(buildAnniversaryItems(anniversaries, userMap, pendingReportMap))
                .unbind(buildUnbindSummary(spaceId, unbindRequests, userMap))
                .restore(buildRestoreSummary(space, members, restoreConfirms, userMap,
                        restoreBlockReason, restoreConflicts))
                .build());

        // 空间详情会展示私密内容索引，按现有架构记录一次读取审计；审计失败不阻断排障。
        try {
            adminAuditService.record(AdminAuditLogDO.builder()
                    .adminUserId(StpUtil.getLoginIdAsLong())
                    .action(AdminAuditConstants.ACTION_SPACE_DETAIL_VIEW)
                    .targetType(AdminAuditConstants.TARGET_SPACE)
                    .targetSpaceId(spaceId)
                    .reason("后台排障查看空间详情")
                    .result(AdminAuditConstants.RESULT_SUCCESS)
                    .detail("members=" + members.size() + ", story=" + storyCount + ", photo=" + photoCount)
                    .createTime(LocalDateTime.now())
                    .build());
        } catch (Exception exception) {
            log.warn("空间详情访问审计记录失败，spaceId: {}", spaceId, exception);
        }
        return response;
    }

    @Override
    public Response<AdminSpaceRestoreRspVO> restoreSpace(AdminSpaceRestoreReqVO reqVO) {
        adminAuthorizationService.requirePermission(AdminPermissionConstants.SPACE_RESTORE);
        if (reqVO == null || reqVO.getSpaceId() == null) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        String reason = StrUtil.trim(reqVO.getReason());
        if (StrUtil.isBlank(reason)) {
            throw new BizException(ResponseCodeEnum.REASON_REQUIRED);
        }
        Long spaceId = reqVO.getSpaceId();
        Long adminUserId = StpUtil.getLoginIdAsLong();
        ReentrantLock lock = spaceLocks.computeIfAbsent(spaceId, key -> new ReentrantLock());
        lock.lock();
        try {
            // 事务必须在锁内提交，避免其他请求在提交前读到一半恢复的数据。
            // JVM 锁只负责单实例串行；用户行锁与状态条件更新负责多实例最终一致性。
            return transactionTemplate.execute(status -> doRestoreSpace(spaceId, adminUserId, reason));
        } catch (RuntimeException exception) {
            recordRestoreFailure(spaceId, adminUserId, reason, exception);
            throw exception;
        } finally {
            lock.unlock();
        }
    }

    /**
     * 人工恢复主流程。
     *
     * <p>顺序固定为：校验原空间 → 锁两名历史成员的用户行（按 ID 升序）→ 重读校验 →
     * 检测冲突空间 → 按空间 ID 升序恢复原空间并安全关闭可收口的冲突空间 →
     * 恢复两名原成员 → 清理邀请/解绑/恢复确认 → 写成功审计。任一步失败整体回滚。</p>
     */
    private Response<AdminSpaceRestoreRspVO> doRestoreSpace(Long spaceId, Long adminUserId, String reason) {
        requireRestorableSpace(spaceId);
        List<CoupleMemberDO> historicalMembers = requireHistoricalMembers(spaceId);
        lockUserRows(historicalMembers);

        // 等锁期间其他实例可能已完成恢复或改写数据，拿到用户锁后必须重新校验。
        requireRestorableSpace(spaceId);
        historicalMembers = requireHistoricalMembers(spaceId);

        RestoreConflictAnalysis conflictAnalysis = analyzeRestoreConflicts(spaceId, historicalMembers);
        if (conflictAnalysis.hasBlocking()) {
            throw buildRestoreConflictException(conflictAnalysis.getBlocking());
        }

        LocalDateTime now = LocalDateTime.now();
        int revokedInvitations = 0;
        List<AdminSpaceRestoreRspVO.ClosedConflictSpaceVO> closedConflictSpaces = new ArrayList<>();

        // 所有目标空间按 ID 升序处理，保证多实例下的加锁顺序一致。
        List<Long> targetSpaceIds = new ArrayList<>();
        targetSpaceIds.add(spaceId);
        for (RestoreConflictSpace conflict : conflictAnalysis.getAutoClosable()) {
            targetSpaceIds.add(conflict.getSpace().getId());
        }
        Collections.sort(targetSpaceIds);

        for (Long targetSpaceId : targetSpaceIds) {
            if (Objects.equals(targetSpaceId, spaceId)) {
                // 原空间恢复正常且固定私密；publicAt、spaceCode、创建者与全部内容保持不变。
                int restoredSpace = coupleSpaceMapper.restoreUnbound(spaceId, now);
                if (restoredSpace != 1) {
                    throw new BizException(ResponseCodeEnum.SPACE_RESTORE_NOT_ALLOWED);
                }
                continue;
            }
            RestoreConflictSpace conflict = conflictAnalysis.findAutoClosable(targetSpaceId);
            if (conflict == null || conflict.getHistoricalMembership() == null) {
                throw new BizException(ResponseCodeEnum.SPACE_RESTORE_CONFLICT);
            }
            // 条件更新同时校验 status=0 且仅剩 1 名有效成员，防止并发加入第三方后误关闭。
            int closed = coupleSpaceMapper.closeWaitingSingleMemberSpace(targetSpaceId, now);
            if (closed != 1) {
                throw new BizException(ResponseCodeEnum.SPACE_RESTORE_CONFLICT);
            }
            int left = coupleMemberMapper.leaveActiveMembership(targetSpaceId,
                    conflict.getHistoricalMembership().getUserId(), MEMBER_STATUS_LEFT, now, now);
            if (left != 1) {
                throw new BizException(ResponseCodeEnum.SPACE_RESTORE_CONFLICT);
            }
            int revoked = coupleInvitationMapper.revokePendingBySpaceId(targetSpaceId, now);
            revokedInvitations += revoked;
            unbindRequestMapper.cancelPendingBySpaceId(targetSpaceId, adminUserId, now);
            restoreConfirmMapper.deleteBySpaceId(targetSpaceId);
            closedConflictSpaces.add(AdminSpaceRestoreRspVO.ClosedConflictSpaceVO.builder()
                    .spaceId(targetSpaceId)
                    .spaceCode(conflict.getSpace().getSpaceCode())
                    .spaceName(conflict.getSpace().getSpaceName())
                    .previousStatus(conflict.getSpace().getStatus())
                    .previousStatusText(spaceStatusText(conflict.getSpace().getStatus()))
                    .revokedInvitationCount(revoked)
                    .build());
        }

        // 两名原成员恢复有效，清空 leftAt 并刷新 updateTime。
        int restoredMembers = coupleMemberMapper.restoreAllLeft(spaceId, now);
        if (restoredMembers != 2) {
            throw new BizException(ResponseCodeEnum.SPACE_RESTORE_MEMBER_INVALID);
        }

        // 清理原空间的旧解绑申请、恢复确认与待处理邀请，不触碰任何内容表。
        revokedInvitations += coupleInvitationMapper.revokePendingBySpaceId(spaceId, now);
        unbindRequestMapper.cancelPendingBySpaceId(spaceId, adminUserId, now);
        restoreConfirmMapper.deleteBySpaceId(spaceId);

        String memberAmourIds = historicalMembers.stream()
                .map(member -> userMapper.findById(member.getUserId()))
                .filter(Objects::nonNull)
                .map(UserDO::getAmourId)
                .filter(StrUtil::isNotBlank)
                .collect(Collectors.joining(","));
        String conflictDetail = closedConflictSpaces.stream()
                .map(conflict -> "space=" + conflict.getSpaceId()
                        + ",status=" + conflict.getPreviousStatus()
                        + ",invitesRevoked=" + conflict.getRevokedInvitationCount())
                .collect(Collectors.joining(";"));
        String auditDetail = "status 5 -> 1, visibility=0, members restored=2, users=" + memberAmourIds
                + ", revokedInvitations=" + revokedInvitations
                + ", closedConflicts=" + (conflictDetail.isEmpty() ? "none" : conflictDetail);

        adminAuditService.record(AdminAuditLogDO.builder()
                .adminUserId(adminUserId)
                .action(AdminAuditConstants.ACTION_SPACE_RESTORE)
                .targetType(AdminAuditConstants.TARGET_SPACE)
                .targetSpaceId(spaceId)
                .reason(reason)
                .result(AdminAuditConstants.RESULT_SUCCESS)
                .detail(StrUtil.maxLength(auditDetail, 900))
                .createTime(now)
                .build());
        log.info("管理员 {} 人工恢复情侣空间 {}，关闭冲突空间 {} 个",
                adminUserId, spaceId, closedConflictSpaces.size());
        return Response.success(AdminSpaceRestoreRspVO.builder()
                .spaceId(spaceId)
                .status(SPACE_STATUS_NORMAL)
                .statusText(spaceStatusText(SPACE_STATUS_NORMAL))
                .visibility(SPACE_VISIBILITY_PRIVATE)
                .restoredMemberCount(restoredMembers)
                .revokedInvitationCount(revokedInvitations)
                .closedConflictSpaces(closedConflictSpaces)
                .build());
    }

    private CoupleSpaceDO requireRestorableSpace(Long spaceId) {
        CoupleSpaceDO space = coupleSpaceMapper.findById(spaceId);
        if (space == null) {
            throw new BizException(ResponseCodeEnum.SPACE_NOT_EXIST);
        }
        if (space.getStatus() == null || space.getStatus() != SPACE_STATUS_DELETED) {
            throw new BizException(ResponseCodeEnum.SPACE_RESTORE_NOT_ALLOWED);
        }
        return space;
    }

    private List<CoupleMemberDO> requireHistoricalMembers(Long spaceId) {
        List<CoupleMemberDO> members = coupleMemberMapper.selectBySpaceId(spaceId);
        if (members.size() != 2) {
            throw new BizException(ResponseCodeEnum.SPACE_RESTORE_MEMBER_INVALID);
        }
        Set<Long> userIds = new HashSet<>();
        for (CoupleMemberDO member : members) {
            if (member.getStatus() == null
                    || member.getStatus() != MEMBER_STATUS_LEFT
                    || member.getLeftAt() == null) {
                throw new BizException(ResponseCodeEnum.SPACE_RESTORE_MEMBER_INVALID);
            }
            if (member.getUserId() != null) {
                userIds.add(member.getUserId());
            }
        }
        if (userIds.size() != 2) {
            throw new BizException(ResponseCodeEnum.SPACE_RESTORE_MEMBER_INVALID);
        }
        return members;
    }

    /**
     * 按用户 ID 升序加数据库行锁，与创建空间、接受邀请保持同一把跨实例锁。
     */
    private void lockUserRows(List<CoupleMemberDO> members) {
        members.stream()
                .map(CoupleMemberDO::getUserId)
                .filter(Objects::nonNull)
                .distinct()
                .sorted()
                .forEach(userMapper::lockById);
    }

    /**
     * 找出两名历史成员在其他未解绑空间中的有效成员关系，并区分可安全收口与必须拒绝的冲突。
     */
    private RestoreConflictAnalysis analyzeRestoreConflicts(Long originalSpaceId,
                                                            List<CoupleMemberDO> historicalMembers) {
        Set<Long> historicalUserIds = historicalMembers.stream()
                .map(CoupleMemberDO::getUserId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        List<CoupleMemberDO> activeMemberships =
                coupleMemberMapper.selectActiveByUserIds(historicalUserIds);
        Set<Long> conflictSpaceIds = activeMemberships.stream()
                .map(CoupleMemberDO::getSpaceId)
                .filter(Objects::nonNull)
                .filter(spaceId -> !Objects.equals(spaceId, originalSpaceId))
                .collect(Collectors.toCollection(java.util.LinkedHashSet::new));
        if (conflictSpaceIds.isEmpty()) {
            return new RestoreConflictAnalysis(Collections.emptyList(), Collections.emptyList());
        }

        Map<Long, CoupleSpaceDO> spaceMap = coupleSpaceMapper.selectBatchIds(conflictSpaceIds).stream()
                .collect(Collectors.toMap(CoupleSpaceDO::getId, Function.identity(), (left, right) -> left));
        Map<Long, List<CoupleMemberDO>> activeBySpace = coupleMemberMapper
                .selectActiveBySpaceIds(conflictSpaceIds).stream()
                .collect(Collectors.groupingBy(CoupleMemberDO::getSpaceId));

        List<RestoreConflictSpace> autoClosable = new ArrayList<>();
        List<RestoreConflictSpace> blocking = new ArrayList<>();
        List<Long> sortedSpaceIds = new ArrayList<>(conflictSpaceIds);
        Collections.sort(sortedSpaceIds);
        for (Long conflictSpaceId : sortedSpaceIds) {
            CoupleSpaceDO conflictSpace = spaceMap.get(conflictSpaceId);
            if (conflictSpace == null
                    || Objects.equals(conflictSpace.getStatus(), SPACE_STATUS_DELETED)) {
                // status=5 的历史残留不代表有效空间，查询层已统一排除。
                continue;
            }
            List<CoupleMemberDO> activeMembers = activeBySpace
                    .getOrDefault(conflictSpaceId, Collections.emptyList());
            CoupleMemberDO historicalMembership = activeMembers.stream()
                    .filter(member -> historicalUserIds.contains(member.getUserId()))
                    .findFirst().orElse(null);
            // 只自动收口「等待绑定 + 仅该历史成员一人有效」的空间，其余一律拒绝恢复。
            boolean safeToClose = Objects.equals(conflictSpace.getStatus(), SPACE_STATUS_WAITING)
                    && activeMembers.size() == 1
                    && historicalMembership != null
                    && historicalUserIds.contains(activeMembers.get(0).getUserId());
            RestoreConflictSpace conflict = new RestoreConflictSpace(
                    conflictSpace, activeMembers, historicalMembership);
            if (safeToClose) {
                autoClosable.add(conflict);
            } else {
                blocking.add(conflict);
            }
        }
        return new RestoreConflictAnalysis(autoClosable, blocking);
    }

    private BizException buildRestoreConflictException(List<RestoreConflictSpace> blocking) {
        String details = blocking.stream()
                .limit(5)
                .map(conflict -> {
                    CoupleSpaceDO space = conflict.getSpace();
                    return "ID " + space.getId()
                            + "（" + StrUtil.blankToDefault(space.getSpaceName(), "未命名空间")
                            + " / " + StrUtil.blankToDefault(space.getSpaceCode(), "-")
                            + "，" + spaceStatusText(space.getStatus())
                            + "，有效成员 " + conflict.getActiveMembers().size() + " 人）";
                })
                .collect(Collectors.joining("；"));
        String more = blocking.size() > 5 ? "；另有 " + (blocking.size() - 5) + " 个冲突空间" : "";
        return new BizException(ResponseCodeEnum.SPACE_RESTORE_CONFLICT.getErrorCode(),
                "存在无法自动处理的冲突空间：" + details + more + "。请先处理这些空间后再恢复。");
    }

    private void recordRestoreFailure(Long spaceId, Long adminUserId, String reason, RuntimeException exception) {
        try {
            String detail = "SYSTEM_ERROR";
            if (exception instanceof BizException) {
                BizException bizException = (BizException) exception;
                detail = bizException.getErrorCode() + ": "
                        + StrUtil.blankToDefault(bizException.getErrorMessage(), "");
            }
            adminAuditService.recordFailure(AdminAuditLogDO.builder()
                    .adminUserId(adminUserId)
                    .action(AdminAuditConstants.ACTION_SPACE_RESTORE)
                    .targetType(AdminAuditConstants.TARGET_SPACE)
                    .targetSpaceId(spaceId)
                    .reason(reason)
                    .result(AdminAuditConstants.RESULT_FAILURE)
                    .detail(StrUtil.maxLength(detail, 900))
                    .createTime(LocalDateTime.now())
                    .build());
        } catch (Exception auditException) {
            log.error("人工恢复失败审计记录失败，spaceId: {}", spaceId, auditException);
        }
    }

    /**
     * 批量检测分页/详情中的待恢复空间是否会与成员的其他有效空间冲突。
     * 一次批量查询完成，避免逐条空间查询造成 N+1。
     */
    private Map<Long, List<AdminSpaceRestoreConflictVO>> loadRestoreConflictMap(
            List<CoupleSpaceDO> spaces, Map<Long, List<CoupleMemberDO>> memberMap) {
        List<CoupleSpaceDO> candidates = spaces.stream()
                .filter(space -> Objects.equals(space.getStatus(), SPACE_STATUS_DELETED))
                .filter(space -> restoreBlockReason(space,
                        memberMap.getOrDefault(space.getId(), Collections.emptyList())).isEmpty())
                .collect(Collectors.toList());
        if (CollUtil.isEmpty(candidates)) {
            return Collections.emptyMap();
        }

        Map<Long, Set<Long>> candidateUsers = new HashMap<>();
        Set<Long> allUserIds = new HashSet<>();
        for (CoupleSpaceDO candidate : candidates) {
            Set<Long> userIds = memberMap.getOrDefault(candidate.getId(), Collections.emptyList()).stream()
                    .map(CoupleMemberDO::getUserId)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());
            candidateUsers.put(candidate.getId(), userIds);
            allUserIds.addAll(userIds);
        }
        if (allUserIds.isEmpty()) {
            return Collections.emptyMap();
        }

        List<CoupleMemberDO> activeMemberships = coupleMemberMapper.selectActiveByUserIds(allUserIds);
        Map<Long, Set<Long>> candidateConflictSpaceIds = new HashMap<>();
        Set<Long> allConflictSpaceIds = new HashSet<>();
        for (CoupleMemberDO membership : activeMemberships) {
            for (Map.Entry<Long, Set<Long>> entry : candidateUsers.entrySet()) {
                if (Objects.equals(entry.getKey(), membership.getSpaceId())
                        || !entry.getValue().contains(membership.getUserId())) {
                    continue;
                }
                candidateConflictSpaceIds
                        .computeIfAbsent(entry.getKey(), key -> new java.util.LinkedHashSet<>())
                        .add(membership.getSpaceId());
                allConflictSpaceIds.add(membership.getSpaceId());
            }
        }
        if (allConflictSpaceIds.isEmpty()) {
            return Collections.emptyMap();
        }

        Map<Long, CoupleSpaceDO> spaceMap = coupleSpaceMapper.selectBatchIds(allConflictSpaceIds).stream()
                .collect(Collectors.toMap(CoupleSpaceDO::getId, Function.identity(), (left, right) -> left));
        Map<Long, List<CoupleMemberDO>> activeBySpace = coupleMemberMapper
                .selectActiveBySpaceIds(allConflictSpaceIds).stream()
                .collect(Collectors.groupingBy(CoupleMemberDO::getSpaceId));

        Map<Long, List<AdminSpaceRestoreConflictVO>> result = new HashMap<>();
        for (CoupleSpaceDO candidate : candidates) {
            Set<Long> conflictSpaceIds = candidateConflictSpaceIds.get(candidate.getId());
            if (CollUtil.isEmpty(conflictSpaceIds)) {
                continue;
            }
            Set<Long> userIds = candidateUsers.get(candidate.getId());
            List<Long> sortedSpaceIds = new ArrayList<>(conflictSpaceIds);
            Collections.sort(sortedSpaceIds);
            List<AdminSpaceRestoreConflictVO> conflicts = new ArrayList<>();
            for (Long conflictSpaceId : sortedSpaceIds) {
                CoupleSpaceDO conflictSpace = spaceMap.get(conflictSpaceId);
                if (conflictSpace == null
                        || Objects.equals(conflictSpace.getStatus(), SPACE_STATUS_DELETED)) {
                    continue;
                }
                List<CoupleMemberDO> activeMembers = activeBySpace
                        .getOrDefault(conflictSpaceId, Collections.emptyList());
                boolean autoClosable = Objects.equals(conflictSpace.getStatus(), SPACE_STATUS_WAITING)
                        && activeMembers.size() == 1
                        && userIds.contains(activeMembers.get(0).getUserId());
                conflicts.add(AdminSpaceRestoreConflictVO.builder()
                        .spaceId(conflictSpace.getId())
                        .spaceCode(conflictSpace.getSpaceCode())
                        .spaceName(conflictSpace.getSpaceName())
                        .status(conflictSpace.getStatus())
                        .statusText(spaceStatusText(conflictSpace.getStatus()))
                        .activeMemberCount(activeMembers.size())
                        .autoClosable(autoClosable)
                        .blockReason(autoClosable ? ""
                                : conflictBlockReason(conflictSpace, activeMembers, userIds))
                        .build());
            }
            if (!conflicts.isEmpty()) {
                result.put(candidate.getId(), conflicts);
            }
        }
        return result;
    }

    private String conflictBlockReason(CoupleSpaceDO space, List<CoupleMemberDO> activeMembers,
                                       Set<Long> historicalUserIds) {
        if (!Objects.equals(space.getStatus(), SPACE_STATUS_WAITING)) {
            return "空间状态为" + spaceStatusText(space.getStatus()) + "，不能自动关闭";
        }
        if (activeMembers.size() != 1) {
            return "已有 " + activeMembers.size() + " 名有效成员，不能自动关闭";
        }
        if (!historicalUserIds.contains(activeMembers.get(0).getUserId())) {
            return "有效成员与历史成员不一致，不能自动关闭";
        }
        return "";
    }

    private String combineRestoreBlockReason(String basicBlockReason,
                                             List<AdminSpaceRestoreConflictVO> conflicts) {
        if (StrUtil.isNotBlank(basicBlockReason)) {
            return basicBlockReason;
        }
        List<AdminSpaceRestoreConflictVO> blocking = conflicts.stream()
                .filter(conflict -> !Boolean.TRUE.equals(conflict.getAutoClosable()))
                .collect(Collectors.toList());
        if (blocking.isEmpty()) {
            return "";
        }
        String details = blocking.stream()
                .limit(5)
                .map(conflict -> "ID " + conflict.getSpaceId()
                        + "（" + conflict.getStatusText() + "）")
                .collect(Collectors.joining("、"));
        String more = blocking.size() > 5 ? " 等 " + blocking.size() + " 个空间" : "";
        return "存在无法自动处理的冲突空间：" + details + more + "，请先处理后再恢复";
    }

    private void validateFilters(AdminSpacePageReqVO reqVO) {
        if (reqVO.getStatus() != null
                && (reqVO.getStatus() < 0 || reqVO.getStatus() > SPACE_STATUS_DELETED)) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        if (reqVO.getVisibility() != null
                && reqVO.getVisibility() != SPACE_VISIBILITY_PRIVATE
                && reqVO.getVisibility() != SPACE_VISIBILITY_PUBLIC) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
    }

    private Map<Long, List<CoupleMemberDO>> loadMemberMap(List<CoupleSpaceDO> spaces) {
        if (spaces.isEmpty()) {
            return Collections.emptyMap();
        }
        Set<Long> spaceIds = spaces.stream()
                .map(CoupleSpaceDO::getId)
                .collect(Collectors.toSet());
        return coupleMemberMapper.selectBySpaceIds(spaceIds).stream()
                .collect(Collectors.groupingBy(CoupleMemberDO::getSpaceId, Collectors.toList()));
    }

    private Map<Long, UserDO> loadUserMap(Map<Long, List<CoupleMemberDO>> memberMap) {
        Set<Long> userIds = new HashSet<>();
        for (List<CoupleMemberDO> members : memberMap.values()) {
            for (CoupleMemberDO member : members) {
                addUserId(userIds, member.getUserId());
            }
        }
        return loadUsers(userIds);
    }

    private Map<Long, UserDO> loadUsers(Set<Long> userIds) {
        if (CollUtil.isEmpty(userIds)) {
            return Collections.emptyMap();
        }
        return userMapper.findUsersByIds(userIds).stream()
                .collect(Collectors.toMap(UserDO::getId, Function.identity(), (left, right) -> left));
    }

    private AdminSpacePageRspVO toResponse(CoupleSpaceDO space,
                                           List<CoupleMemberDO> members,
                                           Map<Long, UserDO> userMap,
                                           List<AdminSpaceRestoreConflictVO> restoreConflicts) {
        List<CoupleMemberDO> safeMembers = members == null ? Collections.emptyList() : members;
        List<AdminSpaceMemberVO> memberVOs = safeMembers.stream()
                .map(member -> buildMemberVO(member, userMap.get(member.getUserId())))
                .collect(Collectors.toList());

        int activeMemberCount = (int) safeMembers.stream()
                .filter(member -> Objects.equals(member.getStatus(), MEMBER_STATUS_ACTIVE))
                .count();

        long storyCount = count(storyNodeMapper.countActiveBySpaceId(space.getId()));
        long photoCount = count(photoMapper.countActiveBySpaceId(space.getId()));
        long messageCount = count(messageMapper.countActiveBySpaceId(space.getId()));
        long anniversaryCount = count(anniversaryMapper.countActiveBySpaceId(space.getId()));

        List<AdminSpaceRestoreConflictVO> conflicts = restoreConflicts == null
                ? Collections.emptyList() : restoreConflicts;
        String restoreBlockReason = combineRestoreBlockReason(
                restoreBlockReason(space, safeMembers), conflicts);
        int autoClosableCount = (int) conflicts.stream()
                .filter(conflict -> Boolean.TRUE.equals(conflict.getAutoClosable()))
                .count();

        return AdminSpacePageRspVO.builder()
                .spaceId(space.getId())
                .spaceCode(space.getSpaceCode())
                .spaceName(space.getSpaceName())
                .status(space.getStatus())
                .statusText(spaceStatusText(space.getStatus()))
                .visibility(space.getVisibility())
                .visibilityText(visibilityText(space.getVisibility()))
                .deletedAt(format(space.getDeletedAt()))
                .publicAt(format(space.getPublicAt()))
                .archivedAt(format(space.getArchivedAt()))
                .createTime(format(space.getCreateTime()))
                .updateTime(format(space.getUpdateTime()))
                .members(memberVOs)
                .memberCount(safeMembers.size())
                .activeMemberCount(activeMemberCount)
                .storyCount(storyCount)
                .photoCount(photoCount)
                .messageCount(messageCount)
                .anniversaryCount(anniversaryCount)
                .contentCount(storyCount + photoCount + messageCount + anniversaryCount)
                .restorable(restoreBlockReason.isEmpty())
                .restoreBlockReason(restoreBlockReason)
                .conflictSpaceCount(conflicts.size())
                .autoClosableConflictSpaceCount(autoClosableCount)
                .build();
    }

    private AdminSpaceMemberVO buildMemberVO(CoupleMemberDO member, UserDO user) {
        return AdminSpaceMemberVO.builder()
                .memberRole(member.getMemberRole())
                .roleText(memberRoleText(member.getMemberRole()))
                .amourId(user == null ? "" : StrUtil.blankToDefault(user.getAmourId(), ""))
                .displayName(user == null ? "恋人" : StrUtil.blankToDefault(user.getDisplayName(), "恋人"))
                .avatar(user == null ? "" : StrUtil.blankToDefault(user.getAvatar(), ""))
                .status(member.getStatus())
                .statusText(memberStatusText(member.getStatus()))
                .joinedAt(format(member.getJoinedAt()))
                .leftAt(format(member.getLeftAt()))
                .build();
    }

    private List<AdminSpaceInvitationVO> buildInvitationVOs(List<CoupleInvitationDO> invitations,
                                                            Map<Long, UserDO> userMap) {
        if (CollUtil.isEmpty(invitations)) {
            return Collections.emptyList();
        }
        return invitations.stream()
                .map(invitation -> {
                    UserDO inviter = userMap.get(invitation.getInviterUserId());
                    UserDO invitee = invitation.getInviteeUserId() == null
                            ? null : userMap.get(invitation.getInviteeUserId());
                    return AdminSpaceInvitationVO.builder()
                            .invitationId(invitation.getId())
                            .inviterAmourId(inviter == null ? "" : StrUtil.blankToDefault(inviter.getAmourId(), ""))
                            .inviterName(inviter == null ? "恋人" : StrUtil.blankToDefault(inviter.getDisplayName(), "恋人"))
                            .inviteeAmourId(invitee == null ? null : StrUtil.blankToDefault(invitee.getAmourId(), ""))
                            .inviteeName(invitee == null ? null : StrUtil.blankToDefault(invitee.getDisplayName(), "恋人"))
                            .status(invitation.getStatus())
                            .statusText(invitationStatusText(invitation.getStatus()))
                            .expiresAt(format(invitation.getExpiresAt()))
                            .acceptedAt(format(invitation.getAcceptedAt()))
                            .createTime(format(invitation.getCreateTime()))
                            .tokenMasked(maskToken(invitation.getTokenHash()))
                            .build();
                })
                .collect(Collectors.toList());
    }

    private List<AdminSpaceLifecycleEventVO> buildTimeline(CoupleSpaceDO space,
                                                          List<CoupleMemberDO> members,
                                                          List<CoupleSpaceUnbindRequestDO> unbindRequests,
                                                          Map<Long, UserDO> userMap) {
        List<AdminSpaceLifecycleEventVO> events = new ArrayList<>();
        addEvent(events, "SPACE_CREATED", "空间创建", "", format(space.getCreateTime()));
        for (CoupleMemberDO member : members) {
            UserDO user = userMap.get(member.getUserId());
            String name = userName(user);
            addEvent(events, "MEMBER_JOINED", "成员加入",
                    memberRoleText(member.getMemberRole()) + " · " + name, format(member.getJoinedAt()));
            if (member.getLeftAt() != null) {
                addEvent(events, "MEMBER_LEFT", "成员退出", name, format(member.getLeftAt()));
            }
        }
        addEvent(events, "SPACE_PUBLIC", "首次公开到恋爱广场", "", format(space.getPublicAt()));
        addEvent(events, "SPACE_ARCHIVED", "空间归档", "", format(space.getArchivedAt()));
        for (CoupleSpaceUnbindRequestDO request : unbindRequests) {
            UserDO requester = userMap.get(request.getRequesterUserId());
            addEvent(events, "UNBIND_REQUESTED", "发起解绑申请", userName(requester),
                    format(request.getCreateTime()));
            if (request.getResolvedAt() != null) {
                addEvent(events, "UNBIND_RESOLVED", "解绑申请" + unbindStatusText(request.getStatus()),
                        userName(requester), format(request.getResolvedAt()));
            }
        }
        addEvent(events, "SPACE_UNBOUND", "双方完成解绑", "", format(space.getDeletedAt()));

        return events.stream()
                .filter(event -> StrUtil.isNotBlank(event.getTime()))
                .sorted((left, right) -> right.getTime().compareTo(left.getTime()))
                .collect(Collectors.toList());
    }

    private void addEvent(List<AdminSpaceLifecycleEventVO> events, String type,
                          String title, String description, String time) {
        if (StrUtil.isBlank(time)) {
            return;
        }
        events.add(AdminSpaceLifecycleEventVO.builder()
                .eventType(type)
                .title(title)
                .description(description)
                .time(time)
                .build());
    }

    private List<AdminSpaceContentItemVO> buildStoryItems(List<StoryNodeDO> stories,
                                                          Map<Long, String> chapterNameMap,
                                                          Map<Long, UserDO> userMap,
                                                          Map<String, Long> pendingReportMap) {
        return stories.stream()
                .map(story -> contentItem(ContentGovernanceConstants.TYPE_STORY, story.getId(),
                        story.getTitle(), chapterNameMap.get(story.getChapterId()), story.getVisibility(),
                        story.getIsDeleted(), story.getCreatedBy(), userMap,
                        format(story.getHappenedTime()), format(story.getCreateTime()),
                        format(story.getUpdateTime()), pendingReportMap))
                .collect(Collectors.toList());
    }

    private List<AdminSpaceContentItemVO> buildPhotoItems(List<PhotoDO> photos,
                                                          Map<Long, String> categoryNameMap,
                                                          Map<Long, UserDO> userMap,
                                                          Map<String, Long> pendingReportMap) {
        return photos.stream()
                .map(photo -> contentItem(ContentGovernanceConstants.TYPE_PHOTO, photo.getId(),
                        photo.getTitle(), categoryNameMap.get(photo.getPhotoCategoryId()),
                        photo.getVisibility(), photo.getIsDeleted(), photo.getCreatedBy(), userMap,
                        format(photo.getTakenTime()), format(photo.getCreateTime()),
                        format(photo.getUpdateTime()), pendingReportMap))
                .collect(Collectors.toList());
    }

    private List<AdminSpaceContentItemVO> buildMessageItems(List<MessageDO> messages,
                                                            Map<Long, UserDO> userMap,
                                                            Map<String, Long> pendingReportMap) {
        return messages.stream()
                .map(message -> contentItem(ContentGovernanceConstants.TYPE_MESSAGE, message.getId(),
                        StrUtil.maxLength(StrUtil.blankToDefault(message.getContent(), ""), 60),
                        "", ContentGovernanceConstants.VISIBILITY_MEMBER_ONLY, message.getIsDeleted(),
                        message.getUserId(), userMap, format(message.getCreateTime()),
                        format(message.getCreateTime()), format(message.getUpdateTime()), pendingReportMap))
                .collect(Collectors.toList());
    }

    private List<AdminSpaceContentItemVO> buildAnniversaryItems(List<AnniversaryDO> anniversaries,
                                                                Map<Long, UserDO> userMap,
                                                                Map<String, Long> pendingReportMap) {
        return anniversaries.stream()
                .map(anniversary -> contentItem(ContentGovernanceConstants.TYPE_ANNIVERSARY,
                        anniversary.getId(), anniversary.getTitle(), anniversary.getCategory(),
                        anniversary.getVisibility(), anniversary.getIsDeleted(),
                        anniversary.getCreatedBy(), userMap,
                        anniversary.getAnniversaryDate() == null ? "" : anniversary.getAnniversaryDate().toString(),
                        format(anniversary.getCreateTime()), format(anniversary.getUpdateTime()),
                        pendingReportMap))
                .collect(Collectors.toList());
    }

    private AdminSpaceContentItemVO contentItem(String contentType, Long contentId, String title,
                                                 String extra, Integer visibility, Boolean deleted,
                                                 Long authorId, Map<Long, UserDO> userMap,
                                                 String happenedTime, String createTime, String updateTime,
                                                 Map<String, Long> pendingReportMap) {
        UserDO author = authorId == null ? null : userMap.get(authorId);
        return AdminSpaceContentItemVO.builder()
                .contentType(contentType)
                .contentTypeText(ContentGovernanceConstants.contentTypeText(contentType))
                .contentId(contentId)
                .title(title)
                .chapterOrCategory(StrUtil.nullToEmpty(extra))
                .visibility(visibility)
                .visibilityText(ContentGovernanceConstants.visibilityText(visibility))
                .deleted(Boolean.TRUE.equals(deleted))
                .authorAmourId(author == null ? "" : StrUtil.blankToDefault(author.getAmourId(), ""))
                .authorName(userName(author))
                .happenedTime(happenedTime)
                .createTime(createTime)
                .updateTime(updateTime)
                .pendingReportCount(pendingReportMap.getOrDefault(contentType + ":" + contentId, 0L))
                .build();
    }

    private Map<String, Long> buildPendingReportMap(Long spaceId) {
        List<ContentReportDO> pending = contentReportMapper.selectPendingBySpaceId(spaceId);
        if (CollUtil.isEmpty(pending)) {
            return Collections.emptyMap();
        }
        Map<String, Long> counts = new HashMap<>();
        for (ContentReportDO report : pending) {
            String key = report.getContentType() + ":" + report.getContentId();
            counts.put(key, counts.getOrDefault(key, 0L) + 1L);
        }
        return counts;
    }

    private AdminSpaceUnbindSummaryVO buildUnbindSummary(Long spaceId,
                                                          List<CoupleSpaceUnbindRequestDO> requests,
                                                          Map<Long, UserDO> userMap) {
        if (CollUtil.isEmpty(requests)) {
            return AdminSpaceUnbindSummaryVO.builder()
                    .pending(false)
                    .build();
        }
        CoupleSpaceUnbindRequestDO pending = requests.stream()
                .filter(request -> Objects.equals(request.getStatus(), UNBIND_STATUS_PENDING))
                .findFirst().orElse(null);
        CoupleSpaceUnbindRequestDO latestResolved = requests.stream()
                .filter(request -> !Objects.equals(request.getStatus(), UNBIND_STATUS_PENDING))
                .findFirst().orElse(null);
        UserDO requester = pending == null ? null : userMap.get(pending.getRequesterUserId());

        return AdminSpaceUnbindSummaryVO.builder()
                .requestId(pending == null ? null : pending.getId())
                .status(pending == null ? null : pending.getStatus())
                .statusText(pending == null ? null : unbindStatusText(pending.getStatus()))
                .requesterAmourId(requester == null ? null : StrUtil.blankToDefault(requester.getAmourId(), ""))
                .requesterName(requester == null ? null : userName(requester))
                .requestedAt(pending == null ? null : format(pending.getCreateTime()))
                .resolvedAt(pending == null ? null : format(pending.getResolvedAt()))
                .latestRequestId(latestResolved == null ? null : latestResolved.getId())
                .latestStatus(latestResolved == null ? null : latestResolved.getStatus())
                .latestStatusText(latestResolved == null ? null : unbindStatusText(latestResolved.getStatus()))
                .latestResolvedAt(latestResolved == null ? null : format(latestResolved.getResolvedAt()))
                .pending(pending != null)
                .build();
    }

    private AdminSpaceRestoreSummaryVO buildRestoreSummary(CoupleSpaceDO space,
                                                            List<CoupleMemberDO> members,
                                                            List<CoupleSpaceRestoreConfirmDO> confirms,
                                                            Map<Long, UserDO> userMap,
                                                            String restoreBlockReason,
                                                            List<AdminSpaceRestoreConflictVO> conflicts) {
        Set<Long> activeUserIds = members.stream()
                .filter(member -> Objects.equals(member.getStatus(), MEMBER_STATUS_ACTIVE))
                .map(CoupleMemberDO::getUserId)
                .collect(Collectors.toSet());
        List<AdminSpaceRestoreSummaryVO.ConfirmVO> confirmVOs = confirms.stream()
                .filter(confirm -> activeUserIds.contains(confirm.getUserId()))
                .map(confirm -> {
                    UserDO user = userMap.get(confirm.getUserId());
                    return AdminSpaceRestoreSummaryVO.ConfirmVO.builder()
                            .amourId(user == null ? "" : StrUtil.blankToDefault(user.getAmourId(), ""))
                            .displayName(userName(user))
                            .confirmedAt(format(confirm.getUpdateTime()))
                            .build();
                })
                .collect(Collectors.toList());
        return AdminSpaceRestoreSummaryVO.builder()
                .restorable(restoreBlockReason.isEmpty())
                .restoreBlockReason(restoreBlockReason)
                .confirmedCount(confirmVOs.size())
                .requiredCount(activeUserIds.isEmpty() ? 2 : activeUserIds.size())
                .confirmations(confirmVOs)
                .conflictSpaces(conflicts == null ? Collections.emptyList() : conflicts)
                .build();
    }

    /**
     * 后台恢复条件：status=5，且恰好保留两条原始成员关系，两名成员都是已退出并写有 leftAt。
     * 冻结/归档空间必须继续走用户端双方确认，后台不得绕过。
     */
    private String restoreBlockReason(CoupleSpaceDO space, List<CoupleMemberDO> members) {
        if (space.getStatus() == null) {
            return "空间状态未知，无法人工恢复";
        }
        if (space.getStatus() == SPACE_STATUS_FROZEN || space.getStatus() == SPACE_STATUS_ARCHIVED) {
            return "冻结或归档空间需由双方成员在用户端确认恢复，后台不能绕过";
        }
        if (space.getStatus() != SPACE_STATUS_DELETED) {
            return "只有双方已解绑的空间才能人工恢复";
        }
        if (members.size() != 2) {
            return "历史成员关系数量不是 2，无法人工恢复";
        }
        for (CoupleMemberDO member : members) {
            if (member.getStatus() == null || member.getStatus() != MEMBER_STATUS_LEFT) {
                return "存在未退出的历史成员，无法人工恢复";
            }
            if (member.getLeftAt() == null) {
                return "缺少成员退出时间，无法人工恢复";
            }
        }
        return "";
    }

    private void addUserId(Set<Long> userIds, Long userId) {
        if (userId != null) {
            userIds.add(userId);
        }
    }

    private String userName(UserDO user) {
        return user == null ? "恋人" : StrUtil.blankToDefault(user.getDisplayName(), "恋人");
    }

    private String maskToken(String tokenHash) {
        if (StrUtil.isBlank(tokenHash)) {
            return "";
        }
        return tokenHash.substring(0, Math.min(8, tokenHash.length())) + "****";
    }

    private long count(Long value) {
        return value == null ? 0 : value;
    }

    private String format(LocalDateTime time) {
        return time == null ? "" : DATE_FORMATTER.format(time);
    }

    private String spaceStatusText(Integer status) {
        if (status == null) {
            return "";
        }
        switch (status) {
            case 0:
                return "等待绑定";
            case SPACE_STATUS_NORMAL:
                return "正常";
            case SPACE_STATUS_FROZEN:
                return "已冻结";
            case SPACE_STATUS_ARCHIVED:
                return "已归档";
            case 4:
                return "删除等待期";
            case SPACE_STATUS_DELETED:
                return "双方已解绑";
            default:
                return "未知状态";
        }
    }

    private String visibilityText(Integer visibility) {
        if (visibility == null) {
            return "";
        }
        return Objects.equals(visibility, SPACE_VISIBILITY_PUBLIC) ? "公开" : "私密";
    }

    private String memberRoleText(Integer memberRole) {
        if (Objects.equals(memberRole, MEMBER_ROLE_CREATOR)) {
            return "空间发起人";
        }
        if (Objects.equals(memberRole, MEMBER_ROLE_PARTNER)) {
            return "另一半";
        }
        return "成员";
    }

    private String memberStatusText(Integer status) {
        if (status == null) {
            return "";
        }
        switch (status) {
            case MEMBER_STATUS_INVITING:
                return "邀请中";
            case MEMBER_STATUS_ACTIVE:
                return "有效";
            case MEMBER_STATUS_PAUSED:
                return "暂停";
            case MEMBER_STATUS_LEFT:
                return "已退出";
            case MEMBER_STATUS_REMOVED:
                return "已移除";
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

    private String unbindStatusText(Integer status) {
        if (status == null) {
            return "";
        }
        switch (status) {
            case 0:
                return "待同意";
            case 1:
                return "已同意";
            case 2:
                return "已拒绝";
            case 3:
                return "已取消";
            default:
                return "未知状态";
        }
    }

    /**
     * 人工恢复前的冲突分析结果。
     */
    private static final class RestoreConflictAnalysis {

        private final List<RestoreConflictSpace> autoClosable;
        private final List<RestoreConflictSpace> blocking;

        private RestoreConflictAnalysis(List<RestoreConflictSpace> autoClosable,
                                        List<RestoreConflictSpace> blocking) {
            this.autoClosable = autoClosable;
            this.blocking = blocking;
        }

        private List<RestoreConflictSpace> getAutoClosable() {
            return autoClosable;
        }

        private List<RestoreConflictSpace> getBlocking() {
            return blocking;
        }

        private boolean hasBlocking() {
            return !blocking.isEmpty();
        }

        private RestoreConflictSpace findAutoClosable(Long spaceId) {
            return autoClosable.stream()
                    .filter(conflict -> Objects.equals(conflict.getSpace().getId(), spaceId))
                    .findFirst().orElse(null);
        }
    }

    /**
     * 单个冲突空间：空间本身、当前全部有效成员与该历史成员自己的成员关系。
     */
    private static final class RestoreConflictSpace {

        private final CoupleSpaceDO space;
        private final List<CoupleMemberDO> activeMembers;
        private final CoupleMemberDO historicalMembership;

        private RestoreConflictSpace(CoupleSpaceDO space, List<CoupleMemberDO> activeMembers,
                                     CoupleMemberDO historicalMembership) {
            this.space = space;
            this.activeMembers = activeMembers;
            this.historicalMembership = historicalMembership;
        }

        private CoupleSpaceDO getSpace() {
            return space;
        }

        private List<CoupleMemberDO> getActiveMembers() {
            return activeMembers;
        }

        private CoupleMemberDO getHistoricalMembership() {
            return historicalMembership;
        }
    }
}
