package com.chengliuxiang.amour.admin.service.impl;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceArchiveConflictVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceArchiveDetailReqVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceArchiveDetailRspVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceArchivePageReqVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceArchivePageRspVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceArchiveRestoreReqVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceArchiveRestoreRspVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceLifecycleEventVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceMemberVO;
import com.chengliuxiang.amour.admin.security.AdminAuthorizationService;
import com.chengliuxiang.amour.admin.service.AdminAuditService;
import com.chengliuxiang.amour.admin.service.AdminSpaceArchiveService;
import com.chengliuxiang.amour.common.constant.AdminAuditConstants;
import com.chengliuxiang.amour.common.constant.AdminPermissionConstants;
import com.chengliuxiang.amour.common.domain.dos.AdminAuditLogDO;
import com.chengliuxiang.amour.common.domain.dos.CoupleMemberDO;
import com.chengliuxiang.amour.common.domain.dos.CoupleSpaceArchiveDO;
import com.chengliuxiang.amour.common.domain.dos.CoupleSpaceDO;
import com.chengliuxiang.amour.common.domain.dos.UserDO;
import com.chengliuxiang.amour.common.domain.mapper.AnniversaryMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleMemberMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleSpaceArchiveMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleSpaceConfigMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleSpaceMapper;
import com.chengliuxiang.amour.common.domain.mapper.MessageMapper;
import com.chengliuxiang.amour.common.domain.mapper.MessageReplyMapper;
import com.chengliuxiang.amour.common.domain.mapper.PhotoCategoryMapper;
import com.chengliuxiang.amour.common.domain.mapper.PhotoMapper;
import com.chengliuxiang.amour.common.domain.mapper.StoryChapterMapper;
import com.chengliuxiang.amour.common.domain.mapper.StoryNodeImageMapper;
import com.chengliuxiang.amour.common.domain.mapper.StoryNodeMapper;
import com.chengliuxiang.amour.common.domain.mapper.UserMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.model.snapshot.SpaceArchiveSnapshot;
import com.chengliuxiang.amour.common.service.SpaceArchiveSnapshotService;
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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 后台销毁留档查询与恢复实现。
 *
 * <p>恢复原则：</p>
 * <ol>
 *     <li>独立鉴权：查询 SPACE_QUERY、恢复 SPACE_RESTORE，两次都在 Service 层校验；</li>
 *     <li>幂等：同一留档重复恢复返回已恢复结果；并发恢复由条件更新与空间锁串行化；</li>
 *     <li>冲突不覆盖：成员已加入其它未销毁空间、空间标识被占用、内容主键冲突时拒绝整笔恢复；</li>
 *     <li>完整性：恢复后空间回到销毁前状态（通常 status=0 等待绑定），
 *         成员关系、故事/章节/图片、相册/照片、纪念日、留言/回复、审核与已发布版本全部可用；</li>
 *     <li>审计：成功与失败都写 admin_audit_log，只记录元数据与数量，不记录正文。</li>
 * </ol>
 */
@Service
@Slf4j
public class AdminSpaceArchiveServiceImpl implements AdminSpaceArchiveService {

    private static final int SPACE_STATUS_WAITING = 0;
    private static final int SPACE_STATUS_NORMAL = 1;
    private static final int SPACE_STATUS_FROZEN = 2;
    private static final int SPACE_STATUS_ARCHIVED = 3;
    private static final int SPACE_STATUS_DELETED = 5;
    private static final int SPACE_STATUS_DESTROYED = 6;

    private static final int MEMBER_STATUS_ACTIVE = 1;
    private static final int MEMBER_STATUS_LEFT = 3;
    private static final int MEMBER_ROLE_CREATOR = 1;

    private static final int SPACE_VISIBILITY_PRIVATE = 0;
    private static final int SPACE_VISIBILITY_PUBLIC = 1;

    private static final int DEFAULT_PAGE_SIZE = 10;
    private static final int MAX_PAGE_SIZE = 100;

    private static final DateTimeFormatter DATE_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Resource
    private CoupleSpaceArchiveMapper archiveMapper;
    @Resource
    private CoupleSpaceMapper coupleSpaceMapper;
    @Resource
    private CoupleMemberMapper coupleMemberMapper;
    @Resource
    private UserMapper userMapper;
    @Resource
    private StoryChapterMapper storyChapterMapper;
    @Resource
    private StoryNodeMapper storyNodeMapper;
    @Resource
    private StoryNodeImageMapper storyNodeImageMapper;
    @Resource
    private PhotoCategoryMapper photoCategoryMapper;
    @Resource
    private PhotoMapper photoMapper;
    @Resource
    private AnniversaryMapper anniversaryMapper;
    @Resource
    private MessageMapper messageMapper;
    @Resource
    private MessageReplyMapper messageReplyMapper;
    @Resource
    private CoupleSpaceConfigMapper coupleSpaceConfigMapper;
    @Resource
    private SpaceArchiveSnapshotService snapshotService;
    @Resource
    private AdminAuditService adminAuditService;
    @Resource
    private AdminAuthorizationService adminAuthorizationService;
    @Resource
    private PlatformTransactionManager transactionManager;

    /**
     * 空间级内存锁：同一空间的多次恢复串行执行。数据库条件更新是跨实例的最终防线。
     */
    private final ConcurrentHashMap<Long, ReentrantLock> spaceLocks = new ConcurrentHashMap<>();

    private TransactionTemplate transactionTemplate;

