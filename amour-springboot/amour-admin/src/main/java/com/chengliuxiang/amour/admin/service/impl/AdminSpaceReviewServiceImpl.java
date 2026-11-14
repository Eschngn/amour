package com.chengliuxiang.amour.admin.service.impl;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.chengliuxiang.amour.admin.model.vo.spacereview.AdminSpaceReviewApproveReqVO;
import com.chengliuxiang.amour.admin.model.vo.spacereview.AdminSpaceReviewDetailReqVO;
import com.chengliuxiang.amour.admin.model.vo.spacereview.AdminSpaceReviewDetailRspVO;
import com.chengliuxiang.amour.admin.model.vo.spacereview.AdminSpaceReviewItemReqVO;
import com.chengliuxiang.amour.admin.model.vo.spacereview.AdminSpaceReviewPageReqVO;
import com.chengliuxiang.amour.admin.model.vo.spacereview.AdminSpaceReviewPageRspVO;
import com.chengliuxiang.amour.admin.model.vo.spacereview.AdminSpaceReviewRejectReqVO;
import com.chengliuxiang.amour.admin.model.vo.spacereview.AdminSpaceReviewUnpublishReqVO;
import com.chengliuxiang.amour.admin.security.AdminAuthorizationService;
import com.chengliuxiang.amour.admin.service.AdminAuditService;
import com.chengliuxiang.amour.admin.service.AdminSpaceReviewService;
import com.chengliuxiang.amour.common.constant.AdminAuditConstants;
import com.chengliuxiang.amour.common.constant.AdminPermissionConstants;
import com.chengliuxiang.amour.common.constant.ContentGovernanceConstants;
import com.chengliuxiang.amour.common.constant.SpaceReviewConstants;
import com.chengliuxiang.amour.common.domain.dos.AdminAuditLogDO;
import com.chengliuxiang.amour.common.domain.dos.AnniversaryDO;
import com.chengliuxiang.amour.common.domain.dos.CoupleMemberDO;
import com.chengliuxiang.amour.common.domain.dos.CoupleSpaceDO;
import com.chengliuxiang.amour.common.domain.dos.PhotoDO;
import com.chengliuxiang.amour.common.domain.dos.SpacePublishedItemDO;
import com.chengliuxiang.amour.common.domain.dos.SpaceReviewItemDO;
import com.chengliuxiang.amour.common.domain.dos.SpaceReviewSubmissionDO;
import com.chengliuxiang.amour.common.domain.dos.StoryNodeDO;
import com.chengliuxiang.amour.common.domain.dos.StoryNodeImageDO;
import com.chengliuxiang.amour.common.domain.dos.UserDO;
import com.chengliuxiang.amour.common.domain.mapper.AnniversaryMapper;import com.chengliuxiang.amour.common.domain.mapper.CoupleMemberMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleSpaceMapper;
import com.chengliuxiang.amour.common.domain.mapper.PhotoMapper;
import com.chengliuxiang.amour.common.domain.mapper.SpacePublishedItemMapper;
import com.chengliuxiang.amour.common.domain.mapper.SpaceReviewItemMapper;
import com.chengliuxiang.amour.common.domain.mapper.SpaceReviewSubmissionMapper;
import com.chengliuxiang.amour.common.domain.mapper.StoryNodeImageMapper;
import com.chengliuxiang.amour.common.domain.mapper.StoryNodeMapper;
import com.chengliuxiang.amour.common.domain.mapper.UserMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.model.snapshot.AnniversaryPublicSnapshot;
import com.chengliuxiang.amour.common.model.snapshot.HomeConfigPublicSnapshot;
import com.chengliuxiang.amour.common.model.snapshot.PhotoPublicSnapshot;
import com.chengliuxiang.amour.common.model.snapshot.SpacePublicSnapshot;
import com.chengliuxiang.amour.common.model.snapshot.StoryPublicSnapshot;
import com.chengliuxiang.amour.common.utils.JsonUtil;
import com.chengliuxiang.amour.common.utils.Response;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 后台情侣空间公开审核实现。
 *
 * <p>审核只处理 space_published_item 中的公开快照与 couple_space.visibility，
 * 不代替情侣编辑内容，也不会删除成员可见数据。</p>
 */
@Service
@Slf4j
public class AdminSpaceReviewServiceImpl implements AdminSpaceReviewService {

    private static final int DEFAULT_PAGE_SIZE = 10;
    private static final int MAX_PAGE_SIZE = 100;
    private static final int SPACE_STATUS_NORMAL = 1;
    private static final int SPACE_VISIBILITY_PUBLIC = 1;
    private static final int MEMBER_LIMIT = 2;
    private static final int HISTORY_LIMIT = 10;
    private static final int DIFF_TEXT_LIMIT = 500;

    private static final DateTimeFormatter FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final DateTimeFormatter DATE_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private static final Map<String, String> HOME_CONFIG_LABELS;

    static {
        Map<String, String> labels = new LinkedHashMap<>();
        labels.put("boy_name", "发起人展示名");
        labels.put("girl_name", "另一半展示名");
        labels.put("boy_avatar", "发起人头像");
        labels.put("girl_avatar", "另一半头像");
        labels.put("home.hero_photo_1", "首页照片一");
        labels.put("home.hero_photo_2", "首页照片二");
        HOME_CONFIG_LABELS = Collections.unmodifiableMap(labels);
    }

    @Resource
    private SpaceReviewSubmissionMapper submissionMapper;
    @Resource
    private SpaceReviewItemMapper itemMapper;
    @Resource
    private SpacePublishedItemMapper publishedItemMapper;
    @Resource
    private CoupleSpaceMapper coupleSpaceMapper;
    @Resource
    private CoupleMemberMapper coupleMemberMapper;
    @Resource
    private UserMapper userMapper;
    @Resource
    private StoryNodeMapper storyNodeMapper;
    @Resource
    private StoryNodeImageMapper storyNodeImageMapper;
    @Resource
    private PhotoMapper photoMapper;
    @Resource
    private AnniversaryMapper anniversaryMapper;
    @Resource
    private AdminAuditService adminAuditService;
    @Resource
    private AdminAuthorizationService adminAuthorizationService;

