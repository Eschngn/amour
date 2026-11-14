package com.chengliuxiang.amour.web.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.chengliuxiang.amour.common.constant.SpaceReviewConstants;
import com.chengliuxiang.amour.common.domain.dos.AnniversaryDO;
import com.chengliuxiang.amour.common.domain.dos.CoupleSpaceConfigDO;
import com.chengliuxiang.amour.common.domain.dos.CoupleSpaceDO;
import com.chengliuxiang.amour.common.domain.dos.PhotoCategoryDO;
import com.chengliuxiang.amour.common.domain.dos.PhotoDO;
import com.chengliuxiang.amour.common.domain.dos.SpacePublishedItemDO;
import com.chengliuxiang.amour.common.domain.dos.SpaceReviewItemDO;
import com.chengliuxiang.amour.common.domain.dos.SpaceReviewSubmissionDO;
import com.chengliuxiang.amour.common.domain.dos.StoryChapterDO;
import com.chengliuxiang.amour.common.domain.dos.StoryNodeDO;
import com.chengliuxiang.amour.common.domain.dos.StoryNodeImageDO;
import com.chengliuxiang.amour.common.domain.mapper.AnniversaryMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleMemberMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleSpaceConfigMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleSpaceMapper;
import com.chengliuxiang.amour.common.domain.mapper.PhotoCategoryMapper;
import com.chengliuxiang.amour.common.domain.mapper.PhotoMapper;
import com.chengliuxiang.amour.common.domain.mapper.SpacePublishedItemMapper;
import com.chengliuxiang.amour.common.domain.mapper.SpaceReviewItemMapper;
import com.chengliuxiang.amour.common.domain.mapper.SpaceReviewSubmissionMapper;
import com.chengliuxiang.amour.common.domain.mapper.StoryChapterMapper;
import com.chengliuxiang.amour.common.domain.mapper.StoryNodeImageMapper;
import com.chengliuxiang.amour.common.domain.mapper.StoryNodeMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.model.snapshot.AnniversaryPublicSnapshot;
import com.chengliuxiang.amour.common.model.snapshot.HomeConfigPublicSnapshot;
import com.chengliuxiang.amour.common.model.snapshot.PhotoPublicSnapshot;
import com.chengliuxiang.amour.common.model.snapshot.SpacePublicSnapshot;
import com.chengliuxiang.amour.common.model.snapshot.StoryPublicSnapshot;
import com.chengliuxiang.amour.common.utils.JsonUtil;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.space.SpaceContentSaveResultVO;
import com.chengliuxiang.amour.web.model.vo.space.SpaceItemReviewStateVO;
import com.chengliuxiang.amour.web.model.vo.space.SpaceReviewStatusVO;
import com.chengliuxiang.amour.web.service.SpaceContentAccessService;
import com.chengliuxiang.amour.web.service.SpaceReviewService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * 情侣空间公开审核实现。
 *
 * <p>工作数据（couple_space / story_node / photo / anniversary / couple_space_config）
 * 由成员直接编辑；恋爱广场只读取 space_published_item 中审核通过的快照。
 * 因此审核期间用户看到的保存结果与广场展示可以同时成立，不会出现
 * 「保存成功但页面没有变化」的困惑。</p>
 */
@Service
@Slf4j
public class SpaceReviewServiceImpl implements SpaceReviewService {

    private static final int SPACE_STATUS_NORMAL = 1;
    private static final int SPACE_VISIBILITY_PUBLIC = 1;
    private static final int MEMBER_STATUS_ACTIVE = 1;
    private static final int MEMBER_LIMIT = 2;
    private static final int VISIBILITY_PUBLIC = 1;

    private static final DateTimeFormatter DATE_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private static final List<String> HOME_CONFIG_KEYS = Collections.unmodifiableList(Arrays.asList(
            "boy_name", "girl_name", "boy_avatar", "girl_avatar",
            "home.hero_photo_1", "home.hero_photo_2"));

    @Resource
    private SpaceContentAccessService spaceContentAccessService;
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
    private CoupleSpaceConfigMapper coupleSpaceConfigMapper;
    @Resource
    private StoryNodeMapper storyNodeMapper;
    @Resource
    private StoryChapterMapper storyChapterMapper;
    @Resource
    private StoryNodeImageMapper storyNodeImageMapper;
    @Resource
    private PhotoMapper photoMapper;
    @Resource
    private PhotoCategoryMapper photoCategoryMapper;
    @Resource
    private AnniversaryMapper anniversaryMapper;

    @Override
    public Response<SpaceReviewStatusVO> getStatus() {
        SpaceContentAccessService.SpaceAccess access = spaceContentAccessService.requireReadable();
        return Response.success(getStatusForSpace(access.getSpace().getId()));
    }