    @PostConstruct
    public void init() {
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    // ================================ 查询 ================================

    @Override
    public Response<PageResult<AdminSpaceArchivePageRspVO>> findArchivePage(AdminSpaceArchivePageReqVO reqVO) {
        adminAuthorizationService.requirePermission(AdminPermissionConstants.SPACE_QUERY);
        AdminSpaceArchivePageReqVO query = reqVO == null ? new AdminSpaceArchivePageReqVO() : reqVO;

        long current = query.getCurrent() == null || query.getCurrent() < 1 ? 1 : query.getCurrent();
        long size = query.getSize() == null || query.getSize() < 1
                ? DEFAULT_PAGE_SIZE : Math.min(query.getSize(), MAX_PAGE_SIZE);

        IPage<CoupleSpaceArchiveDO> page = archiveMapper.selectAdminPage(
                current, size, query.getSpaceId(),
                StrUtil.trimToNull(query.getKeyword()), query.getRestored());

        List<CoupleSpaceArchiveDO> archives = page.getRecords();
        if (archives.isEmpty()) {
            return Response.success(PageResult.<AdminSpaceArchivePageRspVO>builder()
                    .current(page.getCurrent())
                    .size(page.getSize())
                    .total(page.getTotal())
                    .records(Collections.emptyList())
                    .build());
        }

        Set<Long> spaceIds = archives.stream()
                .map(CoupleSpaceArchiveDO::getSpaceId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Set<Long> userIds = new HashSet<>();
        for (CoupleSpaceArchiveDO archive : archives) {
            addUserId(userIds, archive.getDestroyedBy());
            addUserId(userIds, archive.getCreatorUserId());
        }
        Map<Long, UserDO> userMap = loadUsers(userIds);
        Map<Long, CoupleSpaceDO> spaceMap = loadSpaces(spaceIds);
        Map<Long, List<CoupleMemberDO>> memberMap = loadMembers(spaceIds);

        List<AdminSpaceArchivePageRspVO> records = archives.stream()
                .map(archive -> toPageVO(archive, spaceMap.get(archive.getSpaceId()),
                        memberMap.getOrDefault(archive.getSpaceId(), Collections.emptyList()), userMap))
                .collect(Collectors.toList());

        return Response.success(PageResult.<AdminSpaceArchivePageRspVO>builder()
                .current(page.getCurrent())
                .size(page.getSize())
                .total(page.getTotal())
                .records(records)
                .build());
    }

    @Override
    public Response<AdminSpaceArchiveDetailRspVO> findArchiveDetail(AdminSpaceArchiveDetailReqVO reqVO) {
        adminAuthorizationService.requirePermission(AdminPermissionConstants.SPACE_QUERY);
        if (reqVO == null || reqVO.getArchiveId() == null) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        CoupleSpaceArchiveDO archive = archiveMapper.findById(reqVO.getArchiveId());
        if (archive == null) {
            throw new BizException(ResponseCodeEnum.SPACE_ARCHIVE_NOT_EXIST);
        }

        CoupleSpaceDO space = coupleSpaceMapper.findById(archive.getSpaceId());
        List<CoupleMemberDO> members = coupleMemberMapper.selectBySpaceId(archive.getSpaceId());
        SpaceArchiveSnapshot snapshot = snapshotService.parse(archive.getSnapshotJson());

        Set<Long> userIds = new HashSet<>();
        addUserId(userIds, archive.getDestroyedBy());
        addUserId(userIds, archive.getCreatorUserId());
        if (snapshot != null) {
            for (SpaceArchiveSnapshot.Member member : snapshot.membersOrEmpty()) {
                addUserId(userIds, member.getUserId());
            }
        }
        Map<Long, UserDO> userMap = loadUsers(userIds);

        List<AdminSpaceArchiveConflictVO> conflicts = analyzeConflicts(archive, space, members, userMap, true);
        String restoreBlockReason = resolveRestoreBlockReason(archive, space, conflicts);
        boolean restorable = restoreBlockReason.isEmpty();

        AdminSpaceArchiveDetailRspVO response = AdminSpaceArchiveDetailRspVO.builder()
                .archiveId(archive.getId())
                .spaceId(archive.getSpaceId())
                .spaceCode(StrUtil.blankToDefault(archive.getSpaceCode(), ""))
                .spaceName(StrUtil.blankToDefault(archive.getSpaceName(), ""))
                .description(space == null ? "" : StrUtil.blankToDefault(space.getDescription(), ""))
                .archiveRound(archive.getArchiveRound())
                .statusBefore(archive.getStatusBefore())
                .statusBeforeText(spaceStatusText(archive.getStatusBefore()))
                .visibilityBefore(archive.getVisibilityBefore())
                .visibilityBeforeText(visibilityText(archive.getVisibilityBefore()))
                .snapshotVersion(archive.getSnapshotVersion())
                .destroyedAt(format(archive.getDestroyedAt()))
                .restoredAt(format(archive.getRestoredAt()))
                .destroyedByAmourId(amourId(userMap.get(archive.getDestroyedBy())))
                .destroyedByDisplayName(displayName(userMap.get(archive.getDestroyedBy())))
                .creatorAmourId(amourId(userMap.get(archive.getCreatorUserId())))
                .creatorDisplayName(displayName(userMap.get(archive.getCreatorUserId())))
                .currentSpaceStatus(space == null ? null : space.getStatus())
                .currentSpaceStatusText(space == null ? "" : spaceStatusText(space.getStatus()))
                .spaceDestroyed(space != null && Objects.equals(space.getStatus(), SPACE_STATUS_DESTROYED))
                .restorable(restorable)
                .restoreBlockReason(restoreBlockReason)
                .memberCount((long) archive.getMemberCount())
                .storyCount((long) archive.getStoryCount())
                .photoCount((long) archive.getPhotoCount())
                .messageCount((long) archive.getMessageCount())
                .anniversaryCount((long) archive.getAnniversaryCount())
                .fileResourceCount(archive.getFileResourceCount())
                .conflicts(conflicts)
                .members(buildSnapshotMembers(archive, snapshot, userMap))
                .timeline(buildArchiveTimeline(archive, userMap))
                .build();

        if (snapshot != null) {
            response.setStoryChapterCount((long) snapshot.storyChaptersOrEmpty().size());
            response.setPhotoCategoryCount((long) snapshot.photoCategoriesOrEmpty().size());
            response.setStoryImageCount((long) snapshot.storyNodeImagesOrEmpty().size());
            response.setMessageReplyCount((long) snapshot.messageRepliesOrEmpty().size());
            response.setConfigCount((long) snapshot.configsOrEmpty().size());
            response.setReviewSubmissionCount((long) snapshot.reviewSubmissionsOrEmpty().size());
            response.setPublishedItemCount((long) snapshot.publishedItemsOrEmpty().size());
        } else {
            response.setStoryChapterCount(0L);
            response.setPhotoCategoryCount(0L);
            response.setStoryImageCount(0L);
            response.setMessageReplyCount(0L);
            response.setConfigCount(0L);
            response.setReviewSubmissionCount(0L);
            response.setPublishedItemCount(0L);
        }

        // 查看已销毁空间留档属于治理动作，按现有架构记录读取审计；审计失败不阻断排障。
        try {
            adminAuditService.record(AdminAuditLogDO.builder()
                    .adminUserId(StpUtil.getLoginIdAsLong())
                    .action(AdminAuditConstants.ACTION_SPACE_ARCHIVE_VIEW)
                    .targetType(AdminAuditConstants.TARGET_SPACE)
                    .targetSpaceId(archive.getSpaceId())
                    .reason("后台查看空间销毁留档")
                    .result(AdminAuditConstants.RESULT_SUCCESS)
                    .detail("archiveId=" + archive.getId() + ", round=" + archive.getArchiveRound()
                            + ", restored=" + (archive.getRestoredAt() != null))
                    .createTime(LocalDateTime.now())
                    .build());
        } catch (Exception exception) {
            log.warn("留档详情访问审计记录失败，archiveId: {}", archive.getId(), exception);
        }
        return Response.success(response);
    }

    // ================================ 恢复 ================================

    @Override
    public Response<AdminSpaceArchiveRestoreRspVO> restoreFromArchive(AdminSpaceArchiveRestoreReqVO reqVO) {
        // 独立鉴权：后台恢复不能复用普通用户接口，也不依赖前端按钮显隐。
        adminAuthorizationService.requirePermission(AdminPermissionConstants.SPACE_RESTORE);
        if (reqVO == null || reqVO.getArchiveId() == null) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        String reason = StrUtil.trim(reqVO.getReason());
        if (StrUtil.isBlank(reason)) {
            throw new BizException(ResponseCodeEnum.REASON_REQUIRED);
        }
        Long archiveId = reqVO.getArchiveId();
        Long adminUserId = StpUtil.getLoginIdAsLong();

        CoupleSpaceArchiveDO archive = archiveMapper.findById(archiveId);
        if (archive == null) {
            throw new BizException(ResponseCodeEnum.SPACE_ARCHIVE_NOT_EXIST);
        }
        Long spaceId = archive.getSpaceId();
        ReentrantLock lock = spaceLocks.computeIfAbsent(spaceId, key -> new ReentrantLock());
        lock.lock();
        try {
            // 事务必须在锁内提交，避免其他请求在提交前读到一半恢复的数据。
            return transactionTemplate.execute(status ->
                    doRestoreFromArchive(archiveId, adminUserId, reason));
        } catch (RuntimeException exception) {
            recordRestoreFailure(archiveId, spaceId, adminUserId, reason, exception);
            throw exception;
        } finally {
            lock.unlock();
        }
    }

    /**
     * 恢复主流程：校验留档 → 锁用户行 → 重读校验 → 冲突分析 → 恢复空间与成员 → 写审计。
     *
     * <p>任一步失败整体回滚。销毁流程没有物理删除业务数据，因此正常恢复只需要把空间状态与
     * 成员关系还原；快照仍用于校验完整性与填补缺失行（例如极端情况下被外部脚本清理过的记录）。</p>
     */
    private Response<AdminSpaceArchiveRestoreRspVO> doRestoreFromArchive(Long archiveId, Long adminUserId,
                                                                         String reason) {
        CoupleSpaceArchiveDO archive = archiveMapper.findById(archiveId);
        if (archive == null) {
            throw new BizException(ResponseCodeEnum.SPACE_ARCHIVE_NOT_EXIST);
        }
        if (archive.getRestoredAt() != null) {
            // 幂等：已恢复的留档重复提交返回当前结果，不重复改写。
            return Response.success(buildRestoreResponse(archive, true, 0, 0));
        }

        SpaceArchiveSnapshot snapshot = snapshotService.parse(archive.getSnapshotJson());
        String snapshotInvalid = snapshotService.validateForRestore(snapshot, archive.getSpaceId());
        if (snapshotInvalid != null) {
            log.warn("留档快照不可恢复，archiveId: {}, 原因: {}", archiveId, snapshotInvalid);
            throw new BizException(ResponseCodeEnum.SPACE_ARCHIVE_SNAPSHOT_INVALID.getErrorCode(),
                    ResponseCodeEnum.SPACE_ARCHIVE_SNAPSHOT_INVALID.getErrorMessage()
                            + "：" + snapshotInvalid);
        }

        CoupleSpaceDO space = coupleSpaceMapper.findById(archive.getSpaceId());
        if (space == null) {
            throw new BizException(ResponseCodeEnum.SPACE_ARCHIVE_DATA_MISSING);
        }

        List<CoupleMemberDO> members = coupleMemberMapper.selectBySpaceId(space.getId());
        List<Long> historicalUserIds = snapshot.membersOrEmpty().stream()
                .map(SpaceArchiveSnapshot.Member::getUserId)
                .filter(Objects::nonNull)
                .distinct()
                .sorted()
                .collect(Collectors.toList());
        // 按用户 ID 升序加数据库行锁，与用户端创建 / 接受邀请保持同一跨实例锁顺序。
        for (Long userId : historicalUserIds) {
            userMapper.lockById(userId);
        }

        // 等锁期间其他实例可能已完成恢复或改写数据，拿到用户锁后必须重新校验。
        archive = archiveMapper.findById(archiveId);
        if (archive == null) {
            throw new BizException(ResponseCodeEnum.SPACE_ARCHIVE_NOT_EXIST);
        }
        if (archive.getRestoredAt() != null) {
            return Response.success(buildRestoreResponse(archive, true, 0, 0));
        }
        space = coupleSpaceMapper.findById(archive.getSpaceId());
        if (space == null) {
            throw new BizException(ResponseCodeEnum.SPACE_ARCHIVE_DATA_MISSING);
        }
        members = coupleMemberMapper.selectBySpaceId(space.getId());

        Map<Long, UserDO> userMap = loadUsers(new HashSet<>(historicalUserIds));
        List<AdminSpaceArchiveConflictVO> conflicts = analyzeConflicts(archive, space, members, userMap, true);
        if (!conflicts.isEmpty()) {
            throw buildConflictException(conflicts);
        }

        LocalDateTime now = LocalDateTime.now();
        int targetStatus = resolveTargetStatus(archive);

        // 1. 空间状态恢复：6 → 销毁前状态（通常 0 等待绑定），强制私密。
        int restoredSpace = coupleSpaceMapper.restoreDestroyed(space.getId(), targetStatus, now);
        if (restoredSpace != 1) {
            CoupleSpaceDO latest = coupleSpaceMapper.findById(space.getId());
            if (latest != null && !Objects.equals(latest.getStatus(), SPACE_STATUS_DESTROYED)) {
                throw new BizException(ResponseCodeEnum.SPACE_ARCHIVE_RESTORE_CONFLICT.getErrorCode(),
                        "空间当前状态为「" + spaceStatusText(latest.getStatus())
                                + "」，已不再是已销毁状态，请刷新后重试");
            }
            throw new BizException(ResponseCodeEnum.SPACE_ARCHIVE_RESTORE_CONFLICT);
        }

        // 2. 成员关系恢复：把快照中的有效成员重新激活，角色与加入时间按快照还原。
        int restoredMembers = 0;
        for (SpaceArchiveSnapshot.Member member : snapshot.membersOrEmpty()) {
            if (!Objects.equals(member.getStatus(), MEMBER_STATUS_ACTIVE)) {
                continue;
            }
            LocalDateTime joinedAt = parseDateTime(member.getJoinedAt());
            int restored = coupleMemberMapper.restoreMemberFromArchive(space.getId(),
                    member.getUserId(), member.getMemberRole(), joinedAt, now);
            if (restored == 1) {
                restoredMembers++;
                continue;
            }
            // 条件更新失败：成员行可能已被并发改写为有效（已被其它流程恢复）。
            CoupleMemberDO current = coupleMemberMapper.selectBySpaceAndUser(space.getId(),
                    member.getUserId());
            if (current != null && Objects.equals(current.getStatus(), MEMBER_STATUS_ACTIVE)) {
                continue;
            }
            throw new BizException(ResponseCodeEnum.SPACE_ARCHIVE_RESTORE_CONFLICT.getErrorCode(),
                    "成员关系无法恢复，请刷新留档与成员数据后重试");
        }
        if (restoredMembers == 0) {
            throw new BizException(ResponseCodeEnum.SPACE_ARCHIVE_RESTORE_CONFLICT.getErrorCode(),
                    "留档中没有可恢复的有效成员，无法恢复空间");
        }
        // 兜底校验：恢复后必须恰好只有快照中的有效成员，不能凭空多出其他成员。
        long expectedActive = snapshot.membersOrEmpty().stream()
                .filter(member -> Objects.equals(member.getStatus(), MEMBER_STATUS_ACTIVE))
                .count();
        Long actualActive = coupleMemberMapper.countActiveBySpaceId(space.getId());
        if (actualActive == null || actualActive != expectedActive) {
            throw new BizException(ResponseCodeEnum.SPACE_ARCHIVE_RESTORE_CONFLICT.getErrorCode(),
                    "恢复后成员数量与留档不一致，已回滚本次恢复");
        }

        // 3. 标记留档已恢复（条件更新，防止并发重复恢复）。
        int marked = archiveMapper.markRestored(archiveId, adminUserId, now);
        if (marked != 1) {
            throw new BizException(ResponseCodeEnum.SPACE_ARCHIVE_ALREADY_RESTORED);
        }

        int restoredContent = verifySnapshotContent(space.getId(), snapshot);

        String auditDetail = "archiveId=" + archiveId + ", round=" + archive.getArchiveRound()
                + ", status " + SPACE_STATUS_DESTROYED + " -> " + targetStatus
                + ", visibility=0, members restored=" + restoredMembers
                + ", content restored=" + restoredContent
                + ", archiveStory=" + archive.getStoryCount()
                + ", archivePhoto=" + archive.getPhotoCount()
                + ", archiveMessage=" + archive.getMessageCount()
                + ", archiveAnniversary=" + archive.getAnniversaryCount();
        adminAuditService.record(AdminAuditLogDO.builder()
                .adminUserId(adminUserId)
                .action(AdminAuditConstants.ACTION_SPACE_ARCHIVE_RESTORE)
                .targetType(AdminAuditConstants.TARGET_SPACE)
                .targetSpaceId(space.getId())
                .reason(reason)
                .result(AdminAuditConstants.RESULT_SUCCESS)
                .detail(StrUtil.maxLength(auditDetail, 900))
                .createTime(now)
                .build());
        log.info("管理员 {} 从留档 {} 恢复情侣空间 {}，成员 {} 人", adminUserId, archiveId,
                space.getId(), restoredMembers);

        CoupleSpaceArchiveDO latest = archiveMapper.findById(archiveId);
        CoupleSpaceDO restoredDo = coupleSpaceMapper.findById(space.getId());
        AdminSpaceArchiveRestoreRspVO response = buildRestoreResponse(
                latest == null ? archive : latest, false, restoredMembers, restoredContent);
        if (restoredDo != null) {
            response.setStatus(restoredDo.getStatus());
            response.setStatusText(spaceStatusText(restoredDo.getStatus()));
            response.setVisibility(restoredDo.getVisibility());
            response.setVisibilityText(visibilityText(restoredDo.getVisibility()));
        }
        return Response.success(response);
    }

    /**
     * 校验留档中的关联业务数据是否仍完整可恢复。
     *
     * <p>销毁流程不做物理删除，因此正常路径下无需补回任何行，返回 0。
     * 该方法负责「不静默丢失用户数据」的兜底：逐类统计快照中记录的行数，
     * 与实际库中该空间的行数比对；一旦发现缺失（例如被外部脚本清理），
     * 直接抛出明确错误并回滚整笔恢复，绝不把「部分数据恢复」当成成功。</p>
     *
     * <p>只读校验，不 INSERT / UPDATE 任何行，因此不会覆盖现存数据。
     * 若后续引入物理清理策略，可在此按快照 insert 缺失行并返回补回数量。</p>
     */
    private int verifySnapshotContent(Long spaceId, SpaceArchiveSnapshot snapshot) {
        checkContentCount("故事章节", snapshot.storyChaptersOrEmpty().size(),
                storyChapterMapper.selectAllBySpaceIdForArchive(spaceId).size());
        checkContentCount("故事", snapshot.storyNodesOrEmpty().size(),
                storyNodeMapper.selectAllBySpaceIdForArchive(spaceId).size());
        checkContentCount("故事图片", snapshot.storyNodeImagesOrEmpty().size(),
                storyNodeImageMapper.selectAllBySpaceIdForArchive(spaceId).size());
        checkContentCount("相册分类", snapshot.photoCategoriesOrEmpty().size(),
                photoCategoryMapper.selectAllBySpaceIdForArchive(spaceId).size());
        checkContentCount("照片", snapshot.photosOrEmpty().size(),
                photoMapper.selectAllBySpaceIdForArchive(spaceId).size());
        checkContentCount("纪念日", snapshot.anniversariesOrEmpty().size(),
                anniversaryMapper.selectAllBySpaceIdForArchive(spaceId).size());
        checkContentCount("留言", snapshot.messagesOrEmpty().size(),
                messageMapper.selectAllBySpaceIdForArchive(spaceId).size());
        checkContentCount("留言回复", snapshot.messageRepliesOrEmpty().size(),
                messageReplyMapper.selectAllBySpaceIdForArchive(spaceId).size());
        checkContentCount("空间配置", snapshot.configsOrEmpty().size(),
                coupleSpaceConfigMapper.selectAllBySpaceIdForArchive(spaceId).size());
        return 0;
    }

    /**
     * 单类关联数据行数校验：留档记录的行数不得多于库中现存行数。
     *
     * <p>库中行数可以更多（例如用户在销毁前新增过数据），但不能更少——
     * 更少意味着数据缺失，恢复后会丢失用户内容，必须拒绝。</p>
     */
    private void checkContentCount(String label, int snapshotCount, int actualCount) {
        if (actualCount < snapshotCount) {
            throw new BizException(ResponseCodeEnum.SPACE_ARCHIVE_DATA_MISSING.getErrorCode(),
                    ResponseCodeEnum.SPACE_ARCHIVE_DATA_MISSING.getErrorMessage()
                            + "：" + label + " 留档 " + snapshotCount + " 条，现存 " + actualCount + " 条");
        }
    }

    /**
     * 冲突分析：任何一条冲突都阻止恢复，且不做部分写入。
     */
    private List<AdminSpaceArchiveConflictVO> analyzeConflicts(CoupleSpaceArchiveDO archive,
                                                              CoupleSpaceDO space,
                                                              List<CoupleMemberDO> members,
                                                              Map<Long, UserDO> userMap,
                                                              boolean includeMemberConflicts) {
        List<AdminSpaceArchiveConflictVO> conflicts = new ArrayList<>();
        if (archive.getRestoredAt() != null) {
            conflicts.add(conflict("ARCHIVE_ALREADY_RESTORED", "留档已恢复",
                    null, null, format(archive.getRestoredAt())));
            return conflicts;
        }
        if (space == null) {
            conflicts.add(conflict("SPACE_MISSING", "空间数据缺失", null, null, "空间行不存在"));
            return conflicts;
        }
        if (!Objects.equals(space.getStatus(), SPACE_STATUS_DESTROYED)) {
            conflicts.add(conflict("SPACE_STATUS_CHANGED", "空间状态已变化",
                    space.getId(), space.getSpaceCode(),
                    "当前状态为「" + spaceStatusText(space.getStatus()) + "」，不是已销毁状态"));
        }
        if (includeMemberConflicts) {
            conflicts.addAll(findMemberConflicts(archive, members, userMap));
        }
        return conflicts;
    }

    /**
     * 查找「快照中的成员当前已加入其它未销毁空间」的冲突。
     *
     * <p>恢复会把成员重新激活为原空间有效成员；若该用户已经加入其它空间，直接恢复会造成
     * 一人多空间的数据冲突。这里一律拒绝，交由管理员先处理冲突，不静默关闭或覆盖其它空间。</p>
     */
    private List<AdminSpaceArchiveConflictVO> findMemberConflicts(CoupleSpaceArchiveDO archive,
                                                                  List<CoupleMemberDO> members,
                                                                  Map<Long, UserDO> userMap) {
        List<AdminSpaceArchiveConflictVO> conflicts = new ArrayList<>();
        Set<Long> snapshotUserIds = new HashSet<>();
        try {
            SpaceArchiveSnapshot snapshot = snapshotService.parse(archive.getSnapshotJson());
            if (snapshot != null) {
                for (SpaceArchiveSnapshot.Member member : snapshot.membersOrEmpty()) {
                    if (Objects.equals(member.getStatus(), MEMBER_STATUS_ACTIVE)
                            && member.getUserId() != null) {
                        snapshotUserIds.add(member.getUserId());
                    }
                }
            }
        } catch (Exception exception) {
            log.warn("解析留档成员失败，archiveId: {}", archive.getId(), exception);
        }
        if (snapshotUserIds.isEmpty()) {
            return conflicts;
        }
        List<CoupleMemberDO> activeMemberships =
                coupleMemberMapper.selectActiveByUserIds(snapshotUserIds);
        if (activeMemberships == null || activeMemberships.isEmpty()) {
            return conflicts;
        }
        Set<Long> conflictSpaceIds = activeMemberships.stream()
                .map(CoupleMemberDO::getSpaceId)
                .filter(Objects::nonNull)
                .filter(spaceId -> !Objects.equals(spaceId, archive.getSpaceId()))
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (conflictSpaceIds.isEmpty()) {
            return conflicts;
        }
        Map<Long, CoupleSpaceDO> spaceMap = coupleSpaceMapper.selectBatchIds(conflictSpaceIds).stream()
                .collect(Collectors.toMap(CoupleSpaceDO::getId, Function.identity(), (left, right) -> left));
        for (CoupleMemberDO membership : activeMemberships) {
            Long conflictSpaceId = membership.getSpaceId();
            if (conflictSpaceId == null || Objects.equals(conflictSpaceId, archive.getSpaceId())) {
                continue;
            }
            CoupleSpaceDO conflictSpace = spaceMap.get(conflictSpaceId);
            if (conflictSpace == null
                    || Objects.equals(conflictSpace.getStatus(), SPACE_STATUS_DELETED)
                    || Objects.equals(conflictSpace.getStatus(), SPACE_STATUS_DESTROYED)) {
                // 已解绑 / 已销毁空间的有效残留不构成真实冲突。
                continue;
            }
            conflicts.add(AdminSpaceArchiveConflictVO.builder()
                    .type("MEMBER_IN_OTHER_SPACE")
                    .typeText("成员已加入其它空间")
                    .conflictSpaceId(conflictSpace.getId())
                    .conflictSpaceCode(conflictSpace.getSpaceCode())
                    .conflictSpaceName(conflictSpace.getSpaceName())
                    .conflictSpaceStatus(conflictSpace.getStatus())
                    .conflictSpaceStatusText(spaceStatusText(conflictSpace.getStatus()))
                    .memberAmourId(amourId(userMap.get(membership.getUserId())))
                    .message("成员（" + amourId(userMap.get(membership.getUserId()))
                            + "）已加入其它未销毁空间，需先处理该空间后再恢复")
                    .build());
        }
        return conflicts;
    }

    private AdminSpaceArchiveConflictVO conflict(String type, String typeText, Long spaceId,
                                                 String spaceCode, String message) {
        return AdminSpaceArchiveConflictVO.builder()
                .type(type)
                .typeText(typeText)
                .conflictSpaceId(spaceId)
                .conflictSpaceCode(spaceCode)
                .message(message)
                .build();
    }

    private BizException buildConflictException(List<AdminSpaceArchiveConflictVO> conflicts) {
        String details = conflicts.stream()
                .limit(5)
                .map(AdminSpaceArchiveConflictVO::getMessage)
                .filter(StrUtil::isNotBlank)
                .collect(Collectors.joining("；"));
        String more = conflicts.size() > 5 ? "；另有 " + (conflicts.size() - 5) + " 项冲突" : "";
        return new BizException(ResponseCodeEnum.SPACE_ARCHIVE_RESTORE_CONFLICT.getErrorCode(),
                "存在无法自动处理的恢复冲突：" + details + more + "。请先处理冲突后再恢复");
    }

    private String resolveRestoreBlockReason(CoupleSpaceArchiveDO archive, CoupleSpaceDO space,
                                             List<AdminSpaceArchiveConflictVO> conflicts) {
        if (archive.getRestoredAt() != null) {
            return "该留档已恢复";
        }
        if (space == null) {
            return "空间数据缺失，无法恢复";
        }
        if (!Objects.equals(space.getStatus(), SPACE_STATUS_DESTROYED)) {
            return "空间当前状态为「" + spaceStatusText(space.getStatus()) + "」，不是已销毁状态";
        }
        if (!conflicts.isEmpty()) {
            return conflicts.get(0).getMessage();
        }
        return "";
    }

    /**
     * 恢复后的目标状态：沿用销毁前状态，仅允许回到等待绑定，绝不直接恢复为正常可用。
     *
     * <p>销毁只发生在一人空间，恢复后仍是一人空间，因此目标是 status=0；
     * 若历史留档记录的是单人 status=1，也按等待绑定处理，由用户重新完成绑定流程。</p>
     */
    private int resolveTargetStatus(CoupleSpaceArchiveDO archive) {
        Integer before = archive.getStatusBefore();
        if (before != null && before == SPACE_STATUS_NORMAL
                && archive.getMemberCount() != null && archive.getMemberCount() <= 1) {
            return SPACE_STATUS_WAITING;
        }
        return SPACE_STATUS_WAITING;
    }

    private AdminSpaceArchiveRestoreRspVO buildRestoreResponse(CoupleSpaceArchiveDO archive,
                                                               boolean alreadyRestored,
                                                               int restoredMembers,
                                                               int restoredContent) {
        return AdminSpaceArchiveRestoreRspVO.builder()
                .archiveId(archive.getId())
                .spaceId(archive.getSpaceId())
                .spaceCode(StrUtil.blankToDefault(archive.getSpaceCode(), ""))
                .spaceName(StrUtil.blankToDefault(archive.getSpaceName(), ""))
                .status(SPACE_STATUS_WAITING)
                .statusText(spaceStatusText(SPACE_STATUS_WAITING))
                .visibility(SPACE_VISIBILITY_PRIVATE)
                .visibilityText(visibilityText(SPACE_VISIBILITY_PRIVATE))
                .restoredMemberCount(restoredMembers)
                .restoredContentCount(restoredContent)
                .alreadyRestored(alreadyRestored)
                .build();
    }

    private void recordRestoreFailure(Long archiveId, Long spaceId, Long adminUserId,
                                      String reason, RuntimeException exception) {
        try {
            String detail = "SYSTEM_ERROR";
            if (exception instanceof BizException) {
                BizException bizException = (BizException) exception;
                detail = bizException.getErrorCode() + ": "
                        + StrUtil.blankToDefault(bizException.getErrorMessage(), "");
            }
            adminAuditService.recordFailure(AdminAuditLogDO.builder()
                    .adminUserId(adminUserId)
                    .action(AdminAuditConstants.ACTION_SPACE_ARCHIVE_RESTORE)
                    .targetType(AdminAuditConstants.TARGET_SPACE)
                    .targetSpaceId(spaceId)
                    .reason(reason)
                    .result(AdminAuditConstants.RESULT_FAILURE)
                    .detail(StrUtil.maxLength("archiveId=" + archiveId + ", " + detail, 900))
                    .createTime(LocalDateTime.now())
                    .build());
        } catch (Exception auditException) {
            log.error("留档恢复失败审计记录失败，archiveId: {}", archiveId, auditException);
        }
    }

    // ================================ VO 组装 ================================

    private AdminSpaceArchivePageRspVO toPageVO(CoupleSpaceArchiveDO archive, CoupleSpaceDO space,
                                                List<CoupleMemberDO> members,
                                                Map<Long, UserDO> userMap) {
        List<AdminSpaceArchiveConflictVO> conflicts = analyzeConflicts(
                archive, space, members, userMap, false);
        String blockReason = resolveRestoreBlockReason(archive, space, conflicts);
        boolean spaceDestroyed = space != null
                && Objects.equals(space.getStatus(), SPACE_STATUS_DESTROYED);
        return AdminSpaceArchivePageRspVO.builder()
                .archiveId(archive.getId())
                .spaceId(archive.getSpaceId())
                .spaceCode(StrUtil.blankToDefault(archive.getSpaceCode(), ""))
                .spaceName(StrUtil.blankToDefault(archive.getSpaceName(), ""))
                .archiveRound(archive.getArchiveRound())
                .statusBefore(archive.getStatusBefore())
                .statusBeforeText(spaceStatusText(archive.getStatusBefore()))
                .visibilityBefore(archive.getVisibilityBefore())
                .destroyedAt(format(archive.getDestroyedAt()))
                .restoredAt(format(archive.getRestoredAt()))
                .archiveMemberCount((long) archive.getMemberCount())
                .archiveStoryCount((long) archive.getStoryCount())
                .archivePhotoCount((long) archive.getPhotoCount())
                .archiveMessageCount((long) archive.getMessageCount())
                .archiveAnniversaryCount((long) archive.getAnniversaryCount())
                .fileResourceCount(archive.getFileResourceCount())
                .destroyedByAmourId(amourId(userMap.get(archive.getDestroyedBy())))
                .destroyedByDisplayName(displayName(userMap.get(archive.getDestroyedBy())))
                .creatorAmourId(amourId(userMap.get(archive.getCreatorUserId())))
                .creatorDisplayName(displayName(userMap.get(archive.getCreatorUserId())))
                .spaceDestroyed(spaceDestroyed)
                .restorable(blockReason.isEmpty())
                .restoreBlockReason(blockReason)
                .conflicts(conflicts)
                .canRestore(blockReason.isEmpty())
                .build();
    }

    private List<AdminSpaceMemberVO> buildSnapshotMembers(CoupleSpaceArchiveDO archive,
                                                          SpaceArchiveSnapshot snapshot,
                                                          Map<Long, UserDO> userMap) {
        if (snapshot == null) {
            return Collections.emptyList();
        }
        List<AdminSpaceMemberVO> result = new ArrayList<>();
        for (SpaceArchiveSnapshot.Member member : snapshot.membersOrEmpty()) {
            UserDO user = userMap.get(member.getUserId());
            result.add(AdminSpaceMemberVO.builder()
                    .memberRole(member.getMemberRole())
                    .roleText(memberRoleText(member.getMemberRole()))
                    .amourId(amourId(user))
                    .displayName(displayName(user))
                    .avatar(user == null ? "" : StrUtil.blankToDefault(user.getAvatar(), ""))
                    .status(member.getStatus())
                    .statusText(memberStatusText(member.getStatus()))
                    .joinedAt(StrUtil.blankToDefault(member.getJoinedAt(), ""))
                    .leftAt(StrUtil.blankToDefault(member.getLeftAt(), ""))
                    .build());
        }
        return result;
    }

    private List<AdminSpaceLifecycleEventVO> buildArchiveTimeline(CoupleSpaceArchiveDO archive,
                                                                  Map<Long, UserDO> userMap) {
        List<AdminSpaceLifecycleEventVO> events = new ArrayList<>();
        SpaceArchiveSnapshot snapshot = snapshotService.parse(archive.getSnapshotJson());
        if (snapshot != null && snapshot.getSpace() != null) {
            addEvent(events, "SPACE_CREATED", "空间创建", "",
                    StrUtil.blankToDefault(snapshot.getSpace().getCreateTime(), ""));
        }
        addEvent(events, "SPACE_DESTROYED", "创建者销毁空间",
                displayName(userMap.get(archive.getDestroyedBy())), format(archive.getDestroyedAt()));
        if (archive.getRestoredAt() != null) {
            addEvent(events, "SPACE_RESTORED", "管理员从留档恢复", "",
                    format(archive.getRestoredAt()));
        }
        return events;
    }

    private void addEvent(List<AdminSpaceLifecycleEventVO> events, String type, String title,
                          String description, String time) {
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

    private Map<Long, UserDO> loadUsers(Set<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Collections.emptyMap();
        }
        return userMapper.findUsersByIds(userIds).stream()
                .collect(Collectors.toMap(UserDO::getId, Function.identity(), (left, right) -> left));
    }

    private Map<Long, CoupleSpaceDO> loadSpaces(Set<Long> spaceIds) {
        if (spaceIds == null || spaceIds.isEmpty()) {
            return Collections.emptyMap();
        }
        return coupleSpaceMapper.selectBatchIds(spaceIds).stream()
                .collect(Collectors.toMap(CoupleSpaceDO::getId, Function.identity(), (left, right) -> left));
    }

    private Map<Long, List<CoupleMemberDO>> loadMembers(Set<Long> spaceIds) {
        if (spaceIds == null || spaceIds.isEmpty()) {
            return Collections.emptyMap();
        }
        Map<Long, List<CoupleMemberDO>> result = new HashMap<>();
        for (CoupleMemberDO member : coupleMemberMapper.selectBySpaceIds(spaceIds)) {
            result.computeIfAbsent(member.getSpaceId(), key -> new ArrayList<>()).add(member);
        }
        return result;
    }

    private void addUserId(Set<Long> userIds, Long userId) {
        if (userId != null) {
            userIds.add(userId);
        }
    }

    private String amourId(UserDO user) {
        return user == null ? "" : StrUtil.blankToDefault(user.getAmourId(), "");
    }

    private String displayName(UserDO user) {
        return user == null ? "恋人" : StrUtil.blankToDefault(user.getDisplayName(), "恋人");
    }

    private String format(LocalDateTime time) {
        return time == null ? "" : DATE_FORMATTER.format(time);
    }

    private LocalDateTime parseDateTime(String value) {
        if (StrUtil.isBlank(value)) {
            return null;
        }
        try {
            return LocalDateTime.parse(value.trim(), DATE_FORMATTER);
        } catch (Exception exception) {
            log.warn("留档时间解析失败，值：{}", value);
            return null;
        }
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
            case SPACE_STATUS_DELETED:
                return "双方已解绑";
            case SPACE_STATUS_DESTROYED:
                return "已销毁";
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
        if (Objects.equals(memberRole, 2)) {
            return "另一半";
        }
        return "成员";
    }

    private String memberStatusText(Integer status) {
        if (status == null) {
            return "";
        }
        switch (status) {
            case 0:
                return "邀请中";
            case MEMBER_STATUS_ACTIVE:
                return "有效";
            case 2:
                return "暂停";
            case MEMBER_STATUS_LEFT:
                return "已退出";
            case 4:
                return "已移除";
            default:
                return "未知状态";
        }
    }
}