    @Override
    public Response<PageResult<AdminSpaceReviewPageRspVO>> findPage(AdminSpaceReviewPageReqVO reqVO) {
        adminAuthorizationService.requirePermission(AdminPermissionConstants.SPACE_REVIEW_QUERY);
        AdminSpaceReviewPageReqVO query = reqVO == null ? new AdminSpaceReviewPageReqVO() : reqVO;
        String status = normalizeStatus(query.getStatus());
        String reviewType = normalizeReviewType(query.getReviewType());
        Long submittedBy = resolveSubmittedBy(query.getSubmittedByAmourId());
        if (StrUtil.isNotBlank(query.getSubmittedByAmourId()) && submittedBy == null) {
            return Response.success(PageResult.<AdminSpaceReviewPageRspVO>builder()
                    .current(1L).size(0L).total(0L).records(Collections.emptyList()).build());
        }

        long current = query.getCurrent() == null || query.getCurrent() < 1 ? 1 : query.getCurrent();
        long size = query.getSize() == null || query.getSize() < 1
                ? DEFAULT_PAGE_SIZE : Math.min(query.getSize(), MAX_PAGE_SIZE);

        IPage<SpaceReviewSubmissionDO> page = submissionMapper.selectAdminPage(
                current, size, status, query.getSpaceId(), reviewType, submittedBy,
                StrUtil.trimToNull(query.getKeyword()), query.getStartTime(), query.getEndTime());
        List<SpaceReviewSubmissionDO> submissions = page.getRecords();
        if (CollUtil.isEmpty(submissions)) {
            return Response.success(PageResult.<AdminSpaceReviewPageRspVO>builder()
                    .current(page.getCurrent()).size(page.getSize()).total(page.getTotal())
                    .records(Collections.emptyList()).build());
        }

        Set<Long> spaceIds = submissions.stream()
                .map(SpaceReviewSubmissionDO::getSpaceId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, CoupleSpaceDO> spaceMap = loadSpaces(spaceIds);
        Map<Long, List<CoupleMemberDO>> memberMap = loadMemberMap(spaceIds);
        Set<Long> userIds = new HashSet<>();
        submissions.forEach(item -> {
            addId(userIds, item.getSubmittedBy());
            addId(userIds, item.getHandledBy());
        });
        memberMap.values().forEach(members -> members.forEach(member -> addId(userIds, member.getUserId())));
        Map<Long, UserDO> userMap = loadUsers(userIds);

        List<Long> submissionIds = submissions.stream()
                .map(SpaceReviewSubmissionDO::getId)
                .collect(Collectors.toList());
        Map<Long, List<SpaceReviewItemDO>> itemsBySubmission = itemMapper.selectBySubmissionIds(submissionIds)
                .stream()
                .collect(Collectors.groupingBy(SpaceReviewItemDO::getSubmissionId));

        List<AdminSpaceReviewPageRspVO> records = submissions.stream()
                .map(submission -> {
                    CoupleSpaceDO space = spaceMap.get(submission.getSpaceId());
                    List<CoupleMemberDO> members = memberMap.getOrDefault(
                            submission.getSpaceId(), Collections.emptyList());
                    List<String> memberNames = members.stream()
                            .map(member -> userName(userMap.get(member.getUserId())))
                            .collect(Collectors.toList());
                    List<SpaceReviewItemDO> items = itemsBySubmission.getOrDefault(
                            submission.getId(), Collections.emptyList());
                    ItemCounts counts = countItems(items);
                    UserDO submitter = userMap.get(submission.getSubmittedBy());
                    return AdminSpaceReviewPageRspVO.builder()
                            .submissionId(submission.getId())
                            .spaceId(submission.getSpaceId())
                            .spaceCode(space == null ? "" : StrUtil.nullToEmpty(space.getSpaceCode()))
                            .spaceName(space == null ? "未知空间" : StrUtil.nullToEmpty(space.getSpaceName()))
                            .memberSummary(String.join(" · ", memberNames))
                            .memberNames(memberNames)
                            .spaceStatus(space == null ? null : space.getStatus())
                            .spaceStatusText(space == null ? "" : spaceStatusText(space.getStatus()))
                            .spaceVisibility(space == null ? null : space.getVisibility())
                            .spaceVisibilityText(space == null ? ""
                                    : visibilityText(space.getVisibility()))
                            .reviewType(submission.getReviewType())
                            .reviewTypeText(SpaceReviewConstants.reviewTypeText(submission.getReviewType()))
                            .itemCount(counts.total)
                            .contentItemCount((int) items.stream()
                                    .filter(item -> SpaceReviewConstants.isContentItemType(item.getItemType()))
                                    .count())
                            .pendingItemCount(counts.pending)
                            .approvedItemCount(counts.approved)
                            .rejectedItemCount(counts.rejected)
                            .withdrawnItemCount(counts.withdrawn)
                            .itemRejectReason(firstRejectReason(items))
                            .submittedByAmourId(submitter == null ? ""
                                    : StrUtil.nullToEmpty(submitter.getAmourId()))
                            .submittedByName(userName(submitter))
                            .submittedAt(format(submission.getCreateTime()))
                            .status(submission.getStatus())
                            .statusText(SpaceReviewConstants.statusText(submission.getStatus()))
                            .handledAt(format(submission.getHandledAt()))
                            .rejectReason(StrUtil.nullToEmpty(submission.getRejectReason()))
                            .updateTime(format(submission.getUpdateTime()))
                            .build();
                })
                .collect(Collectors.toList());

        return Response.success(PageResult.<AdminSpaceReviewPageRspVO>builder()
                .current(page.getCurrent())
                .size(page.getSize())
                .total(page.getTotal())
                .records(records)
                .build());
    }

    @Override
    public Response<AdminSpaceReviewDetailRspVO> findDetail(AdminSpaceReviewDetailReqVO reqVO) {
        adminAuthorizationService.requirePermission(AdminPermissionConstants.SPACE_REVIEW_QUERY);
        if (reqVO == null || reqVO.getSubmissionId() == null) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        SpaceReviewSubmissionDO submission = requireSubmission(reqVO.getSubmissionId());
        CoupleSpaceDO space = requireSpace(submission.getSpaceId());
        List<SpaceReviewItemDO> items = itemMapper.selectBySubmissionId(submission.getId());
        ItemCounts counts = countItems(items);

        List<AdminSpaceReviewDetailRspVO.ItemVO> publishedItems = loadPublishedItemVOs(space);
        Map<String, SpacePublishedItemDO> publishedByTarget = publishedItemMapper
                .selectPublishedBySpaceId(space.getId()).stream()
                .collect(Collectors.toMap(
                        item -> itemKey(item.getItemType(), item.getItemId()), item -> item,
                        (left, right) -> left));
        List<AdminSpaceReviewDetailRspVO.ItemVO> reviewItemVOs = items.stream()
                .map(item -> toItemVO(item,
                        publishedByTarget.get(itemKey(item.getItemType(), item.getItemId()))))
                .collect(Collectors.toList());
        List<AdminSpaceReviewDetailRspVO.ItemVO> pendingVOs = reviewItemVOs.stream()
                .filter(item -> SpaceReviewConstants.ITEM_STATUS_PENDING.equals(item.getItemStatus()))
                .collect(Collectors.toList());

        Set<Long> userIds = new HashSet<>();
        addId(userIds, submission.getSubmittedBy());
        addId(userIds, submission.getHandledBy());
        List<CoupleMemberDO> members = coupleMemberMapper.selectBySpaceId(space.getId());
        members.forEach(member -> addId(userIds, member.getUserId()));
        Map<Long, UserDO> userMap = loadUsers(userIds);
        UserDO submitter = userMap.get(submission.getSubmittedBy());
        UserDO handler = userMap.get(submission.getHandledBy());

        List<AdminSpaceReviewDetailRspVO.MemberVO> memberVOs = members.stream()
                .map(member -> {
                    UserDO user = userMap.get(member.getUserId());
                    return AdminSpaceReviewDetailRspVO.MemberVO.builder()
                            .amourId(user == null ? "" : StrUtil.nullToEmpty(user.getAmourId()))
                            .displayName(userName(user))
                            .avatar(user == null ? "" : StrUtil.nullToEmpty(user.getAvatar()))
                            .roleText(memberRoleText(member.getMemberRole()))
                            .build();
                })
                .collect(Collectors.toList());

        List<AdminSpaceReviewDetailRspVO.HistoryVO> history = new ArrayList<>();
        List<SpaceReviewSubmissionDO> allSubmissions = submissionMapper.selectBySpaceId(space.getId());
        for (SpaceReviewSubmissionDO item : allSubmissions) {
            if (history.size() >= HISTORY_LIMIT) {
                break;
            }
            if (Objects.equals(item.getId(), submission.getId())) {
                continue;
            }
            history.add(AdminSpaceReviewDetailRspVO.HistoryVO.builder()
                    .submissionId(item.getId())
                    .status(item.getStatus())
                    .statusText(SpaceReviewConstants.statusText(item.getStatus()))
                    .reviewType(item.getReviewType())
                    .reviewTypeText(SpaceReviewConstants.reviewTypeText(item.getReviewType()))
                    .submittedAt(format(item.getCreateTime()))
                    .handledAt(format(item.getHandledAt()))
                    .rejectReason(StrUtil.nullToEmpty(item.getRejectReason()))
                    .build());
        }

        // 查看审核详情属于敏感读取，记录审计；审计失败不阻断排障。
        try {
            recordAudit(AdminAuditConstants.ACTION_SPACE_REVIEW_VIEW, space.getId(), submission.getId(),
                    null, null, "查看空间审核详情", "items=" + items.size());
        } catch (Exception exception) {
            log.warn("空间审核详情审计记录失败，submissionId: {}", submission.getId(), exception);
        }

        return Response.success(AdminSpaceReviewDetailRspVO.builder()
                .submissionId(submission.getId())
                .spaceId(space.getId())
                .status(submission.getStatus())
                .statusText(SpaceReviewConstants.statusText(submission.getStatus()))
                .reviewType(submission.getReviewType())
                .reviewTypeText(SpaceReviewConstants.reviewTypeText(submission.getReviewType()))
                .baseRevision(submission.getBaseRevision())
                .changeSummary(StrUtil.nullToEmpty(submission.getChangeSummary()))
                .submittedByAmourId(submitter == null ? "" : StrUtil.nullToEmpty(submitter.getAmourId()))
                .submittedByName(userName(submitter))
                .submittedAt(format(submission.getCreateTime()))
                .handledByAmourId(handler == null ? "" : StrUtil.nullToEmpty(handler.getAmourId()))
                .handledByName(handler == null ? "" : userName(handler))
                .handledAt(format(submission.getHandledAt()))
                .rejectReason(StrUtil.nullToEmpty(submission.getRejectReason()))
                .space(AdminSpaceReviewDetailRspVO.SpaceInfoVO.builder()
                        .spaceId(space.getId())
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
                        .members(memberVOs)
                        .build())
                .publishedItems(publishedItems)
                .reviewItems(reviewItemVOs)
                .pendingItems(pendingVOs)
                .itemCount(counts.total)
                .pendingItemCount(counts.pending)
                .approvedItemCount(counts.approved)
                .rejectedItemCount(counts.rejected)
                .withdrawnItemCount(counts.withdrawn)
                .publicStoryCount(countPublished(publishedItems, SpaceReviewConstants.ITEM_TYPE_STORY))
                .publicPhotoCount(countPublished(publishedItems, SpaceReviewConstants.ITEM_TYPE_PHOTO))
                .publicAnniversaryCount(countPublished(publishedItems,
                        SpaceReviewConstants.ITEM_TYPE_ANNIVERSARY))
                .history(history)
                .build());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Void> approve(AdminSpaceReviewApproveReqVO reqVO) {
        adminAuthorizationService.requirePermission(AdminPermissionConstants.SPACE_REVIEW_PROCESS);
        if (reqVO == null || reqVO.getSubmissionId() == null) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        SpaceReviewSubmissionDO submission = requireSubmission(reqVO.getSubmissionId());
        requirePending(submission);
        CoupleSpaceDO space = requireSpace(submission.getSpaceId());
        List<SpaceReviewItemDO> items = itemMapper.selectBySubmissionId(submission.getId()).stream()
                .filter(item -> SpaceReviewConstants.ITEM_STATUS_PENDING.equals(item.getItemStatus()))
                .collect(Collectors.toList());
        if (CollUtil.isEmpty(items)) {
            throw new BizException(ResponseCodeEnum.SPACE_REVIEW_SNAPSHOT_INVALID);
        }
        LocalDateTime now = LocalDateTime.now();
        Long adminUserId = StpUtil.getLoginIdAsLong();

        // 先占用版本：任一对象在审核期间被再次编辑，整笔审核失败，不能用旧版本覆盖新版本。
        claimRevisions(space, items, now);

        for (SpaceReviewItemDO item : items) {
            int updated = itemMapper.resolveItemWithDecision(submission.getId(),
                    item.getItemType(), item.getItemId(),
                    SpaceReviewConstants.ITEM_STATUS_APPROVED, "", adminUserId, now);
            if (updated == 0) {
                throw new BizException(ResponseCodeEnum.SPACE_REVIEW_ITEM_NOT_PENDING);
            }
            upsertPublished(item, now);
            itemMapper.supersedeRejectedByTarget(space.getId(), item.getItemType(),
                    item.getItemId(), now);
        }

        List<SpaceReviewItemDO> latestItems = itemMapper.selectBySubmissionId(submission.getId());
        ItemCounts counts = countItems(latestItems);
        String finalStatus = resolveFinalStatus(counts);
        int resolved = submissionMapper.resolve(submission.getId(), space.getId(),
                SpaceReviewConstants.STATUS_PENDING, finalStatus,
                adminUserId, now, firstRejectReason(latestItems), now);
        if (resolved == 0) {
            throw new BizException(ResponseCodeEnum.SPACE_REVIEW_NOT_PENDING);
        }
        // 只有整笔提交全部通过时才允许把空间切换为公开；部分通过或存在驳回项时保持原状。
        boolean spacePublished = publishSpaceIfEligible(space, latestItems, finalStatus, now);

        recordAudit(AdminAuditConstants.ACTION_SPACE_REVIEW_APPROVE, space.getId(),
                submission.getId(), null, null,
                StrUtil.blankToDefault(StrUtil.trim(reqVO.getReason()), "审核通过空间公开内容"),
                "items=" + items.size() + ", status=" + finalStatus
                        + ", spacePublished=" + spacePublished);
        return Response.success();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Void> approveItem(AdminSpaceReviewItemReqVO reqVO) {
        adminAuthorizationService.requirePermission(AdminPermissionConstants.SPACE_REVIEW_PROCESS);
        if (reqVO == null || reqVO.getSubmissionId() == null) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        String itemType = normalizeItemType(reqVO.getItemType());
        Long itemId = reqVO.getItemId();
        if (itemId == null) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        SpaceReviewSubmissionDO submission = requireSubmission(reqVO.getSubmissionId());
        CoupleSpaceDO space = requireSpace(submission.getSpaceId());
        SpaceReviewItemDO pendingItem = itemMapper.selectPendingItem(
                submission.getId(), itemType, itemId);
        if (pendingItem == null || !Objects.equals(pendingItem.getSpaceId(), space.getId())) {
            throw new BizException(ResponseCodeEnum.SPACE_REVIEW_ITEM_NOT_PENDING);
        }
        requirePending(submission);
        LocalDateTime now = LocalDateTime.now();
        Long adminUserId = StpUtil.getLoginIdAsLong();

        claimItemRevision(space, pendingItem, now);
        int updated = itemMapper.resolveItemWithDecision(submission.getId(), itemType, itemId,
                SpaceReviewConstants.ITEM_STATUS_APPROVED, "", adminUserId, now);
        if (updated == 0) {
            throw new BizException(ResponseCodeEnum.SPACE_REVIEW_ITEM_NOT_PENDING);
        }
        upsertPublished(pendingItem, now);
        itemMapper.supersedeRejectedByTarget(space.getId(), itemType, itemId, now);

        String submissionStatus = refreshSubmissionStatus(submission, space, adminUserId, now, null);
        if (SpaceReviewConstants.STATUS_APPROVED.equals(submissionStatus)) {
            List<SpaceReviewItemDO> latestItems = itemMapper.selectBySubmissionId(submission.getId());
            publishSpaceIfEligible(space, latestItems, submissionStatus, now);
        }

        String auditType = auditContentType(itemType);
        recordAudit(AdminAuditConstants.ACTION_SPACE_REVIEW_APPROVE_ITEM, space.getId(),
                submission.getId(), auditType, auditType == null ? null : itemId,
                StrUtil.blankToDefault(StrUtil.trim(reqVO.getReason()), "通过该审核项"),
                "scope=ITEM, submissionId=" + submission.getId() + ", itemType=" + itemType
                        + ", itemId=" + itemId + ", result=APPROVED"
                        + ", submissionStatus=" + submissionStatus);
        return Response.success();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Void> reject(AdminSpaceReviewRejectReqVO reqVO) {
        adminAuthorizationService.requirePermission(AdminPermissionConstants.SPACE_REVIEW_PROCESS);
        if (reqVO == null || reqVO.getSubmissionId() == null) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        String reason = requireReason(reqVO.getReason());
        String itemType = StrUtil.trimToNull(reqVO.getItemType());
        Long itemId = reqVO.getItemId();
        if (itemType != null || itemId != null) {
            // 兼容旧页面的“驳回此项”调用：复用项级驳回逻辑，但 reason 已在上方校验。
            return rejectItemInternal(reqVO.getSubmissionId(),
                    normalizeItemType(itemType), itemId, reason);
        }

        SpaceReviewSubmissionDO submission = requireSubmission(reqVO.getSubmissionId());
        requirePending(submission);
        CoupleSpaceDO space = requireSpace(submission.getSpaceId());
        LocalDateTime now = LocalDateTime.now();
        Long adminUserId = StpUtil.getLoginIdAsLong();

        int rejectedItems = itemMapper.resolveBySubmissionIdWithDecision(submission.getId(),
                SpaceReviewConstants.ITEM_STATUS_REJECTED, reason, adminUserId, now);
        List<SpaceReviewItemDO> items = itemMapper.selectBySubmissionId(submission.getId());
        ItemCounts counts = countItems(items);
        String finalStatus = resolveFinalStatus(counts);
        int resolved = submissionMapper.resolve(submission.getId(), space.getId(),
                SpaceReviewConstants.STATUS_PENDING, finalStatus, adminUserId, now, reason, now);
        if (resolved == 0) {
            throw new BizException(ResponseCodeEnum.SPACE_REVIEW_NOT_PENDING);
        }

        // 驳回不改变任何已发布版本，广场继续展示旧内容；空间 visibility 也不在驳回流程中修改。
        recordAudit(AdminAuditConstants.ACTION_SPACE_REVIEW_REJECT, space.getId(),
                submission.getId(), null, null, reason,
                "scope=SUBMISSION, status=" + finalStatus + ", rejectedItems=" + rejectedItems
                        + ", visibility=" + space.getVisibility());
        return Response.success();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Void> rejectItem(AdminSpaceReviewItemReqVO reqVO) {
        adminAuthorizationService.requirePermission(AdminPermissionConstants.SPACE_REVIEW_PROCESS);
        if (reqVO == null || reqVO.getSubmissionId() == null) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        return rejectItemInternal(reqVO.getSubmissionId(),
                normalizeItemType(reqVO.getItemType()), reqVO.getItemId(),
                requireReason(reqVO.getReason()));
    }

    /**
     * 驳回单个待审核项。
     *
     * <p>只把该审核项标记为 REJECTED 并记录原因；如果同一提交还有其他待审核项，
     * 提交保持 PENDING。该分支不触碰 space_published_item，因此不会误下架已公开内容。</p>
     */
    private Response<Void> rejectItemInternal(Long submissionId, String itemType, Long itemId,
                                              String reason) {
        if (itemId == null) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        SpaceReviewSubmissionDO submission = requireSubmission(submissionId);
        CoupleSpaceDO space = requireSpace(submission.getSpaceId());
        LocalDateTime now = LocalDateTime.now();
        Long adminUserId = StpUtil.getLoginIdAsLong();

        SpaceReviewItemDO pendingItem = itemMapper.selectPendingItem(
                submission.getId(), itemType, itemId);
        if (pendingItem == null || !Objects.equals(pendingItem.getSpaceId(), space.getId())) {
            throw new BizException(ResponseCodeEnum.SPACE_REVIEW_ITEM_NOT_PENDING);
        }
        requirePending(submission);
        int updated = itemMapper.resolveItemWithDecision(submission.getId(), itemType, itemId,
                SpaceReviewConstants.ITEM_STATUS_REJECTED, reason, adminUserId, now);
        if (updated == 0) {
            throw new BizException(ResponseCodeEnum.SPACE_REVIEW_ITEM_NOT_PENDING);
        }

        String submissionStatus = refreshSubmissionStatus(submission, space, adminUserId, now, reason);

        String auditType = auditContentType(itemType);
        recordAudit(AdminAuditConstants.ACTION_SPACE_REVIEW_REJECT_ITEM, space.getId(),
                submission.getId(), auditType, auditType == null ? null : itemId, reason,
                "scope=ITEM, submissionId=" + submission.getId() + ", itemType=" + itemType
                        + ", itemId=" + itemId + ", result=REJECTED"
                        + ", submissionStatus=" + submissionStatus);
        return Response.success();
    }

    private String requireReason(String rawReason) {
        String reason = StrUtil.trim(rawReason);
        if (StrUtil.isBlank(reason)) {
            throw new BizException(ResponseCodeEnum.REASON_REQUIRED);
        }
        return StrUtil.maxLength(reason, 500);
    }

    /**
     * 下架已公开内容，或暂停整个空间公开。
     *
     * <p>待审核项应走 {@link #reject(AdminSpaceReviewRejectReqVO)} 的 itemType/itemId 分支，
     * 不要用本方法表达“驳回待审核变更”。为了兼容旧客户端，本方法仍会同步撤回
     * 同目标的待审核项，避免下架内容被旧审核重新公开。</p>
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Void> unpublish(AdminSpaceReviewUnpublishReqVO reqVO) {
        adminAuthorizationService.requirePermission(AdminPermissionConstants.SPACE_REVIEW_PROCESS);
        if (reqVO == null || reqVO.getSpaceId() == null) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        String reason = StrUtil.trim(reqVO.getReason());
        if (StrUtil.isBlank(reason)) {
            throw new BizException(ResponseCodeEnum.REASON_REQUIRED);
        }
        reason = StrUtil.maxLength(reason, 500);
        CoupleSpaceDO space = requireSpace(reqVO.getSpaceId());
        LocalDateTime now = LocalDateTime.now();
        String contentType = StrUtil.trimToNull(reqVO.getContentType());
        if (contentType != null) {
            // 类型统一按小写处理，避免大小写差异被误判为不支持的类型。
            contentType = contentType.toLowerCase(Locale.ROOT);
        }

        if (contentType == null) {
            // 只传 contentId、不传 contentType 时必须拒绝，避免误触发整空间下架。
            if (reqVO.getContentId() != null) {
                throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
            }
            return unpublishSpace(space, reason, now);
        }
        if (ContentGovernanceConstants.TYPE_SPACE.equalsIgnoreCase(contentType)) {
            if (reqVO.getContentId() != null) {
                throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
            }
            return unpublishSpace(space, reason, now);
        }
        if (!ContentGovernanceConstants.isSupportedContentType(contentType)
                || ContentGovernanceConstants.TYPE_MESSAGE.equalsIgnoreCase(contentType)) {
            throw new BizException(ResponseCodeEnum.CONTENT_TYPE_NOT_SUPPORTED);
        }
        if (reqVO.getContentId() == null) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        String itemType = toItemType(contentType);
        int unpublished = publishedItemMapper.unpublishItem(space.getId(), itemType,
                reqVO.getContentId(), reason, now);
        if (unpublished == 0) {
            // 只有确实在广场展示的已公开内容才能下架；纯待审核项属于审核流程，
            // 应使用“驳回此项”处理，不能伪装成已下架内容。
            throw new BizException(ResponseCodeEnum.SPACE_REVIEW_TARGET_NOT_FOUND);
        }
        // 同步让该内容的待审核版本失效，避免管理员下架后又被旧审核重新公开。
        int pendingSuperseded = itemMapper.markSupersededByTarget(
                space.getId(), itemType, reqVO.getContentId(), now);
        closeEmptyPendingSubmission(space.getId(), now);
        recordAudit(AdminAuditConstants.ACTION_SPACE_REVIEW_UNPUBLISH_CONTENT, space.getId(), null,
                contentType, reqVO.getContentId(), reason,
                "scope=CONTENT, unpublished=" + unpublished
                        + ", pendingSuperseded=" + pendingSuperseded);
        return Response.success();
    }

    private Response<Void> unpublishSpace(CoupleSpaceDO space, String reason, LocalDateTime now) {
        coupleSpaceMapper.adminUnpublish(space.getId(), now);
        int unpublished = publishedItemMapper.unpublishAllBySpaceId(space.getId(), reason, now);
        SpaceReviewSubmissionDO pending = submissionMapper.selectPendingBySpaceId(space.getId());
        if (pending != null) {
            submissionMapper.resolve(pending.getId(), space.getId(),
                    SpaceReviewConstants.STATUS_PENDING, SpaceReviewConstants.STATUS_SUPERSEDED,
                    StpUtil.getLoginIdAsLong(), now, reason, now);
            itemMapper.resolveBySubmissionId(pending.getId(),
                    SpaceReviewConstants.ITEM_STATUS_SUPERSEDED, now);
            // 管理员下架导致待审核提交失效，单独记录一次撤回动作，便于追溯。
            recordAudit(AdminAuditConstants.ACTION_SPACE_REVIEW_WITHDRAW, space.getId(),
                    pending.getId(), null, null, reason, "status=PENDING->SUPERSEDED");
        }
        recordAudit(AdminAuditConstants.ACTION_SPACE_REVIEW_UNPUBLISH, space.getId(),
                pending == null ? null : pending.getId(), null, null, reason,
                "scope=SPACE, space visibility=0, unpublishedItems=" + unpublished);
        return Response.success();
    }

    /* -------------------- 审核通过 / 驳回辅助 -------------------- */

    private void claimRevisions(CoupleSpaceDO space, List<SpaceReviewItemDO> items, LocalDateTime now) {
        int spaceBaseRevision = -1;
        for (SpaceReviewItemDO item : items) {
            if (SpaceReviewConstants.ITEM_TYPE_SPACE.equals(item.getItemType())
                    || SpaceReviewConstants.ITEM_TYPE_HOME_CONFIG.equals(item.getItemType())) {
                int base = item.getBaseRevision() == null ? 0 : item.getBaseRevision();
                spaceBaseRevision = Math.max(spaceBaseRevision, base);
            }
        }
        if (spaceBaseRevision >= 0
                && coupleSpaceMapper.claimRevision(space.getId(), spaceBaseRevision, now) == 0) {
            throw new BizException(ResponseCodeEnum.SPACE_REVIEW_REVISION_CONFLICT);
        }
        for (SpaceReviewItemDO item : items) {
            claimContentRevision(space, item, now);
        }
    }

    /**
     * 项级通过前的版本校验。空间级项通过后空间版本号会自增，
     * 因此同步同提交内剩余的待审核空间级项，避免后续项被误判为过期。
     */
    private void claimItemRevision(CoupleSpaceDO space, SpaceReviewItemDO item, LocalDateTime now) {
        int base = item.getBaseRevision() == null ? 0 : item.getBaseRevision();
        if (SpaceReviewConstants.ITEM_TYPE_SPACE.equals(item.getItemType())
                || SpaceReviewConstants.ITEM_TYPE_HOME_CONFIG.equals(item.getItemType())) {
            if (coupleSpaceMapper.claimRevision(space.getId(), base, now) == 0) {
                throw new BizException(ResponseCodeEnum.SPACE_REVIEW_REVISION_CONFLICT);
            }
            itemMapper.syncSpaceLevelBaseRevision(item.getSubmissionId(), base + 1, now);
            return;
        }
        claimContentRevision(space, item, now);
    }

    private void claimContentRevision(CoupleSpaceDO space, SpaceReviewItemDO item,
                                      LocalDateTime now) {
        int base = item.getBaseRevision() == null ? 0 : item.getBaseRevision();
        int claimed = 1;
        if (SpaceReviewConstants.ITEM_TYPE_STORY.equals(item.getItemType())) {
            claimed = storyNodeMapper.claimRevision(space.getId(), item.getItemId(), base, now);
        } else if (SpaceReviewConstants.ITEM_TYPE_PHOTO.equals(item.getItemType())) {
            claimed = photoMapper.claimRevision(space.getId(), item.getItemId(), base, now);
        } else if (SpaceReviewConstants.ITEM_TYPE_ANNIVERSARY.equals(item.getItemType())) {
            claimed = anniversaryMapper.claimRevision(space.getId(), item.getItemId(), base, now);
        }
        if (claimed == 0) {
            throw new BizException(ResponseCodeEnum.SPACE_REVIEW_REVISION_CONFLICT);
        }
    }

    /**
     * 重新计算提交级状态。仍存在 PENDING 项时提交保持 PENDING，只刷新摘要。
     */
    private String refreshSubmissionStatus(SpaceReviewSubmissionDO submission, CoupleSpaceDO space,
                                           Long adminUserId, LocalDateTime now,
                                           String latestRejectReason) {
        List<SpaceReviewItemDO> items = itemMapper.selectBySubmissionId(submission.getId());
        ItemCounts counts = countItems(items);
        if (counts.pending > 0) {
            submissionMapper.touchPending(submission.getId(), space.getId(),
                    latestRejectReason, now);
            return SpaceReviewConstants.STATUS_PENDING;
        }
        String finalStatus = resolveFinalStatus(counts);
        int resolved = submissionMapper.resolve(submission.getId(), space.getId(),
                SpaceReviewConstants.STATUS_PENDING, finalStatus, adminUserId, now,
                firstRejectReason(items), now);
        if (resolved == 0) {
            throw new BizException(ResponseCodeEnum.SPACE_REVIEW_NOT_PENDING);
        }
        return finalStatus;
    }

    /**
     * 仅当提交最终全部通过，且具备完整空间公开项时，才把空间 visibility 切换为公开。
     * 首次公开的部分通过、部分驳回都保持空间私密。
     */
    private boolean publishSpaceIfEligible(CoupleSpaceDO space, List<SpaceReviewItemDO> items,
                                           String finalStatus, LocalDateTime now) {
        if (!SpaceReviewConstants.STATUS_APPROVED.equals(finalStatus)) {
            return false;
        }
        boolean alreadyPublic = Objects.equals(space.getVisibility(), SPACE_VISIBILITY_PUBLIC);
        if (!alreadyPublic && !containsFullPublishItems(items)) {
            return false;
        }
        validateSpacePublishable(space);
        LocalDateTime firstPublicAt = space.getPublicAt() == null ? now : null;
        int published = coupleSpaceMapper.publishApproved(space.getId(), firstPublicAt, now);
        if (published == 0) {
            throw new BizException(ResponseCodeEnum.SPACE_STATUS_NOT_ALLOWED);
        }
        return true;
    }

    /**
     * 空间公开必须同时包含空间信息与主页配置；只有内容项的提交不足以公开整个空间。
     */
    private boolean containsFullPublishItems(List<SpaceReviewItemDO> items) {
        boolean hasSpace = false;
        boolean hasHomeConfig = false;
        for (SpaceReviewItemDO item : items) {
            if (!SpaceReviewConstants.ITEM_STATUS_APPROVED.equals(item.getItemStatus())) {
                continue;
            }
            if (SpaceReviewConstants.ITEM_TYPE_SPACE.equals(item.getItemType())) {
                hasSpace = true;
            } else if (SpaceReviewConstants.ITEM_TYPE_HOME_CONFIG.equals(item.getItemType())) {
                hasHomeConfig = true;
            }
        }
        return hasSpace && hasHomeConfig;
    }

    private ItemCounts countItems(List<SpaceReviewItemDO> items) {
        ItemCounts counts = new ItemCounts();
        counts.total = items.size();
        for (SpaceReviewItemDO item : items) {
            String status = item.getItemStatus();
            if (SpaceReviewConstants.ITEM_STATUS_PENDING.equals(status)) {
                counts.pending++;
            } else if (SpaceReviewConstants.ITEM_STATUS_APPROVED.equals(status)) {
                counts.approved++;
            } else if (SpaceReviewConstants.ITEM_STATUS_REJECTED.equals(status)) {
                counts.rejected++;
            } else if (SpaceReviewConstants.ITEM_STATUS_WITHDRAWN.equals(status)) {
                counts.withdrawn++;
            }
        }
        return counts;
    }

    private String resolveFinalStatus(ItemCounts counts) {
        if (counts.pending > 0) {
            return SpaceReviewConstants.STATUS_PENDING;
        }
        if (counts.total > 0 && counts.approved == counts.total) {
            return SpaceReviewConstants.STATUS_APPROVED;
        }
        if (counts.approved == 0 && counts.rejected == 0) {
            return SpaceReviewConstants.STATUS_WITHDRAWN;
        }
        if (counts.approved == 0) {
            return SpaceReviewConstants.STATUS_REJECTED;
        }
        return SpaceReviewConstants.STATUS_PARTIALLY_APPROVED;
    }

    private String firstRejectReason(List<SpaceReviewItemDO> items) {
        for (SpaceReviewItemDO item : items) {
            if (SpaceReviewConstants.ITEM_STATUS_REJECTED.equals(item.getItemStatus())
                    && StrUtil.isNotBlank(item.getRejectReason())) {
                return StrUtil.maxLength(StrUtil.trim(item.getRejectReason()), 500);
            }
        }
        return "";
    }

    private String normalizeItemType(String rawItemType) {
        String itemType = StrUtil.trimToNull(rawItemType);
        if (itemType == null) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        String normalized = itemType.toUpperCase(Locale.ROOT);
        boolean supported = SpaceReviewConstants.isContentItemType(normalized)
                || SpaceReviewConstants.ITEM_TYPE_SPACE.equals(normalized)
                || SpaceReviewConstants.ITEM_TYPE_HOME_CONFIG.equals(normalized);
        if (!supported) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        return normalized;
    }

    private static final class ItemCounts {
        private int total;
        private int pending;
        private int approved;
        private int rejected;
        private int withdrawn;
    }

    private void upsertPublished(SpaceReviewItemDO item, LocalDateTime now) {
        SpacePublishedItemDO existing = publishedItemMapper.selectBySpaceAndItem(
                item.getSpaceId(), item.getItemType(), item.getItemId());
        if (existing == null) {
            publishedItemMapper.insert(SpacePublishedItemDO.builder()
                    .spaceId(item.getSpaceId())
                    .itemType(item.getItemType())
                    .itemId(item.getItemId())
                    .revision(item.getBaseRevision())
                    .snapshotJson(item.getSnapshotJson())
                    .publishStatus(SpaceReviewConstants.PUBLISHED)
                    .publishedAt(now)
                    .createTime(now)
                    .updateTime(now)
                    .build());
            return;
        }
        existing.setRevision(item.getBaseRevision());
        existing.setSnapshotJson(item.getSnapshotJson());
        existing.setPublishStatus(SpaceReviewConstants.PUBLISHED);
        existing.setPublishedAt(now);
        existing.setUnpublishedAt(null);
        existing.setUnpublishReason("");
        existing.setUpdateTime(now);
        publishedItemMapper.updateById(existing);
    }

    private void closeEmptyPendingSubmission(Long spaceId, LocalDateTime now) {
        SpaceReviewSubmissionDO pending = submissionMapper.selectPendingBySpaceId(spaceId);
        if (pending == null) {
            return;
        }
        List<SpaceReviewItemDO> items = itemMapper.selectBySubmissionId(pending.getId());
        ItemCounts counts = countItems(items);
        if (counts.pending > 0) {
            return;
        }
        String finalStatus = resolveFinalStatus(counts);
        submissionMapper.resolve(pending.getId(), spaceId,
                SpaceReviewConstants.STATUS_PENDING, finalStatus,
                StpUtil.getLoginIdAsLong(), now, firstRejectReason(items), now);
    }

    private void validateSpacePublishable(CoupleSpaceDO space) {
        if (!Objects.equals(space.getStatus(), SPACE_STATUS_NORMAL)) {
            throw new BizException(ResponseCodeEnum.SPACE_STATUS_NOT_ALLOWED);
        }
        Long activeMembers = coupleMemberMapper.countActiveBySpaceId(space.getId());
        if (activeMembers == null || activeMembers < MEMBER_LIMIT) {
            throw new BizException(ResponseCodeEnum.SPACE_NOT_TWO_MEMBERS);
        }
    }

    /* -------------------- 详情组装 -------------------- */

    private List<AdminSpaceReviewDetailRspVO.ItemVO> loadPublishedItemVOs(CoupleSpaceDO space) {
        List<SpacePublishedItemDO> published = publishedItemMapper.selectPublishedBySpaceId(space.getId());
        if (CollUtil.isNotEmpty(published)) {
            List<AdminSpaceReviewDetailRspVO.ItemVO> result = new ArrayList<>();
            for (SpacePublishedItemDO item : published) {
                result.add(toPublishedItemVO(item));
            }
            return result;
        }
        // 历史公开空间尚未生成快照：按当前公开数据展示「当前已发布版本」。
        if (!Objects.equals(space.getVisibility(), SPACE_VISIBILITY_PUBLIC)) {
            return Collections.emptyList();
        }
        List<AdminSpaceReviewDetailRspVO.ItemVO> result = new ArrayList<>();
        result.add(liveSpaceItem(space));
        result.add(liveHomeConfigItem(space));
        for (StoryNodeDO story : storyNodeMapper.selectPublicList(space.getId())) {
            result.add(liveStoryItem(space.getId(), story));
        }
        for (PhotoDO photo : photoMapper.selectPublicList(space.getId())) {
            result.add(livePhotoItem(photo));
        }
        for (AnniversaryDO anniversary : anniversaryMapper.selectPublicList(space.getId())) {
            result.add(liveAnniversaryItem(anniversary));
        }
        return result;
    }

    private AdminSpaceReviewDetailRspVO.ItemVO toPublishedItemVO(SpacePublishedItemDO item) {
        String title = resolveSnapshotTitle(item.getItemType(), item.getSnapshotJson());
        return AdminSpaceReviewDetailRspVO.ItemVO.builder()
                .itemType(item.getItemType())
                .itemTypeText(SpaceReviewConstants.itemTypeText(item.getItemType()))
                .itemId(item.getItemId())
                .itemStatus("PUBLISHED")
                .itemStatusText("已发布")
                .baseRevision(item.getRevision())
                .currentRevision(item.getRevision())
                .title(title)
                .changedFields(Collections.emptyList())
                .beforeImages(Collections.emptyList())
                .afterImages(imagesOf(item.getItemType(), item.getSnapshotJson()))
                .afterSummary(summaryOf(item.getItemType(), item.getSnapshotJson()))
                .build();
    }

    private AdminSpaceReviewDetailRspVO.ItemVO toItemVO(SpaceReviewItemDO item,
                                                         SpacePublishedItemDO published) {
        String itemType = item.getItemType();
        String beforeJson = published == null ? null : published.getSnapshotJson();
        List<AdminSpaceReviewDetailRspVO.DiffFieldVO> diffs =
                buildDiffs(itemType, beforeJson, item.getSnapshotJson());
        return AdminSpaceReviewDetailRspVO.ItemVO.builder()
                .itemType(itemType)
                .itemTypeText(SpaceReviewConstants.itemTypeText(itemType))
                .itemId(item.getItemId())
                .action(item.getAction())
                .actionText(SpaceReviewConstants.actionText(item.getAction()))
                .itemStatus(item.getItemStatus())
                .itemStatusText(SpaceReviewConstants.itemStatusText(item.getItemStatus()))
                .rejectReason(StrUtil.nullToEmpty(item.getRejectReason()))
                .handledBy(item.getHandledBy())
                .handledAt(format(item.getHandledAt()))
                .baseRevision(item.getBaseRevision())
                .currentRevision(currentRevision(item.getSpaceId(), itemType, item.getItemId()))
                .title(resolveSnapshotTitle(itemType, item.getSnapshotJson()))
                .changedFields(diffs)
                .beforeImages(imagesOf(itemType, beforeJson))
                .afterImages(imagesOf(itemType, item.getSnapshotJson()))
                .beforeSummary(summaryOf(itemType, beforeJson))
                .afterSummary(summaryOf(itemType, item.getSnapshotJson()))
                .build();
    }

    private List<AdminSpaceReviewDetailRspVO.DiffFieldVO> buildDiffs(String itemType,
                                                                     String beforeJson,
                                                                     String afterJson) {
        List<AdminSpaceReviewDetailRspVO.DiffFieldVO> diffs = new ArrayList<>();
        if (SpaceReviewConstants.ITEM_TYPE_SPACE.equals(itemType)) {
            SpacePublicSnapshot before = JsonUtil.parseObject(beforeJson, SpacePublicSnapshot.class);
            SpacePublicSnapshot after = JsonUtil.parseObject(afterJson, SpacePublicSnapshot.class);
            addDiff(diffs, "空间名称", before == null ? null : before.getSpaceName(),
                    after == null ? null : after.getSpaceName());
            addDiff(diffs, "空间简介", before == null ? null : before.getDescription(),
                    after == null ? null : after.getDescription());
            addDiff(diffs, "空间封面", before == null ? null : before.getCoverImage(),
                    after == null ? null : after.getCoverImage());
            addDiff(diffs, "恋爱开始时间", before == null ? null : before.getLoveStartTime(),
                    after == null ? null : after.getLoveStartTime());
            return diffs;
        }
        if (SpaceReviewConstants.ITEM_TYPE_HOME_CONFIG.equals(itemType)) {
            HomeConfigPublicSnapshot before = JsonUtil.parseObject(beforeJson, HomeConfigPublicSnapshot.class);
            HomeConfigPublicSnapshot after = JsonUtil.parseObject(afterJson, HomeConfigPublicSnapshot.class);
            for (Map.Entry<String, String> entry : HOME_CONFIG_LABELS.entrySet()) {
                String key = entry.getKey();
                addDiff(diffs, entry.getValue(),
                        before == null || before.getConfigs() == null ? null : before.getConfigs().get(key),
                        after == null || after.getConfigs() == null ? null : after.getConfigs().get(key));
            }
            return diffs;
        }
        if (SpaceReviewConstants.ITEM_TYPE_STORY.equals(itemType)) {
            StoryPublicSnapshot before = JsonUtil.parseObject(beforeJson, StoryPublicSnapshot.class);
            StoryPublicSnapshot after = JsonUtil.parseObject(afterJson, StoryPublicSnapshot.class);
            addDiff(diffs, "标题", before == null ? null : before.getTitle(),
                    after == null ? null : after.getTitle());
            addDiff(diffs, "摘要", before == null ? null : before.getSummary(),
                    after == null ? null : after.getSummary());
            addDiff(diffs, "正文", truncate(before == null ? null : before.getContent()),
                    truncate(after == null ? null : after.getContent()));
            addDiff(diffs, "发生时间", before == null ? null : before.getHappenedTime(),
                    after == null ? null : after.getHappenedTime());
            addDiff(diffs, "地点", before == null ? null : before.getLocation(),
                    after == null ? null : after.getLocation());
            addDiff(diffs, "封面", before == null ? null : before.getCoverImage(),
                    after == null ? null : after.getCoverImage());
            addDiff(diffs, "标签", before == null ? null : before.getTagLabel(),
                    after == null ? null : after.getTagLabel());
            addDiff(diffs, "排序", before == null ? null : String.valueOf(before.getSortOrder()),
                    after == null ? null : String.valueOf(after.getSortOrder()));
            return diffs;
        }
        if (SpaceReviewConstants.ITEM_TYPE_PHOTO.equals(itemType)) {
            PhotoPublicSnapshot before = JsonUtil.parseObject(beforeJson, PhotoPublicSnapshot.class);
            PhotoPublicSnapshot after = JsonUtil.parseObject(afterJson, PhotoPublicSnapshot.class);
            addDiff(diffs, "标题", before == null ? null : before.getTitle(),
                    after == null ? null : after.getTitle());
            addDiff(diffs, "描述", before == null ? null : before.getDescription(),
                    after == null ? null : after.getDescription());
            addDiff(diffs, "照片", before == null ? null : before.getUrl(),
                    after == null ? null : after.getUrl());
            addDiff(diffs, "拍摄时间", before == null ? null : before.getTakenTime(),
                    after == null ? null : after.getTakenTime());
            addDiff(diffs, "地点", before == null ? null : before.getLocation(),
                    after == null ? null : after.getLocation());
            addDiff(diffs, "排序", before == null ? null : String.valueOf(before.getSortOrder()),
                    after == null ? null : String.valueOf(after.getSortOrder()));
            return diffs;
        }
        if (SpaceReviewConstants.ITEM_TYPE_ANNIVERSARY.equals(itemType)) {
            AnniversaryPublicSnapshot before = JsonUtil.parseObject(beforeJson, AnniversaryPublicSnapshot.class);
            AnniversaryPublicSnapshot after = JsonUtil.parseObject(afterJson, AnniversaryPublicSnapshot.class);
            addDiff(diffs, "名称", before == null ? null : before.getTitle(),
                    after == null ? null : after.getTitle());
            addDiff(diffs, "描述", before == null ? null : before.getDescription(),
                    after == null ? null : after.getDescription());
            addDiff(diffs, "日期", before == null ? null : before.getAnniversaryDate(),
                    after == null ? null : after.getAnniversaryDate());
            addDiff(diffs, "分类", before == null ? null : before.getCategory(),
                    after == null ? null : after.getCategory());
            addDiff(diffs, "地点", before == null ? null : before.getLocation(),
                    after == null ? null : after.getLocation());
            return diffs;
        }
        return diffs;
    }

    private void addDiff(List<AdminSpaceReviewDetailRspVO.DiffFieldVO> diffs, String label,
                         String before, String after) {
        String normalizedBefore = StrUtil.nullToEmpty(before);
        String normalizedAfter = StrUtil.nullToEmpty(after);
        if (Objects.equals(normalizedBefore, normalizedAfter)) {
            return;
        }
        diffs.add(AdminSpaceReviewDetailRspVO.DiffFieldVO.builder()
                .label(label)
                .before(normalizedBefore)
                .after(normalizedAfter)
                .build());
    }

    private List<String> imagesOf(String itemType, String snapshotJson) {
        List<String> images = new ArrayList<>();
        if (StrUtil.isBlank(snapshotJson)) {
            return images;
        }
        if (SpaceReviewConstants.ITEM_TYPE_STORY.equals(itemType)) {
            StoryPublicSnapshot story = JsonUtil.parseObject(snapshotJson, StoryPublicSnapshot.class);
            if (story == null) {
                return images;
            }
            addImage(images, story.getCoverImage());
            if (CollUtil.isNotEmpty(story.getImages())) {
                for (StoryPublicSnapshot.ImagePublicSnapshot image : story.getImages()) {
                    addImage(images, image.getUrl());
                }
            }
            return images;
        }
        if (SpaceReviewConstants.ITEM_TYPE_PHOTO.equals(itemType)) {
            PhotoPublicSnapshot photo = JsonUtil.parseObject(snapshotJson, PhotoPublicSnapshot.class);
            addImage(images, photo == null ? null : photo.getUrl());
            return images;
        }
        if (SpaceReviewConstants.ITEM_TYPE_SPACE.equals(itemType)) {
            SpacePublicSnapshot space = JsonUtil.parseObject(snapshotJson, SpacePublicSnapshot.class);
            addImage(images, space == null ? null : space.getCoverImage());
            return images;
        }
        if (SpaceReviewConstants.ITEM_TYPE_HOME_CONFIG.equals(itemType)) {
            HomeConfigPublicSnapshot config = JsonUtil.parseObject(snapshotJson, HomeConfigPublicSnapshot.class);
            if (config != null && config.getConfigs() != null) {
                addImage(images, config.getConfigs().get("boy_avatar"));
                addImage(images, config.getConfigs().get("girl_avatar"));
                addImage(images, config.getConfigs().get("home.hero_photo_1"));
                addImage(images, config.getConfigs().get("home.hero_photo_2"));
            }
        }
        return images;
    }

    private AdminSpaceReviewDetailRspVO.SummaryVO summaryOf(String itemType, String snapshotJson) {
        if (StrUtil.isBlank(snapshotJson)) {
            return null;
        }
        if (SpaceReviewConstants.ITEM_TYPE_STORY.equals(itemType)) {
            StoryPublicSnapshot story = JsonUtil.parseObject(snapshotJson, StoryPublicSnapshot.class);
            if (story == null) {
                return null;
            }
            return AdminSpaceReviewDetailRspVO.SummaryVO.builder()
                    .title(story.getTitle())
                    .subtitle(StrUtil.maxLength(StrUtil.nullToEmpty(story.getSummary()), 80))
                    .coverImage(story.getCoverImage())
                    .build();
        }
        if (SpaceReviewConstants.ITEM_TYPE_PHOTO.equals(itemType)) {
            PhotoPublicSnapshot photo = JsonUtil.parseObject(snapshotJson, PhotoPublicSnapshot.class);
            if (photo == null) {
                return null;
            }
            return AdminSpaceReviewDetailRspVO.SummaryVO.builder()
                    .title(photo.getTitle())
                    .subtitle(StrUtil.maxLength(StrUtil.nullToEmpty(photo.getDescription()), 80))
                    .coverImage(photo.getUrl())
                    .build();
        }
        if (SpaceReviewConstants.ITEM_TYPE_ANNIVERSARY.equals(itemType)) {
            AnniversaryPublicSnapshot anniversary = JsonUtil.parseObject(
                    snapshotJson, AnniversaryPublicSnapshot.class);
            if (anniversary == null) {
                return null;
            }
            return AdminSpaceReviewDetailRspVO.SummaryVO.builder()
                    .title(anniversary.getTitle())
                    .subtitle(anniversary.getAnniversaryDate())
                    .build();
        }
        if (SpaceReviewConstants.ITEM_TYPE_SPACE.equals(itemType)) {
            SpacePublicSnapshot space = JsonUtil.parseObject(snapshotJson, SpacePublicSnapshot.class);
            if (space == null) {
                return null;
            }
            return AdminSpaceReviewDetailRspVO.SummaryVO.builder()
                    .title(space.getSpaceName())
                    .subtitle(StrUtil.maxLength(StrUtil.nullToEmpty(space.getDescription()), 80))
                    .coverImage(space.getCoverImage())
                    .build();
        }
        return null;
    }

    private String resolveSnapshotTitle(String itemType, String snapshotJson) {
        AdminSpaceReviewDetailRspVO.SummaryVO summary = summaryOf(itemType, snapshotJson);
        if (summary != null && StrUtil.isNotBlank(summary.getTitle())) {
            return summary.getTitle();
        }
        return SpaceReviewConstants.itemTypeText(itemType);
    }

    private AdminSpaceReviewDetailRspVO.ItemVO liveSpaceItem(CoupleSpaceDO space) {
        return AdminSpaceReviewDetailRspVO.ItemVO.builder()
                .itemType(SpaceReviewConstants.ITEM_TYPE_SPACE)
                .itemTypeText(SpaceReviewConstants.itemTypeText(SpaceReviewConstants.ITEM_TYPE_SPACE))
                .itemId(SpaceReviewConstants.SINGLE_ITEM_ID)
                .itemStatus("PUBLISHED")
                .itemStatusText("已发布")
                .baseRevision(revisionOf(space))
                .currentRevision(revisionOf(space))
                .title(space.getSpaceName())
                .changedFields(Collections.emptyList())
                .beforeImages(Collections.emptyList())
                .afterImages(Collections.singletonList(StrUtil.nullToEmpty(space.getCoverImage())))
                .afterSummary(AdminSpaceReviewDetailRspVO.SummaryVO.builder()
                        .title(space.getSpaceName())
                        .subtitle(StrUtil.maxLength(StrUtil.nullToEmpty(space.getDescription()), 80))
                        .coverImage(space.getCoverImage())
                        .build())
                .build();
    }

    private AdminSpaceReviewDetailRspVO.ItemVO liveHomeConfigItem(CoupleSpaceDO space) {
        return AdminSpaceReviewDetailRspVO.ItemVO.builder()
                .itemType(SpaceReviewConstants.ITEM_TYPE_HOME_CONFIG)
                .itemTypeText(SpaceReviewConstants.itemTypeText(SpaceReviewConstants.ITEM_TYPE_HOME_CONFIG))
                .itemId(SpaceReviewConstants.SINGLE_ITEM_ID)
                .itemStatus("PUBLISHED")
                .itemStatusText("已发布")
                .baseRevision(revisionOf(space))
                .currentRevision(revisionOf(space))
                .title("主页配置")
                .changedFields(Collections.emptyList())
                .beforeImages(Collections.emptyList())
                .afterImages(Collections.emptyList())
                .build();
    }

    private AdminSpaceReviewDetailRspVO.ItemVO liveStoryItem(Long spaceId, StoryNodeDO story) {
        List<StoryNodeImageDO> images = storyNodeImageMapper.selectByNodeIds(
                spaceId, Collections.singletonList(story.getId()));
        List<String> imageUrls = new ArrayList<>();
        addImage(imageUrls, story.getCoverImage());
        if (CollUtil.isNotEmpty(images)) {
            for (StoryNodeImageDO image : images) {
                addImage(imageUrls, image.getUrl());
            }
        }
        return AdminSpaceReviewDetailRspVO.ItemVO.builder()
                .itemType(SpaceReviewConstants.ITEM_TYPE_STORY)
                .itemTypeText(SpaceReviewConstants.itemTypeText(SpaceReviewConstants.ITEM_TYPE_STORY))
                .itemId(story.getId())
                .itemStatus("PUBLISHED")
                .itemStatusText("已发布")
                .baseRevision(revisionOf(story))
                .currentRevision(revisionOf(story))
                .title(story.getTitle())
                .changedFields(Collections.emptyList())
                .beforeImages(Collections.emptyList())
                .afterImages(imageUrls)
                .afterSummary(AdminSpaceReviewDetailRspVO.SummaryVO.builder()
                        .title(story.getTitle())
                        .subtitle(StrUtil.maxLength(StrUtil.nullToEmpty(story.getSummary()), 80))
                        .coverImage(story.getCoverImage())
                        .build())
                .build();
    }

    private AdminSpaceReviewDetailRspVO.ItemVO livePhotoItem(PhotoDO photo) {
        return AdminSpaceReviewDetailRspVO.ItemVO.builder()
                .itemType(SpaceReviewConstants.ITEM_TYPE_PHOTO)
                .itemTypeText(SpaceReviewConstants.itemTypeText(SpaceReviewConstants.ITEM_TYPE_PHOTO))
                .itemId(photo.getId())
                .itemStatus("PUBLISHED")
                .itemStatusText("已发布")
                .baseRevision(revisionOf(photo))
                .currentRevision(revisionOf(photo))
                .title(photo.getTitle())
                .changedFields(Collections.emptyList())
                .beforeImages(Collections.emptyList())
                .afterImages(Collections.singletonList(StrUtil.nullToEmpty(photo.getUrl())))
                .afterSummary(AdminSpaceReviewDetailRspVO.SummaryVO.builder()
                        .title(photo.getTitle())
                        .subtitle(StrUtil.maxLength(StrUtil.nullToEmpty(photo.getDescription()), 80))
                        .coverImage(photo.getUrl())
                        .build())
                .build();
    }

    private AdminSpaceReviewDetailRspVO.ItemVO liveAnniversaryItem(AnniversaryDO anniversary) {
        return AdminSpaceReviewDetailRspVO.ItemVO.builder()
                .itemType(SpaceReviewConstants.ITEM_TYPE_ANNIVERSARY)
                .itemTypeText(SpaceReviewConstants.itemTypeText(SpaceReviewConstants.ITEM_TYPE_ANNIVERSARY))
                .itemId(anniversary.getId())
                .itemStatus("PUBLISHED")
                .itemStatusText("已发布")
                .baseRevision(revisionOf(anniversary))
                .currentRevision(revisionOf(anniversary))
                .title(anniversary.getTitle())
                .changedFields(Collections.emptyList())
                .beforeImages(Collections.emptyList())
                .afterImages(Collections.emptyList())
                .afterSummary(AdminSpaceReviewDetailRspVO.SummaryVO.builder()
                        .title(anniversary.getTitle())
                        .subtitle(anniversary.getAnniversaryDate() == null
                                ? "" : anniversary.getAnniversaryDate().format(DATE_FORMATTER))
                        .build())
                .build();
    }

    /* -------------------- 通用辅助 -------------------- */

    private SpaceReviewSubmissionDO requireSubmission(Long submissionId) {
        SpaceReviewSubmissionDO submission = submissionMapper.selectById(submissionId);
        if (submission == null) {
            throw new BizException(ResponseCodeEnum.SPACE_REVIEW_NOT_EXIST);
        }
        return submission;
    }

    private void requirePending(SpaceReviewSubmissionDO submission) {
        if (!SpaceReviewConstants.STATUS_PENDING.equals(submission.getStatus())) {
            throw new BizException(ResponseCodeEnum.SPACE_REVIEW_NOT_PENDING);
        }
    }

    private CoupleSpaceDO requireSpace(Long spaceId) {
        CoupleSpaceDO space = coupleSpaceMapper.findById(spaceId);
        if (space == null) {
            throw new BizException(ResponseCodeEnum.SPACE_NOT_EXIST);
        }
        return space;
    }

    private String normalizeStatus(String status) {
        String trimmed = StrUtil.trimToNull(status);
        if (trimmed != null && !SpaceReviewConstants.isSubmissionStatus(trimmed)) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        return trimmed;
    }

    private String normalizeReviewType(String reviewType) {
        String trimmed = StrUtil.trimToNull(reviewType);
        if (trimmed != null && !SpaceReviewConstants.isReviewType(trimmed)) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        return trimmed;
    }

    private Long resolveSubmittedBy(String amourId) {
        String trimmed = StrUtil.trimToNull(amourId);
        if (trimmed == null) {
            return null;
        }
        UserDO user = userMapper.selectByAmourId(trimmed);
        return user == null ? null : user.getId();
    }

    private Map<Long, CoupleSpaceDO> loadSpaces(Set<Long> spaceIds) {
        if (CollUtil.isEmpty(spaceIds)) {
            return Collections.emptyMap();
        }
        return coupleSpaceMapper.selectBatchIds(spaceIds).stream()
                .collect(Collectors.toMap(CoupleSpaceDO::getId, item -> item, (left, right) -> left));
    }

    private Map<Long, List<CoupleMemberDO>> loadMemberMap(Set<Long> spaceIds) {
        if (CollUtil.isEmpty(spaceIds)) {
            return Collections.emptyMap();
        }
        List<CoupleMemberDO> members = coupleMemberMapper.selectActiveBySpaceIds(spaceIds);
        if (CollUtil.isEmpty(members)) {
            return Collections.emptyMap();
        }
        return members.stream()
                .filter(member -> member.getSpaceId() != null)
                .collect(Collectors.groupingBy(CoupleMemberDO::getSpaceId));
    }

    private Map<Long, UserDO> loadUsers(Set<Long> userIds) {
        if (CollUtil.isEmpty(userIds)) {
            return Collections.emptyMap();
        }
        List<UserDO> users = userMapper.findUsersByIds(userIds);
        if (CollUtil.isEmpty(users)) {
            return Collections.emptyMap();
        }
        return users.stream().collect(Collectors.toMap(UserDO::getId, item -> item, (left, right) -> left));
    }

    private void addId(Set<Long> ids, Long id) {
        if (id != null) {
            ids.add(id);
        }
    }

    private void addImage(List<String> images, String url) {
        if (StrUtil.isNotBlank(url)) {
            images.add(url.trim());
        }
    }

    private String truncate(String value) {
        if (value == null) {
            return "";
        }
        return StrUtil.maxLength(value, DIFF_TEXT_LIMIT);
    }

    private int currentRevision(Long spaceId, String itemType, Long itemId) {
        if (SpaceReviewConstants.ITEM_TYPE_STORY.equals(itemType)) {
            return revisionOf(storyNodeMapper.selectActiveById(spaceId, itemId));
        }
        if (SpaceReviewConstants.ITEM_TYPE_PHOTO.equals(itemType)) {
            return revisionOf(photoMapper.findActiveById(spaceId, itemId));
        }
        if (SpaceReviewConstants.ITEM_TYPE_ANNIVERSARY.equals(itemType)) {
            return revisionOf(anniversaryMapper.selectActiveById(spaceId, itemId));
        }
        CoupleSpaceDO space = coupleSpaceMapper.findById(spaceId);
        return revisionOf(space);
    }

    private long countPublished(List<AdminSpaceReviewDetailRspVO.ItemVO> items, String itemType) {
        return items.stream().filter(item -> itemType.equals(item.getItemType())).count();
    }

    private String itemKey(String itemType, Long itemId) {
        return itemType + ":" + (itemId == null ? SpaceReviewConstants.SINGLE_ITEM_ID : itemId);
    }

    /**
     * 把审核项类型转换为内容治理使用的 contentType；空间/主页配置没有对应内容类型。
     */
    private String auditContentType(String itemType) {
        if (SpaceReviewConstants.ITEM_TYPE_STORY.equals(itemType)) {
            return ContentGovernanceConstants.TYPE_STORY;
        }
        if (SpaceReviewConstants.ITEM_TYPE_PHOTO.equals(itemType)) {
            return ContentGovernanceConstants.TYPE_PHOTO;
        }
        if (SpaceReviewConstants.ITEM_TYPE_ANNIVERSARY.equals(itemType)) {
            return ContentGovernanceConstants.TYPE_ANNIVERSARY;
        }
        return null;
    }

    private String toItemType(String contentType) {
        if (ContentGovernanceConstants.TYPE_STORY.equalsIgnoreCase(contentType)) {
            return SpaceReviewConstants.ITEM_TYPE_STORY;
        }
        if (ContentGovernanceConstants.TYPE_PHOTO.equalsIgnoreCase(contentType)) {
            return SpaceReviewConstants.ITEM_TYPE_PHOTO;
        }
        return SpaceReviewConstants.ITEM_TYPE_ANNIVERSARY;
    }

    private int revisionOf(CoupleSpaceDO space) {
        return space == null || space.getRevision() == null ? 0 : space.getRevision();
    }

    private int revisionOf(StoryNodeDO story) {
        return story == null || story.getRevision() == null ? 0 : story.getRevision();
    }

    private int revisionOf(PhotoDO photo) {
        return photo == null || photo.getRevision() == null ? 0 : photo.getRevision();
    }

    private int revisionOf(AnniversaryDO anniversary) {
        return anniversary == null || anniversary.getRevision() == null ? 0 : anniversary.getRevision();
    }

    private String userName(UserDO user) {
        return user == null ? "恋人" : StrUtil.blankToDefault(user.getDisplayName(), "恋人");
    }

    private String memberRoleText(Integer memberRole) {
        return Objects.equals(memberRole, 1) ? "空间发起人" : "另一半";
    }

    private String spaceStatusText(Integer status) {
        if (status == null) {
            return "";
        }
        switch (status) {
            case 0:
                return "等待绑定";
            case 1:
                return "正常";
            case 2:
                return "已冻结";
            case 3:
                return "已归档";
            case 4:
                return "删除等待期";
            case 5:
                return "已解绑";
            default:
                return "未知状态";
        }
    }

    private String visibilityText(Integer visibility) {
        return Objects.equals(visibility, SPACE_VISIBILITY_PUBLIC) ? "公开中" : "私密";
    }

    private String format(LocalDateTime value) {
        return value == null ? "" : value.format(FORMATTER);
    }

    private void recordAudit(String action, Long spaceId, Long reviewId, String contentType,
                             Long contentId, String reason, String detail) {
        adminAuditService.record(AdminAuditLogDO.builder()
                .adminUserId(StpUtil.getLoginIdAsLong())
                .action(action)
                .targetType(AdminAuditConstants.TARGET_SPACE)
                .targetSpaceId(spaceId)
                .targetReviewId(reviewId)
                .targetContentType(contentType)
                .targetContentId(contentId)
                .reason(reason)
                .result(AdminAuditConstants.RESULT_SUCCESS)
                .detail(detail)
                .createTime(LocalDateTime.now())
                .build());
    }
}
