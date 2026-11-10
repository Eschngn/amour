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
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceRestoreReqVO;
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

        List<AdminSpacePageRspVO> records = spaces.stream()
                .map(space -> toResponse(space, memberMap.get(space.getId()), userMap))
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

        String restoreBlockReason = restoreBlockReason(space, members);

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
                .restore(buildRestoreSummary(space, members, restoreConfirms, userMap, restoreBlockReason))
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
    public Response<Void> restoreSpace(AdminSpaceRestoreReqVO reqVO) {
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
            return transactionTemplate.execute(status -> doRestoreSpace(spaceId, adminUserId, reason));
        } catch (RuntimeException exception) {
            recordRestoreFailure(spaceId, adminUserId, reason, exception);
            throw exception;
        } finally {
            lock.unlock();
        }
    }

    private Response<Void> doRestoreSpace(Long spaceId, Long adminUserId, String reason) {
        CoupleSpaceDO space = coupleSpaceMapper.findById(spaceId);
        if (space == null) {
            throw new BizException(ResponseCodeEnum.SPACE_NOT_EXIST);
        }
        if (space.getStatus() == null || space.getStatus() != SPACE_STATUS_DELETED) {
            throw new BizException(ResponseCodeEnum.SPACE_RESTORE_NOT_ALLOWED);
        }

        List<CoupleMemberDO> members = coupleMemberMapper.selectBySpaceId(spaceId);
        if (members.size() != 2) {
            throw new BizException(ResponseCodeEnum.SPACE_RESTORE_MEMBER_INVALID);
        }
        for (CoupleMemberDO member : members) {
            if (member.getStatus() == null
                    || member.getStatus() != MEMBER_STATUS_LEFT
                    || member.getLeftAt() == null) {
                throw new BizException(ResponseCodeEnum.SPACE_RESTORE_MEMBER_INVALID);
            }
        }

        LocalDateTime now = LocalDateTime.now();

        // 1. 两名历史成员恢复有效，清空 leftAt 并刷新 updateTime。
        int restoredMembers = coupleMemberMapper.restoreAllLeft(spaceId, now);
        if (restoredMembers != 2) {
            throw new BizException(ResponseCodeEnum.SPACE_RESTORE_MEMBER_INVALID);
        }

        // 2. 空间恢复正常且固定私密，清空归档/解绑时间；publicAt、spaceCode、创建者与内容保持不变。
        int restoredSpace = coupleSpaceMapper.restoreUnbound(spaceId, now);
        if (restoredSpace == 0) {
            throw new BizException(ResponseCodeEnum.SPACE_RESTORE_NOT_ALLOWED);
        }

        // 3. 清理旧解绑申请、恢复确认与待处理邀请，不触碰任何内容表。
        unbindRequestMapper.cancelPendingBySpaceId(spaceId, adminUserId, now);
        restoreConfirmMapper.deleteBySpaceId(spaceId);
        coupleInvitationMapper.revokePendingBySpaceId(spaceId, now);

        adminAuditService.record(AdminAuditLogDO.builder()
                .adminUserId(adminUserId)
                .action(AdminAuditConstants.ACTION_SPACE_RESTORE)
                .targetType(AdminAuditConstants.TARGET_SPACE)
                .targetSpaceId(spaceId)
                .reason(reason)
                .result(AdminAuditConstants.RESULT_SUCCESS)
                .detail("status 5 -> 1, visibility=0, members restored=2")
                .createTime(now)
                .build());
        log.info("管理员 {} 人工恢复情侣空间 {}", adminUserId, spaceId);
        return Response.success();
    }

    private void recordRestoreFailure(Long spaceId, Long adminUserId, String reason, RuntimeException exception) {
        try {
            adminAuditService.recordFailure(AdminAuditLogDO.builder()
                    .adminUserId(adminUserId)
                    .action(AdminAuditConstants.ACTION_SPACE_RESTORE)
                    .targetType(AdminAuditConstants.TARGET_SPACE)
                    .targetSpaceId(spaceId)
                    .reason(reason)
                    .result(AdminAuditConstants.RESULT_FAILURE)
                    .detail(exception instanceof BizException
                            ? ((BizException) exception).getErrorCode() : "SYSTEM_ERROR")
                    .createTime(LocalDateTime.now())
                    .build());
        } catch (Exception auditException) {
            log.error("人工恢复失败审计记录失败，spaceId: {}", spaceId, auditException);
        }
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
                                           Map<Long, UserDO> userMap) {
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

        String restoreBlockReason = restoreBlockReason(space, safeMembers);

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
                                                            String restoreBlockReason) {
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
}