    @Override
    public SpaceReviewStatusVO getStatusForSpace(Long spaceId) {
        CoupleSpaceDO space = requireSpace(spaceId);

        SpaceReviewSubmissionDO pending = submissionMapper.selectPendingBySpaceId(spaceId);
        List<SpaceReviewItemDO> pendingItems = pending == null
                ? Collections.emptyList() : itemMapper.selectBySubmissionId(pending.getId());
        SpaceReviewSubmissionDO latestHandled = findLatestHandled(spaceId);
        SpaceReviewSubmissionDO activeSubmission = pending == null ? latestHandled : pending;
        List<SpaceReviewItemDO> activeItems = activeSubmission == null
                ? Collections.emptyList()
                : (pending == null ? itemMapper.selectBySubmissionId(activeSubmission.getId())
                : pendingItems);
        ItemStatusCounts itemCounts = countItemStatuses(activeItems);
        boolean activeHasRejected = activeItems.stream()
                .anyMatch(item -> SpaceReviewConstants.ITEM_STATUS_REJECTED.equals(item.getItemStatus()));
        List<SpaceReviewItemDO> rejectedSource = activeHasRejected || latestHandled == null
                ? activeItems : itemMapper.selectBySubmissionId(latestHandled.getId());
        String latestRejectReason = firstRejectReason(activeItems);
        if (StrUtil.isBlank(latestRejectReason) && latestHandled != null
                && (SpaceReviewConstants.STATUS_REJECTED.equals(latestHandled.getStatus())
                || SpaceReviewConstants.STATUS_PARTIALLY_APPROVED.equals(latestHandled.getStatus()))) {
            latestRejectReason = StrUtil.nullToEmpty(latestHandled.getRejectReason());
        }

        long activeMembers = zero(coupleMemberMapper.countActiveBySpaceId(spaceId));
        boolean canSubmit = Objects.equals(space.getStatus(), SPACE_STATUS_NORMAL)
                && activeMembers >= MEMBER_LIMIT
                && pending == null;
        String lastStatus = latestHandled == null ? null : latestHandled.getStatus();
        long publishedCount = publishedItemMapper.countBySpaceIdAndStatus(spaceId, SpaceReviewConstants.PUBLISHED);
        long unpublishedCount = publishedItemMapper.countBySpaceIdAndStatus(spaceId, SpaceReviewConstants.UNPUBLISHED);
        boolean unpublished = !Objects.equals(space.getVisibility(), SPACE_VISIBILITY_PUBLIC)
                && publishedCount == 0 && unpublishedCount > 0;
        boolean canResubmit = canSubmit
                && !Objects.equals(space.getVisibility(), SPACE_VISIBILITY_PUBLIC)
                && (SpaceReviewConstants.STATUS_REJECTED.equals(lastStatus)
                || SpaceReviewConstants.STATUS_PARTIALLY_APPROVED.equals(lastStatus)
                || SpaceReviewConstants.STATUS_WITHDRAWN.equals(lastStatus));

        return SpaceReviewStatusVO.builder()
                .spaceId(spaceId)
                .spaceCode(space.getSpaceCode())
                .spaceName(space.getSpaceName())
                .spaceStatus(space.getStatus())
                .spaceStatusText(spaceStatusText(space.getStatus()))
                .visibility(space.getVisibility())
                .visibilityText(visibilityText(space.getVisibility()))
                .publicAt(space.getPublicAt())
                .pending(pending != null)
                .submissionId(pending == null ? null : pending.getId())
                .reviewType(pending == null ? null : pending.getReviewType())
                .reviewTypeText(pending == null ? null
                        : SpaceReviewConstants.reviewTypeText(pending.getReviewType()))
                .itemCount(itemCounts.total)
                .pendingItemCount(itemCounts.pending)
                .approvedItemCount(itemCounts.approved)
                .rejectedItemCount(itemCounts.rejected)
                .withdrawnItemCount(itemCounts.withdrawn)
                .pendingContentItemCount((int) pendingItems.stream()
                        .filter(item -> SpaceReviewConstants.ITEM_STATUS_PENDING.equals(item.getItemStatus()))
                        .filter(item -> SpaceReviewConstants.isContentItemType(item.getItemType()))
                        .count())
                .rejectedItems(buildRejectedItems(rejectedSource))
                .lastReviewStatus(lastStatus)
                .lastReviewStatusText(lastStatus == null ? null : SpaceReviewConstants.statusText(lastStatus))
                .rejectReason(StrUtil.blankToDefault(latestRejectReason, null))
                .lastSubmittedAt(pending != null ? pending.getCreateTime()
                        : (latestHandled == null ? null : latestHandled.getCreateTime()))
                .lastHandledAt(latestHandled == null ? null : latestHandled.getHandledAt())
                .unpublished(unpublished)
                .canSubmit(canSubmit)
                .canResubmit(canResubmit)
                .message(resolveStatusMessage(space, pending, itemCounts, latestHandled, unpublished))
                .build();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<SpaceReviewStatusVO> resubmit() {
        SpaceContentAccessService.SpaceAccess access = spaceContentAccessService.requireEditable();
        Long spaceId = access.getSpaceId();
        CoupleSpaceDO space = requireSpace(spaceId);
        validatePublishable(space);

        // 已有待审核提交时不重复创建，直接返回当前状态，重复点击也不会产生重复审核项。
        if (submissionMapper.selectPendingBySpaceId(spaceId) != null) {
            return Response.success(getStatusForSpace(spaceId));
        }
        submitSpacePublish(spaceId, access.getUserId());
        return Response.success(getStatusForSpace(spaceId));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void prepareForPublicEdit(Long spaceId) {
        CoupleSpaceDO space = coupleSpaceMapper.findById(spaceId);
        if (space == null || !Objects.equals(space.getVisibility(), SPACE_VISIBILITY_PUBLIC)) {
            return;
        }
        if (publishedItemMapper.countBySpaceId(spaceId) > 0) {
            return;
        }
        // 历史公开空间在功能上线前已经公开展示：先把当前公开数据固化为已发布版本。
        LocalDateTime now = LocalDateTime.now();
        publishSnapshot(space, now);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void submitSpacePublish(Long spaceId, Long userId) {
        CoupleSpaceDO space = requireSpace(spaceId);
        validatePublishable(space);

        LocalDateTime now = LocalDateTime.now();
        boolean firstPublish = space.getPublicAt() == null;
        String reviewType = firstPublish
                ? SpaceReviewConstants.REVIEW_TYPE_FIRST_PUBLISH
                : SpaceReviewConstants.REVIEW_TYPE_REPUBLISH;

        SpaceReviewSubmissionDO pending = submissionMapper.selectPendingBySpaceId(spaceId);
        Long submissionId;
        if (pending == null) {
            SpaceReviewSubmissionDO submission = SpaceReviewSubmissionDO.builder()
                    .spaceId(spaceId)
                    .submittedBy(userId)
                    .status(SpaceReviewConstants.STATUS_PENDING)
                    .reviewType(reviewType)
                    .baseRevision(revisionOf(space))
                    .pendingFlag(1)
                    .changeSummary("申请公开空间与公开内容")
                    .createTime(now)
                    .updateTime(now)
                    .build();
            try {
                submissionMapper.insert(submission);
                submissionId = submission.getId();
            } catch (DataIntegrityViolationException exception) {
                // 唯一索引兜底：并发提交时复用已存在的待审核提交。
                SpaceReviewSubmissionDO existing = submissionMapper.selectPendingBySpaceId(spaceId);
                if (existing == null) {
                    throw new BizException(ResponseCodeEnum.SPACE_REVIEW_ALREADY_PENDING);
                }
                submissionId = existing.getId();
            }
        } else {
            submissionId = pending.getId();
            submissionMapper.touch(submissionId, spaceId, reviewType,
                    revisionOf(space), "申请公开空间与公开内容", now);
        }

        // 再次申请时以当前工作数据为准，整体重建待审核项，避免旧快照残留。
        itemMapper.deleteBySubmissionId(submissionId);
        int itemCount = insertFullSnapshotItems(submissionId, space, userId, now);
        submissionMapper.touch(submissionId, spaceId, reviewType, revisionOf(space),
                "申请公开空间及 " + itemCount + " 项内容", now);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void withdrawPending(Long spaceId, Long userId, String reason) {
        SpaceReviewSubmissionDO pending = submissionMapper.selectPendingBySpaceId(spaceId);
        if (pending == null) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        int resolved = submissionMapper.resolve(pending.getId(), spaceId,
                SpaceReviewConstants.STATUS_PENDING, SpaceReviewConstants.STATUS_WITHDRAWN,
                userId, now, StrUtil.nullToEmpty(reason), now);
        if (resolved > 0) {
            itemMapper.resolveBySubmissionId(pending.getId(), SpaceReviewConstants.ITEM_STATUS_WITHDRAWN, now);
        }
    }

    @Override
    public SpaceContentSaveResultVO onContentSaved(Long spaceId, Long userId, String itemType,
                                                   Long itemId, boolean deleted) {
        CoupleSpaceDO space = coupleSpaceMapper.findById(spaceId);
        if (space == null) {
            throw new BizException(ResponseCodeEnum.SPACE_NOT_EXIST);
        }
        SpacePublishedItemDO published = publishedItemMapper.selectBySpaceAndItem(spaceId, itemType, itemId);
        boolean currentlyPublished = published != null
                && Objects.equals(published.getPublishStatus(), SpaceReviewConstants.PUBLISHED);

        if (!Objects.equals(space.getVisibility(), SPACE_VISIBILITY_PUBLIC)) {
            int visibility = deleted ? 0 : resolveVisibility(spaceId, itemType, itemId);
            // 空间隐藏期间删除或取消公开内容，也要立即撤销已发布快照，
            // 避免重新公开后被删除的内容从旧快照中再次出现。
            if ((deleted || visibility != VISIBILITY_PUBLIC) && currentlyPublished) {
                publishedItemMapper.unpublishItem(spaceId, itemType, itemId,
                        deleted ? "用户删除内容" : "用户取消公开或隐藏", LocalDateTime.now());
            }
            removePendingItem(spaceId, itemType, itemId);
            return SpaceContentSaveResultVO.builder()
                    .id(itemId)
                    .published(false)
                    .reviewStatus(currentlyPublished && (deleted || visibility != VISIBILITY_PUBLIC)
                            ? SpaceReviewConstants.USER_STATE_UNPUBLISHED
                            : (currentlyPublished ? SpaceReviewConstants.USER_STATE_PUBLISHED : null))
                    .build();
        }

        int visibility = deleted ? 0 : resolveVisibility(spaceId, itemType, itemId);
        // 减少公开范围：隐藏、删除立即从广场移除，不需要审核。
        if (deleted || visibility != VISIBILITY_PUBLIC) {
            LocalDateTime now = LocalDateTime.now();
            if (currentlyPublished) {
                publishedItemMapper.unpublishItem(spaceId, itemType, itemId,
                        deleted ? "用户删除内容" : "用户取消公开或隐藏", now);
            }
            removePendingItem(spaceId, itemType, itemId);
            return SpaceContentSaveResultVO.builder()
                    .id(itemId)
                    .published(false)
                    .reviewStatus(currentlyPublished
                            ? SpaceReviewConstants.USER_STATE_UNPUBLISHED : null)
                    .reviewMessage(currentlyPublished ? "已从恋爱广场移除" : null)
                    .build();
        }

        String snapshotJson = buildContentSnapshot(spaceId, itemType, itemId);
        if (snapshotJson == null) {
            // 内容已不存在（例如并发删除），按移除处理，避免把失效快照送入审核。
            removePendingItem(spaceId, itemType, itemId);
            return SpaceContentSaveResultVO.builder()
                    .id(itemId)
                    .published(false)
                    .reviewStatus(currentlyPublished
                            ? SpaceReviewConstants.USER_STATE_UNPUBLISHED : null)
                    .build();
        }
        int baseRevision = resolveContentRevision(spaceId, itemType, itemId);
        String action = currentlyPublished
                ? SpaceReviewConstants.ACTION_UPDATE : SpaceReviewConstants.ACTION_CREATE;
        upsertPendingItem(spaceId, userId, itemType, itemId, action, baseRevision, snapshotJson,
                "content:" + itemType + ":" + itemId);
        String message = currentlyPublished
                ? "修改已保存，当前广场仍展示旧版本"
                : "已保存，等待审核后公开";
        return SpaceContentSaveResultVO.builder()
                .id(itemId)
                .published(currentlyPublished)
                .reviewStatus(SpaceReviewConstants.USER_STATE_PENDING)
                .reviewMessage(message)
                .build();
    }

    @Override
    public SpaceContentSaveResultVO onHomeSaved(Long spaceId, Long userId, String changeSummary) {
        CoupleSpaceDO space = coupleSpaceMapper.findById(spaceId);
        if (space == null) {
            throw new BizException(ResponseCodeEnum.SPACE_NOT_EXIST);
        }
        if (!Objects.equals(space.getVisibility(), SPACE_VISIBILITY_PUBLIC)) {
            removePendingItem(spaceId, SpaceReviewConstants.ITEM_TYPE_SPACE,
                    SpaceReviewConstants.SINGLE_ITEM_ID);
            removePendingItem(spaceId, SpaceReviewConstants.ITEM_TYPE_HOME_CONFIG,
                    SpaceReviewConstants.SINGLE_ITEM_ID);
            return SpaceContentSaveResultVO.builder()
                    .id(spaceId)
                    .published(false)
                    .build();
        }

        LocalDateTime now = LocalDateTime.now();
        SpacePublishedItemDO publishedSpace = publishedItemMapper.selectBySpaceAndItem(
                spaceId, SpaceReviewConstants.ITEM_TYPE_SPACE, SpaceReviewConstants.SINGLE_ITEM_ID);
        String action = publishedSpace == null
                ? SpaceReviewConstants.ACTION_CREATE : SpaceReviewConstants.ACTION_UPDATE;
        upsertPendingItem(spaceId, userId, SpaceReviewConstants.ITEM_TYPE_SPACE,
                SpaceReviewConstants.SINGLE_ITEM_ID, action, revisionOf(space),
                JsonUtil.toJsonString(buildSpaceSnapshot(space)), changeSummary);
        upsertPendingItem(spaceId, userId, SpaceReviewConstants.ITEM_TYPE_HOME_CONFIG,
                SpaceReviewConstants.SINGLE_ITEM_ID, action, revisionOf(space),
                JsonUtil.toJsonString(buildHomeConfigSnapshot(spaceId)), changeSummary);
        return SpaceContentSaveResultVO.builder()
                .id(spaceId)
                .published(publishedSpace != null
                        && Objects.equals(publishedSpace.getPublishStatus(), SpaceReviewConstants.PUBLISHED))
                .reviewStatus(SpaceReviewConstants.USER_STATE_PENDING)
                .reviewMessage("修改已保存，当前广场仍展示旧版本")
                .build();
    }

    @Override
    public Map<String, SpaceItemReviewStateVO> loadItemReviewStates(Long spaceId) {
        Map<String, SpaceItemReviewStateVO> states = new HashMap<>();
        Map<String, Boolean> publishedFlags = new HashMap<>();
        for (SpacePublishedItemDO published : publishedItemMapper.selectBySpaceId(spaceId)) {
            String key = itemKey(published.getItemType(), published.getItemId());
            boolean publishedNow = Objects.equals(
                    published.getPublishStatus(), SpaceReviewConstants.PUBLISHED);
            publishedFlags.put(key, publishedNow);
            states.put(key, SpaceItemReviewStateVO.builder()
                    .reviewStatus(publishedNow
                            ? SpaceReviewConstants.USER_STATE_PUBLISHED
                            : SpaceReviewConstants.USER_STATE_UNPUBLISHED)
                    .reviewRejectReason("")
                    .hasPublishedVersion(publishedNow)
                    .build());
        }

        // 状态优先级：PENDING > REJECTED > UNPUBLISHED > PUBLISHED。
        // 被驳回但仍有旧版本在广场展示时，必须显示「审核未通过」，不能回退成「已公开」。
        Map<String, SpaceReviewItemDO> latestRejected = new LinkedHashMap<>();
        for (SpaceReviewItemDO rejected : itemMapper.selectLatestRejectedBySpaceId(spaceId)) {
            latestRejected.putIfAbsent(itemKey(rejected.getItemType(), rejected.getItemId()), rejected);
        }
        for (Map.Entry<String, SpaceReviewItemDO> entry : latestRejected.entrySet()) {
            SpaceReviewItemDO rejected = entry.getValue();
            states.put(entry.getKey(), SpaceItemReviewStateVO.builder()
                    .reviewStatus(SpaceReviewConstants.USER_STATE_REJECTED)
                    .reviewRejectReason(StrUtil.nullToEmpty(rejected.getRejectReason()))
                    .reviewHandledAt(rejected.getHandledAt() == null
                            ? rejected.getUpdateTime() : rejected.getHandledAt())
                    .hasPublishedVersion(Boolean.TRUE.equals(publishedFlags.get(entry.getKey())))
                    .build());
        }
        for (SpaceReviewItemDO pending : itemMapper.selectPendingBySpaceId(spaceId)) {
            String key = itemKey(pending.getItemType(), pending.getItemId());
            states.put(key, SpaceItemReviewStateVO.builder()
                    .reviewStatus(SpaceReviewConstants.USER_STATE_PENDING)
                    .reviewRejectReason("")
                    .reviewHandledAt(null)
                    .hasPublishedVersion(Boolean.TRUE.equals(publishedFlags.get(key)))
                    .build());
        }
        return states;
    }

    /* -------------------- 快照构建 -------------------- */

    private int resolveVisibility(Long spaceId, String itemType, Long itemId) {
        Integer visibility = null;
        if (SpaceReviewConstants.ITEM_TYPE_STORY.equals(itemType)) {
            StoryNodeDO story = storyNodeMapper.selectActiveById(spaceId, itemId);
            visibility = story == null ? null : story.getVisibility();
        } else if (SpaceReviewConstants.ITEM_TYPE_PHOTO.equals(itemType)) {
            PhotoDO photo = photoMapper.findActiveById(spaceId, itemId);
            visibility = photo == null ? null : photo.getVisibility();
        } else if (SpaceReviewConstants.ITEM_TYPE_ANNIVERSARY.equals(itemType)) {
            AnniversaryDO anniversary = anniversaryMapper.selectActiveById(spaceId, itemId);
            visibility = anniversary == null ? null : anniversary.getVisibility();
        }
        return visibility == null ? 0 : visibility;
    }

    private int resolveContentRevision(Long spaceId, String itemType, Long itemId) {
        if (SpaceReviewConstants.ITEM_TYPE_STORY.equals(itemType)) {
            return revisionOf(storyNodeMapper.selectActiveById(spaceId, itemId));
        }
        if (SpaceReviewConstants.ITEM_TYPE_PHOTO.equals(itemType)) {
            return revisionOf(photoMapper.findActiveById(spaceId, itemId));
        }
        if (SpaceReviewConstants.ITEM_TYPE_ANNIVERSARY.equals(itemType)) {
            return revisionOf(anniversaryMapper.selectActiveById(spaceId, itemId));
        }
        return 0;
    }

    private String buildContentSnapshot(Long spaceId, String itemType, Long itemId) {
        if (SpaceReviewConstants.ITEM_TYPE_STORY.equals(itemType)) {
            StoryNodeDO story = storyNodeMapper.selectActiveById(spaceId, itemId);
            return story == null ? null : JsonUtil.toJsonString(buildStorySnapshot(spaceId, story));
        }
        if (SpaceReviewConstants.ITEM_TYPE_PHOTO.equals(itemType)) {
            PhotoDO photo = photoMapper.findActiveById(spaceId, itemId);
            return photo == null ? null : JsonUtil.toJsonString(buildPhotoSnapshot(spaceId, photo));
        }
        if (SpaceReviewConstants.ITEM_TYPE_ANNIVERSARY.equals(itemType)) {
            AnniversaryDO anniversary = anniversaryMapper.selectActiveById(spaceId, itemId);
            return anniversary == null ? null : JsonUtil.toJsonString(buildAnniversarySnapshot(anniversary));
        }
        return null;
    }

    private int insertFullSnapshotItems(Long submissionId, CoupleSpaceDO space, Long userId,
                                        LocalDateTime now) {
        Long spaceId = space.getId();
        int count = 0;
        String spaceAction = space.getPublicAt() == null
                ? SpaceReviewConstants.ACTION_FIRST_PUBLISH : SpaceReviewConstants.ACTION_REPUBLISH;
        insertItem(SpaceReviewItemDO.builder()
                .submissionId(submissionId)
                .spaceId(spaceId)
                .itemType(SpaceReviewConstants.ITEM_TYPE_SPACE)
                .itemId(SpaceReviewConstants.SINGLE_ITEM_ID)
                .action(spaceAction)
                .baseRevision(revisionOf(space))
                .snapshotJson(JsonUtil.toJsonString(buildSpaceSnapshot(space)))
                .itemStatus(SpaceReviewConstants.ITEM_STATUS_PENDING)
                .createTime(now)
                .updateTime(now)
                .build());
        count++;

        insertItem(SpaceReviewItemDO.builder()
                .submissionId(submissionId)
                .spaceId(spaceId)
                .itemType(SpaceReviewConstants.ITEM_TYPE_HOME_CONFIG)
                .itemId(SpaceReviewConstants.SINGLE_ITEM_ID)
                .action(spaceAction)
                .baseRevision(revisionOf(space))
                .snapshotJson(JsonUtil.toJsonString(buildHomeConfigSnapshot(spaceId)))
                .itemStatus(SpaceReviewConstants.ITEM_STATUS_PENDING)
                .createTime(now)
                .updateTime(now)
                .build());
        count++;

        for (StoryNodeDO story : storyNodeMapper.selectPublicList(spaceId)) {
            insertItem(SpaceReviewItemDO.builder()
                    .submissionId(submissionId)
                    .spaceId(spaceId)
                    .itemType(SpaceReviewConstants.ITEM_TYPE_STORY)
                    .itemId(story.getId())
                    .action(resolveContentAction(spaceId, SpaceReviewConstants.ITEM_TYPE_STORY, story.getId()))
                    .baseRevision(revisionOf(story))
                    .snapshotJson(JsonUtil.toJsonString(buildStorySnapshot(spaceId, story)))
                    .itemStatus(SpaceReviewConstants.ITEM_STATUS_PENDING)
                    .createTime(now)
                    .updateTime(now)
                    .build());
            count++;
        }
        for (PhotoDO photo : photoMapper.selectPublicList(spaceId)) {
            insertItem(SpaceReviewItemDO.builder()
                    .submissionId(submissionId)
                    .spaceId(spaceId)
                    .itemType(SpaceReviewConstants.ITEM_TYPE_PHOTO)
                    .itemId(photo.getId())
                    .action(resolveContentAction(spaceId, SpaceReviewConstants.ITEM_TYPE_PHOTO, photo.getId()))
                    .baseRevision(revisionOf(photo))
                    .snapshotJson(JsonUtil.toJsonString(buildPhotoSnapshot(spaceId, photo)))
                    .itemStatus(SpaceReviewConstants.ITEM_STATUS_PENDING)
                    .createTime(now)
                    .updateTime(now)
                    .build());
            count++;
        }
        for (AnniversaryDO anniversary : anniversaryMapper.selectPublicList(spaceId)) {
            insertItem(SpaceReviewItemDO.builder()
                    .submissionId(submissionId)
                    .spaceId(spaceId)
                    .itemType(SpaceReviewConstants.ITEM_TYPE_ANNIVERSARY)
                    .itemId(anniversary.getId())
                    .action(resolveContentAction(spaceId,
                            SpaceReviewConstants.ITEM_TYPE_ANNIVERSARY, anniversary.getId()))
                    .baseRevision(revisionOf(anniversary))
                    .snapshotJson(JsonUtil.toJsonString(buildAnniversarySnapshot(anniversary)))
                    .itemStatus(SpaceReviewConstants.ITEM_STATUS_PENDING)
                    .createTime(now)
                    .updateTime(now)
                    .build());
            count++;
        }
        return count;
    }

    private String resolveContentAction(Long spaceId, String itemType, Long itemId) {
        SpacePublishedItemDO published = publishedItemMapper.selectBySpaceAndItem(spaceId, itemType, itemId);
        return published == null || !Objects.equals(published.getPublishStatus(), SpaceReviewConstants.PUBLISHED)
                ? SpaceReviewConstants.ACTION_CREATE : SpaceReviewConstants.ACTION_UPDATE;
    }

    private SpacePublicSnapshot buildSpaceSnapshot(CoupleSpaceDO space) {
        return SpacePublicSnapshot.builder()
                .spaceId(space.getId())
                .spaceCode(space.getSpaceCode())
                .spaceName(space.getSpaceName())
                .description(space.getDescription())
                .coverImage(space.getCoverImage())
                .loveStartTime(format(space.getLoveStartTime()))
                .publicAt(format(space.getPublicAt()))
                .build();
    }

    private HomeConfigPublicSnapshot buildHomeConfigSnapshot(Long spaceId) {
        Map<String, String> configs = new LinkedHashMap<>();
        for (CoupleSpaceConfigDO config : coupleSpaceConfigMapper.selectBySpaceId(spaceId)) {
            if (HOME_CONFIG_KEYS.contains(config.getConfigKey())) {
                configs.put(config.getConfigKey(), StrUtil.nullToEmpty(config.getConfigValue()));
            }
        }
        return HomeConfigPublicSnapshot.builder().configs(configs).build();
    }

    private StoryPublicSnapshot buildStorySnapshot(Long spaceId, StoryNodeDO story) {
        StoryChapterDO chapter = storyChapterMapper.selectChapterById(spaceId, story.getChapterId());
        List<StoryNodeImageDO> images = storyNodeImageMapper.selectByNodeIds(
                spaceId, Collections.singletonList(story.getId()));
        return StoryPublicSnapshot.builder()
                .storyId(story.getId())
                .chapterId(story.getChapterId())
                .chapterName(chapter == null ? "" : StrUtil.nullToEmpty(chapter.getName()))
                .title(story.getTitle())
                .summary(story.getSummary())
                .content(story.getContent())
                .happenedTime(format(story.getHappenedTime()))
                .location(story.getLocation())
                .coverImage(story.getCoverImage())
                .tagLabel(story.getTagLabel())
                .tagColor(story.getTagColor())
                .sortOrder(story.getSortOrder())
                .milestone(Boolean.TRUE.equals(story.getIsMilestone()))
                .images(images == null ? Collections.emptyList() : images.stream()
                        .map(image -> StoryPublicSnapshot.ImagePublicSnapshot.builder()
                                .url(image.getUrl())
                                .altText(StrUtil.nullToEmpty(image.getAltText()))
                                .sortOrder(image.getSortOrder())
                                .build())
                        .collect(Collectors.toList()))
                .build();
    }

    private PhotoPublicSnapshot buildPhotoSnapshot(Long spaceId, PhotoDO photo) {
        PhotoCategoryDO category = photoCategoryMapper.findCategoryById(spaceId, photo.getPhotoCategoryId());
        return PhotoPublicSnapshot.builder()
                .photoId(photo.getId())
                .photoCategoryId(photo.getPhotoCategoryId())
                .categoryName(category == null ? "" : StrUtil.nullToEmpty(category.getCategoryName()))
                .title(photo.getTitle())
                .description(photo.getDescription())
                .url(photo.getUrl())
                .takenTime(format(photo.getTakenTime()))
                .location(photo.getLocation())
                .sortOrder(photo.getSortOrder())
                .cover(Boolean.TRUE.equals(photo.getIsCover()))
                .build();
    }

    private AnniversaryPublicSnapshot buildAnniversarySnapshot(AnniversaryDO anniversary) {
        return AnniversaryPublicSnapshot.builder()
                .anniversaryId(anniversary.getId())
                .title(anniversary.getTitle())
                .description(anniversary.getDescription())
                .anniversaryDate(format(anniversary.getAnniversaryDate()))
                .repeatType(anniversary.getRepeatType())
                .category(anniversary.getCategory())
                .colorCode(anniversary.getColorCode())
                .location(anniversary.getLocation())
                .sortOrder(anniversary.getSortOrder())
                .build();
    }

    /* -------------------- 待审核项维护 -------------------- */

    private void upsertPendingItem(Long spaceId, Long userId, String itemType, Long itemId,
                                   String action, int baseRevision, String snapshotJson,
                                   String changeSummary) {
        LocalDateTime now = LocalDateTime.now();
        SpaceReviewSubmissionDO pending = submissionMapper.selectPendingBySpaceId(spaceId);
        Long submissionId;
        if (pending == null) {
            CoupleSpaceDO space = requireSpace(spaceId);
            SpaceReviewSubmissionDO submission = SpaceReviewSubmissionDO.builder()
                    .spaceId(spaceId)
                    .submittedBy(userId)
                    .status(SpaceReviewConstants.STATUS_PENDING)
                    .reviewType(SpaceReviewConstants.REVIEW_TYPE_CONTENT_UPDATE)
                    .baseRevision(revisionOf(space))
                    .pendingFlag(1)
                    .changeSummary(changeSummary)
                    .createTime(now)
                    .updateTime(now)
                    .build();
            try {
                submissionMapper.insert(submission);
                submissionId = submission.getId();
            } catch (DataIntegrityViolationException exception) {
                SpaceReviewSubmissionDO existing = submissionMapper.selectPendingBySpaceId(spaceId);
                if (existing == null) {
                    throw new BizException(ResponseCodeEnum.SPACE_REVIEW_ALREADY_PENDING);
                }
                submissionId = existing.getId();
            }
        } else {
            submissionId = pending.getId();
            submissionMapper.touch(submissionId, spaceId, pending.getReviewType(),
                    pending.getBaseRevision(), changeSummary, now);
        }

        SpaceReviewItemDO existing = itemMapper.selectBySubmissionAndTarget(
                submissionId, itemType, itemId);
        if (existing == null) {
            insertItem(SpaceReviewItemDO.builder()
                    .submissionId(submissionId)
                    .spaceId(spaceId)
                    .itemType(itemType)
                    .itemId(itemId)
                    .action(action)
                    .baseRevision(baseRevision)
                    .snapshotJson(snapshotJson)
                    .itemStatus(SpaceReviewConstants.ITEM_STATUS_PENDING)
                    .createTime(now)
                    .updateTime(now)
                    .build());
        } else if (SpaceReviewConstants.ITEM_STATUS_PENDING.equals(existing.getItemStatus())) {
            itemMapper.updateSnapshot(existing.getId(), action, baseRevision, snapshotJson, now);
        } else {
            // 同一提交内该项已被通过/驳回，用户再次修改时复用原行重新进入待审核，
            // 既不丢弃其他待审核项，也不会触发唯一索引冲突。
            int reset = itemMapper.resetItemToPending(
                    existing.getId(), action, baseRevision, snapshotJson, now);
            if (reset == 0) {
                itemMapper.updateSnapshot(existing.getId(), action, baseRevision, snapshotJson, now);
            }
        }
    }

    private void removePendingItem(Long spaceId, String itemType, Long itemId) {
        SpaceReviewSubmissionDO pending = submissionMapper.selectPendingBySpaceId(spaceId);
        if (pending == null) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        itemMapper.resolveItem(pending.getId(), itemType, itemId,
                SpaceReviewConstants.ITEM_STATUS_WITHDRAWN, now);
        List<SpaceReviewItemDO> items = itemMapper.selectBySubmissionId(pending.getId());
        ItemStatusCounts counts = countItemStatuses(items);
        if (counts.pending > 0) {
            submissionMapper.touchPending(pending.getId(), spaceId, null, now);
            return;
        }
        String finalStatus;
        if (counts.total > 0 && counts.approved == counts.total) {
            finalStatus = SpaceReviewConstants.STATUS_APPROVED;
        } else if (counts.approved == 0 && counts.rejected == 0) {
            finalStatus = SpaceReviewConstants.STATUS_WITHDRAWN;
        } else if (counts.approved == 0) {
            finalStatus = SpaceReviewConstants.STATUS_REJECTED;
        } else {
            finalStatus = SpaceReviewConstants.STATUS_PARTIALLY_APPROVED;
        }
        submissionMapper.resolve(pending.getId(), spaceId,
                SpaceReviewConstants.STATUS_PENDING, finalStatus,
                null, now, "公开范围缩小，待审核项已全部处理", now);
    }

    private long zero(Long value) {
        return value == null ? 0L : value;
    }

    private int revisionOf(CoupleSpaceDO space) {
        return space.getRevision() == null ? 0 : space.getRevision();
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

    private void insertItem(SpaceReviewItemDO item) {
        itemMapper.insert(item);
    }

    private SpaceReviewSubmissionDO findLatestHandled(Long spaceId) {
        for (SpaceReviewSubmissionDO submission : submissionMapper.selectBySpaceId(spaceId)) {
            if (SpaceReviewConstants.STATUS_APPROVED.equals(submission.getStatus())
                    || SpaceReviewConstants.STATUS_REJECTED.equals(submission.getStatus())
                    || SpaceReviewConstants.STATUS_PARTIALLY_APPROVED.equals(submission.getStatus())
                    || SpaceReviewConstants.STATUS_WITHDRAWN.equals(submission.getStatus())) {
                return submission;
            }
        }
        return null;
    }

    private ItemStatusCounts countItemStatuses(List<SpaceReviewItemDO> items) {
        ItemStatusCounts counts = new ItemStatusCounts();
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

    private String firstRejectReason(List<SpaceReviewItemDO> items) {
        for (SpaceReviewItemDO item : items) {
            if (SpaceReviewConstants.ITEM_STATUS_REJECTED.equals(item.getItemStatus())
                    && StrUtil.isNotBlank(item.getRejectReason())) {
                return StrUtil.maxLength(StrUtil.trim(item.getRejectReason()), 500);
            }
        }
        return "";
    }

    private List<SpaceReviewStatusVO.RejectedItemVO> buildRejectedItems(List<SpaceReviewItemDO> items) {        List<SpaceReviewStatusVO.RejectedItemVO> result = new ArrayList<>();
        for (SpaceReviewItemDO item : items) {
            if (!SpaceReviewConstants.ITEM_STATUS_REJECTED.equals(item.getItemStatus())) {
                continue;
            }
            result.add(SpaceReviewStatusVO.RejectedItemVO.builder()
                    .itemType(item.getItemType())
                    .itemTypeText(SpaceReviewConstants.itemTypeText(item.getItemType()))
                    .itemId(item.getItemId())
                    .title(resolveSnapshotTitle(item))
                    .rejectReason(StrUtil.nullToEmpty(item.getRejectReason()))
                    .handledAt(item.getHandledAt() == null ? item.getUpdateTime() : item.getHandledAt())
                    .build());
        }
        return result;
    }

    private String resolveSnapshotTitle(SpaceReviewItemDO item) {
        String itemType = item.getItemType();
        String snapshotJson = item.getSnapshotJson();
        if (StrUtil.isBlank(snapshotJson)) {
            return SpaceReviewConstants.itemTypeText(itemType);
        }
        if (SpaceReviewConstants.ITEM_TYPE_STORY.equals(itemType)) {
            StoryPublicSnapshot story = JsonUtil.parseObject(snapshotJson, StoryPublicSnapshot.class);
            return story == null || StrUtil.isBlank(story.getTitle())
                    ? SpaceReviewConstants.itemTypeText(itemType) : story.getTitle();
        }
        if (SpaceReviewConstants.ITEM_TYPE_PHOTO.equals(itemType)) {
            PhotoPublicSnapshot photo = JsonUtil.parseObject(snapshotJson, PhotoPublicSnapshot.class);
            return photo == null || StrUtil.isBlank(photo.getTitle())
                    ? SpaceReviewConstants.itemTypeText(itemType) : photo.getTitle();
        }
        if (SpaceReviewConstants.ITEM_TYPE_ANNIVERSARY.equals(itemType)) {
            AnniversaryPublicSnapshot anniversary = JsonUtil.parseObject(
                    snapshotJson, AnniversaryPublicSnapshot.class);
            return anniversary == null || StrUtil.isBlank(anniversary.getTitle())
                    ? SpaceReviewConstants.itemTypeText(itemType) : anniversary.getTitle();
        }
        if (SpaceReviewConstants.ITEM_TYPE_SPACE.equals(itemType)) {
            SpacePublicSnapshot space = JsonUtil.parseObject(snapshotJson, SpacePublicSnapshot.class);
            return space == null || StrUtil.isBlank(space.getSpaceName())
                    ? SpaceReviewConstants.itemTypeText(itemType) : space.getSpaceName();
        }
        return SpaceReviewConstants.itemTypeText(itemType);
    }

    private static final class ItemStatusCounts {
        private int total;
        private int pending;
        private int approved;
        private int rejected;
        private int withdrawn;
    }

    private void validatePublishable(CoupleSpaceDO space) {
        if (!Objects.equals(space.getStatus(), SPACE_STATUS_NORMAL)) {
            throw new BizException(ResponseCodeEnum.SPACE_STATUS_NOT_ALLOWED);
        }
        long activeMembers = zero(coupleMemberMapper.countActiveBySpaceId(space.getId()));
        if (activeMembers < MEMBER_LIMIT) {
            throw new BizException(ResponseCodeEnum.SPACE_NOT_TWO_MEMBERS);
        }
    }

    private CoupleSpaceDO requireSpace(Long spaceId) {
        CoupleSpaceDO space = coupleSpaceMapper.findById(spaceId);
        if (space == null) {
            throw new BizException(ResponseCodeEnum.SPACE_NOT_EXIST);
        }
        return space;
    }

    private void publishSnapshot(CoupleSpaceDO space, LocalDateTime now) {
        Long spaceId = space.getId();
        upsertPublished(spaceId, SpaceReviewConstants.ITEM_TYPE_SPACE,
                SpaceReviewConstants.SINGLE_ITEM_ID, revisionOf(space),
                JsonUtil.toJsonString(buildSpaceSnapshot(space)), now);
        upsertPublished(spaceId, SpaceReviewConstants.ITEM_TYPE_HOME_CONFIG,
                SpaceReviewConstants.SINGLE_ITEM_ID, revisionOf(space),
                JsonUtil.toJsonString(buildHomeConfigSnapshot(spaceId)), now);
        for (StoryNodeDO story : storyNodeMapper.selectPublicList(spaceId)) {
            upsertPublished(spaceId, SpaceReviewConstants.ITEM_TYPE_STORY, story.getId(),
                    revisionOf(story), JsonUtil.toJsonString(buildStorySnapshot(spaceId, story)), now);
        }
        for (PhotoDO photo : photoMapper.selectPublicList(spaceId)) {
            upsertPublished(spaceId, SpaceReviewConstants.ITEM_TYPE_PHOTO, photo.getId(),
                    revisionOf(photo), JsonUtil.toJsonString(buildPhotoSnapshot(spaceId, photo)), now);
        }
        for (AnniversaryDO anniversary : anniversaryMapper.selectPublicList(spaceId)) {
            upsertPublished(spaceId, SpaceReviewConstants.ITEM_TYPE_ANNIVERSARY, anniversary.getId(),
                    revisionOf(anniversary), JsonUtil.toJsonString(buildAnniversarySnapshot(anniversary)), now);
        }
    }

    private void upsertPublished(Long spaceId, String itemType, Long itemId, int revision,
                                 String snapshotJson, LocalDateTime now) {
        SpacePublishedItemDO existing = publishedItemMapper.selectBySpaceAndItem(spaceId, itemType, itemId);
        if (existing == null) {
            publishedItemMapper.insert(SpacePublishedItemDO.builder()
                    .spaceId(spaceId)
                    .itemType(itemType)
                    .itemId(itemId)
                    .revision(revision)
                    .snapshotJson(snapshotJson)
                    .publishStatus(SpaceReviewConstants.PUBLISHED)
                    .publishedAt(now)
                    .createTime(now)
                    .updateTime(now)
                    .build());
            return;
        }
        existing.setRevision(revision);
        existing.setSnapshotJson(snapshotJson);
        existing.setPublishStatus(SpaceReviewConstants.PUBLISHED);
        existing.setPublishedAt(now);
        existing.setUnpublishedAt(null);
        existing.setUnpublishReason("");
        existing.setUpdateTime(now);
        publishedItemMapper.updateById(existing);
    }

    private String resolveStatusMessage(CoupleSpaceDO space, SpaceReviewSubmissionDO pending,
                                        ItemStatusCounts counts, SpaceReviewSubmissionDO latestHandled,
                                        boolean unpublished) {
        if (pending != null) {
            return "已提交审核，本次共 " + counts.total + " 项，其中 " + counts.pending
                    + " 项待处理；审核期间恋爱广场仍展示上一次通过的内容。";
        }
        if (unpublished) {
            return "公开内容已被管理员下架，恋爱广场不再展示。修改后可重新提交审核。";
        }
        if (latestHandled != null
                && SpaceReviewConstants.STATUS_REJECTED.equals(latestHandled.getStatus())) {
            return "上次审核未通过：" + StrUtil.nullToEmpty(latestHandled.getRejectReason())
                    + "。修改后可以重新提交。";
        }
        if (latestHandled != null
                && SpaceReviewConstants.STATUS_PARTIALLY_APPROVED.equals(latestHandled.getStatus())) {
            return "上次审核部分通过：已通过 " + counts.approved + " 项，未通过 "
                    + counts.rejected + " 项。修改被驳回的内容后可以重新提交审核。";
        }
        if (latestHandled != null
                && SpaceReviewConstants.STATUS_WITHDRAWN.equals(latestHandled.getStatus())) {
            return "上次公开申请已撤回，可修改后重新提交审核。";
        }
        if (Objects.equals(space.getVisibility(), SPACE_VISIBILITY_PUBLIC)) {
            return "空间已公开。修改公开内容会进入审核，审核期间广场继续展示旧版本。";
        }
        return "空间尚未公开。首次公开需要管理员审核，审核通过后才会出现在恋爱广场。";
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

    private String itemKey(String itemType, Long itemId) {
        return itemType + ":" + (itemId == null ? SpaceReviewConstants.SINGLE_ITEM_ID : itemId);
    }

    private String format(LocalDateTime value) {
        return value == null ? null : value.format(DATE_TIME_FORMATTER);
    }

    private String format(LocalDate value) {
        return value == null ? null : value.format(DATE_FORMATTER);
    }
}
