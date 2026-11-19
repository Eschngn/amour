package com.chengliuxiang.amour.common.service;

import cn.hutool.core.util.StrUtil;
import com.chengliuxiang.amour.common.domain.dos.AnniversaryDO;
import com.chengliuxiang.amour.common.domain.dos.CoupleMemberDO;
import com.chengliuxiang.amour.common.domain.dos.CoupleSpaceConfigDO;
import com.chengliuxiang.amour.common.domain.dos.CoupleSpaceDO;
import com.chengliuxiang.amour.common.domain.dos.MessageDO;
import com.chengliuxiang.amour.common.domain.dos.MessageReplyDO;
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
import com.chengliuxiang.amour.common.domain.mapper.MessageMapper;
import com.chengliuxiang.amour.common.domain.mapper.MessageReplyMapper;
import com.chengliuxiang.amour.common.domain.mapper.PhotoCategoryMapper;
import com.chengliuxiang.amour.common.domain.mapper.PhotoMapper;
import com.chengliuxiang.amour.common.domain.mapper.SpacePublishedItemMapper;
import com.chengliuxiang.amour.common.domain.mapper.SpaceReviewItemMapper;
import com.chengliuxiang.amour.common.domain.mapper.SpaceReviewSubmissionMapper;
import com.chengliuxiang.amour.common.domain.mapper.StoryChapterMapper;
import com.chengliuxiang.amour.common.domain.mapper.StoryNodeImageMapper;
import com.chengliuxiang.amour.common.domain.mapper.StoryNodeMapper;
import com.chengliuxiang.amour.common.model.snapshot.SpaceArchiveSnapshot;
import com.chengliuxiang.amour.common.utils.JsonUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 情侣空间销毁留档：快照采集与资源引用统计。
 *
 * <p>销毁与恢复共用的唯一快照格式定义在这里，避免用户端与后台各写一套导致字段漂移。
 * 本服务只负责「把空间当前数据读成快照」和「统计快照中的文件资源引用」，
 * 不负责状态流转、权限校验与事务边界——那些由调用方（用户端 / 后台）在事务内完成。</p>
 *
 * <p>快照只保存业务字段与图片 URL 引用；不读取对象存储、不删除任何文件。
 * 销毁期间头像、照片、封面等资源引用原样保留，恢复后仍可按原 URL 访问。</p>
 */
@Service
@Slf4j
public class SpaceArchiveSnapshotService {

    private static final DateTimeFormatter DATE_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Resource
    private CoupleSpaceMapper coupleSpaceMapper;
    @Resource
    private CoupleMemberMapper coupleMemberMapper;
    @Resource
    private CoupleSpaceConfigMapper coupleSpaceConfigMapper;
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
    private SpaceReviewSubmissionMapper spaceReviewSubmissionMapper;
    @Resource
    private SpaceReviewItemMapper spaceReviewItemMapper;
    @Resource
    private SpacePublishedItemMapper spacePublishedItemMapper;

    /**
     * 采集空间完整快照。
     *
     * <p>必须在销毁事务内、且已通过「创建者 + 另一半未加入 + 状态可销毁」校验之后调用，
     * 保证快照与随后写入的 status=6 处于同一份一致的数据库视图。</p>
     *
     * @param space 已校验的空间记录（status=0，创建者=操作者）
     * @return 完整快照
     */
    public SpaceArchiveSnapshot capture(CoupleSpaceDO space) {
        Long spaceId = space.getId();
        return SpaceArchiveSnapshot.builder()
                .snapshotVersion(SpaceArchiveSnapshot.CURRENT_VERSION)
                .space(buildSpaceSnapshot(space))
                .members(buildMembers(spaceId))
                .configs(buildConfigs(spaceId))
                .storyChapters(buildStoryChapters(spaceId))
                .storyNodes(buildStoryNodes(spaceId))
                .storyNodeImages(buildStoryNodeImages(spaceId))
                .photoCategories(buildPhotoCategories(spaceId))
                .photos(buildPhotos(spaceId))
                .anniversaries(buildAnniversaries(spaceId))
                .messages(buildMessages(spaceId))
                .messageReplies(buildMessageReplies(spaceId))
                .reviewSubmissions(buildReviewSubmissions(spaceId))
                .reviewItems(buildReviewItems(spaceId))
                .publishedItems(buildPublishedItems(spaceId))
                .build();
    }

    /**
     * 统计快照中保留的图片资源引用数量（去重后的 URL 数）。
     *
     * <p>用于后台确认「销毁没有丢掉可恢复的资源引用」。统计范围：空间封面、
     * 故事封面、故事图片、照片 URL 与主页配置中的图片项。</p>
     */
    public int countFileResources(SpaceArchiveSnapshot snapshot) {
        if (snapshot == null) {
            return 0;
        }
        Set<String> urls = new LinkedHashSet<>();
        SpaceArchiveSnapshot.Space space = snapshot.getSpace();
        if (space != null) {
            addUrl(urls, space.getCoverImage());
        }
        for (SpaceArchiveSnapshot.StoryNode node : snapshot.storyNodesOrEmpty()) {
            addUrl(urls, node.getCoverImage());
        }
        for (SpaceArchiveSnapshot.StoryNodeImage image : snapshot.storyNodeImagesOrEmpty()) {
            addUrl(urls, image.getUrl());
        }
        for (SpaceArchiveSnapshot.Photo photo : snapshot.photosOrEmpty()) {
            addUrl(urls, photo.getUrl());
        }
        for (SpaceArchiveSnapshot.SpaceConfig config : snapshot.configsOrEmpty()) {
            addUrl(urls, config.getConfigValue());
        }
        return urls.size();
    }

    /**
     * 快照 JSON 序列化；失败时抛出运行时异常，由调用方事务回滚。
     */
    public String toJson(SpaceArchiveSnapshot snapshot) {
        return JsonUtil.toJsonString(snapshot);
    }

    /**
     * 反序列化留档快照；结构损坏时返回 null，由调用方返回明确业务错误而不是静默覆盖。
     */
    public SpaceArchiveSnapshot parse(String json) {
        return JsonUtil.parseObject(json, SpaceArchiveSnapshot.class);
    }

    /**
     * 校验快照是否可恢复。返回 null 表示可恢复，否则返回可展示的失败原因。
     */
    public String validateForRestore(SpaceArchiveSnapshot snapshot, Long expectedSpaceId) {
        if (snapshot == null) {
            return "留档快照为空或已损坏";
        }
        if (snapshot.getSnapshotVersion() == null
                || snapshot.getSnapshotVersion() != SpaceArchiveSnapshot.CURRENT_VERSION) {
            return "留档快照版本不受支持";
        }
        SpaceArchiveSnapshot.Space space = snapshot.getSpace();
        if (space == null || space.getSpaceId() == null) {
            return "留档缺少空间信息";
        }
        if (expectedSpaceId != null && !Objects.equals(space.getSpaceId(), expectedSpaceId)) {
            return "留档空间与目标空间不一致";
        }
        return null;
    }

    private SpaceArchiveSnapshot.Space buildSpaceSnapshot(CoupleSpaceDO space) {
        return SpaceArchiveSnapshot.Space.builder()
                .spaceId(space.getId())
                .spaceCode(space.getSpaceCode())
                .spaceName(space.getSpaceName())
                .description(space.getDescription())
                .coverImage(space.getCoverImage())
                .status(space.getStatus())
                .visibility(space.getVisibility())
                .loveStartTime(formatDateTime(space.getLoveStartTime()))
                .publicAt(formatDateTime(space.getPublicAt()))
                .archivedAt(formatDateTime(space.getArchivedAt()))
                .deleteAfter(formatDateTime(space.getDeleteAfter()))
                .createdBy(space.getCreatedBy())
                .revision(space.getRevision())
                .createTime(formatDateTime(space.getCreateTime()))
                .updateTime(formatDateTime(space.getUpdateTime()))
                .build();
    }

    private List<SpaceArchiveSnapshot.Member> buildMembers(Long spaceId) {
        return coupleMemberMapper.selectBySpaceId(spaceId).stream()
                .map(member -> SpaceArchiveSnapshot.Member.builder()
                        .id(member.getId())
                        .spaceId(member.getSpaceId())
                        .userId(member.getUserId())
                        .memberRole(member.getMemberRole())
                        .status(member.getStatus())
                        .joinedAt(formatDateTime(member.getJoinedAt()))
                        .leftAt(formatDateTime(member.getLeftAt()))
                        .createTime(formatDateTime(member.getCreateTime()))
                        .updateTime(formatDateTime(member.getUpdateTime()))
                        .build())
                .collect(Collectors.toList());
    }

    private List<SpaceArchiveSnapshot.SpaceConfig> buildConfigs(Long spaceId) {
        return coupleSpaceConfigMapper.selectAllBySpaceIdForArchive(spaceId).stream()
                .map(config -> SpaceArchiveSnapshot.SpaceConfig.builder()
                        .id(config.getId())
                        .spaceId(config.getSpaceId())
                        .configKey(config.getConfigKey())
                        .configValue(config.getConfigValue())
                        .valueType(config.getValueType())
                        .createdBy(config.getCreatedBy())
                        .revision(config.getRevision())
                        .createTime(formatDateTime(config.getCreateTime()))
                        .updateTime(formatDateTime(config.getUpdateTime()))
                        .build())
                .collect(Collectors.toList());
    }

    private List<SpaceArchiveSnapshot.StoryChapter> buildStoryChapters(Long spaceId) {
        return storyChapterMapper.selectAllBySpaceIdForArchive(spaceId).stream()
                .map(chapter -> SpaceArchiveSnapshot.StoryChapter.builder()
                        .id(chapter.getId())
                        .spaceId(chapter.getSpaceId())
                        .name(chapter.getName())
                        .colorCode(chapter.getColorCode())
                        .sortOrder(chapter.getSortOrder())
                        .isVisible(chapter.getIsVisible())
                        .createdBy(chapter.getCreatedBy())
                        .createTime(formatDateTime(chapter.getCreateTime()))
                        .updateTime(formatDateTime(chapter.getUpdateTime()))
                        .build())
                .collect(Collectors.toList());
    }

    private List<SpaceArchiveSnapshot.StoryNode> buildStoryNodes(Long spaceId) {
        return storyNodeMapper.selectAllBySpaceIdForArchive(spaceId).stream()
                .map(node -> SpaceArchiveSnapshot.StoryNode.builder()
                        .id(node.getId())
                        .spaceId(node.getSpaceId())
                        .chapterId(node.getChapterId())
                        .title(node.getTitle())
                        .summary(node.getSummary())
                        .content(node.getContent())
                        .happenedTime(formatDateTime(node.getHappenedTime()))
                        .showTime(node.getShowTime() == null || node.getShowTime())
                        .location(node.getLocation())
                        .coverImage(node.getCoverImage())
                        .tagLabel(node.getTagLabel())
                        .tagColor(node.getTagColor())
                        .sortOrder(node.getSortOrder())
                        .globalSortOrder(node.getGlobalSortOrder())
                        .isMilestone(node.getIsMilestone())
                        .visibility(node.getVisibility())
                        .isDeleted(node.getIsDeleted())
                        .createdBy(node.getCreatedBy())
                        .updatedBy(node.getUpdatedBy())
                        .revision(node.getRevision())
                        .createTime(formatDateTime(node.getCreateTime()))
                        .updateTime(formatDateTime(node.getUpdateTime()))
                        .build())
                .collect(Collectors.toList());
    }

    private List<SpaceArchiveSnapshot.StoryNodeImage> buildStoryNodeImages(Long spaceId) {
        return storyNodeImageMapper.selectAllBySpaceIdForArchive(spaceId).stream()
                .map(image -> SpaceArchiveSnapshot.StoryNodeImage.builder()
                        .id(image.getId())
                        .spaceId(image.getSpaceId())
                        .nodeId(image.getNodeId())
                        .url(image.getUrl())
                        .altText(image.getAltText())
                        .sortOrder(image.getSortOrder())
                        .createdBy(image.getCreatedBy())
                        .createTime(formatDateTime(image.getCreateTime()))
                        .build())
                .collect(Collectors.toList());
    }

    private List<SpaceArchiveSnapshot.PhotoCategory> buildPhotoCategories(Long spaceId) {
        return photoCategoryMapper.selectAllBySpaceIdForArchive(spaceId).stream()
                .map(category -> SpaceArchiveSnapshot.PhotoCategory.builder()
                        .id(category.getId())
                        .spaceId(category.getSpaceId())
                        .categoryName(category.getCategoryName())
                        .sortOrder(category.getSortOrder())
                        .isEnabled(category.getIsEnabled())
                        .remark(category.getRemark())
                        .createdBy(category.getCreatedBy())
                        .createTime(formatDateTime(category.getCreateTime()))
                        .updateTime(formatDateTime(category.getUpdateTime()))
                        .build())
                .collect(Collectors.toList());
    }

    private List<SpaceArchiveSnapshot.Photo> buildPhotos(Long spaceId) {
        return photoMapper.selectAllBySpaceIdForArchive(spaceId).stream()
                .map(photo -> SpaceArchiveSnapshot.Photo.builder()
                        .id(photo.getId())
                        .spaceId(photo.getSpaceId())
                        .photoCategoryId(photo.getPhotoCategoryId())
                        .title(photo.getTitle())
                        .description(photo.getDescription())
                        .url(photo.getUrl())
                        .takenTime(formatDateTime(photo.getTakenTime()))
                        .showTime(photo.getShowTime() == null || photo.getShowTime())
                        .location(photo.getLocation())
                        .sortOrder(photo.getSortOrder())
                        .globalSortOrder(photo.getGlobalSortOrder())
                        .isCover(photo.getIsCover())
                        .visibility(photo.getVisibility())
                        .isDeleted(photo.getIsDeleted())
                        .createdBy(photo.getCreatedBy())
                        .updatedBy(photo.getUpdatedBy())
                        .revision(photo.getRevision())
                        .createTime(formatDateTime(photo.getCreateTime()))
                        .updateTime(formatDateTime(photo.getUpdateTime()))
                        .build())
                .collect(Collectors.toList());
    }

    private List<SpaceArchiveSnapshot.Anniversary> buildAnniversaries(Long spaceId) {
        return anniversaryMapper.selectAllBySpaceIdForArchive(spaceId).stream()
                .map(anniversary -> SpaceArchiveSnapshot.Anniversary.builder()
                        .id(anniversary.getId())
                        .spaceId(anniversary.getSpaceId())
                        .title(anniversary.getTitle())
                        .description(anniversary.getDescription())
                        .anniversaryDate(formatDate(anniversary.getAnniversaryDate()))
                        .repeatType(anniversary.getRepeatType())
                        .category(anniversary.getCategory())
                        .colorCode(anniversary.getColorCode())
                        .location(anniversary.getLocation())
                        .sortOrder(anniversary.getSortOrder())
                        .visibility(anniversary.getVisibility())
                        .isDeleted(anniversary.getIsDeleted())
                        .createdBy(anniversary.getCreatedBy())
                        .updatedBy(anniversary.getUpdatedBy())
                        .revision(anniversary.getRevision())
                        .createTime(formatDateTime(anniversary.getCreateTime()))
                        .updateTime(formatDateTime(anniversary.getUpdateTime()))
                        .build())
                .collect(Collectors.toList());
    }

    private List<SpaceArchiveSnapshot.Message> buildMessages(Long spaceId) {
        return messageMapper.selectAllBySpaceIdForArchive(spaceId).stream()
                .map(message -> SpaceArchiveSnapshot.Message.builder()
                        .id(message.getId())
                        .spaceId(message.getSpaceId())
                        .userId(message.getUserId())
                        .content(message.getContent())
                        .isDeleted(message.getIsDeleted())
                        .createTime(formatDateTime(message.getCreateTime()))
                        .updateTime(formatDateTime(message.getUpdateTime()))
                        .build())
                .collect(Collectors.toList());
    }

    private List<SpaceArchiveSnapshot.MessageReply> buildMessageReplies(Long spaceId) {
        return messageReplyMapper.selectAllBySpaceIdForArchive(spaceId).stream()
                .map(reply -> SpaceArchiveSnapshot.MessageReply.builder()
                        .id(reply.getId())
                        .spaceId(reply.getSpaceId())
                        .messageId(reply.getMessageId())
                        .parentReplyId(reply.getParentReplyId())
                        .fromUserId(reply.getFromUserId())
                        .toUserId(reply.getToUserId())
                        .content(reply.getContent())
                        .isDeleted(reply.getIsDeleted())
                        .createTime(formatDateTime(reply.getCreateTime()))
                        .updateTime(formatDateTime(reply.getUpdateTime()))
                        .build())
                .collect(Collectors.toList());
    }

    private List<SpaceArchiveSnapshot.ReviewSubmission> buildReviewSubmissions(Long spaceId) {
        return spaceReviewSubmissionMapper.selectAllBySpaceIdForArchive(spaceId).stream()
                .map(submission -> SpaceArchiveSnapshot.ReviewSubmission.builder()
                        .id(submission.getId())
                        .spaceId(submission.getSpaceId())
                        .submittedBy(submission.getSubmittedBy())
                        .status(submission.getStatus())
                        .reviewType(submission.getReviewType())
                        .baseRevision(submission.getBaseRevision())
                        .pendingFlag(submission.getPendingFlag())
                        .changeSummary(submission.getChangeSummary())
                        .handledBy(submission.getHandledBy())
                        .handledAt(formatDateTime(submission.getHandledAt()))
                        .rejectReason(submission.getRejectReason())
                        .createTime(formatDateTime(submission.getCreateTime()))
                        .updateTime(formatDateTime(submission.getUpdateTime()))
                        .build())
                .collect(Collectors.toList());
    }

    private List<SpaceArchiveSnapshot.ReviewItem> buildReviewItems(Long spaceId) {
        return spaceReviewItemMapper.selectAllBySpaceIdForArchive(spaceId).stream()
                .map(item -> SpaceArchiveSnapshot.ReviewItem.builder()
                        .id(item.getId())
                        .submissionId(item.getSubmissionId())
                        .spaceId(item.getSpaceId())
                        .itemType(item.getItemType())
                        .itemId(item.getItemId())
                        .action(item.getAction())
                        .baseRevision(item.getBaseRevision())
                        .snapshotJson(item.getSnapshotJson())
                        .itemStatus(item.getItemStatus())
                        .rejectReason(item.getRejectReason())
                        .handledBy(item.getHandledBy())
                        .handledAt(formatDateTime(item.getHandledAt()))
                        .createTime(formatDateTime(item.getCreateTime()))
                        .updateTime(formatDateTime(item.getUpdateTime()))
                        .build())
                .collect(Collectors.toList());
    }

    private List<SpaceArchiveSnapshot.PublishedItem> buildPublishedItems(Long spaceId) {
        return spacePublishedItemMapper.selectAllBySpaceIdForArchive(spaceId).stream()
                .map(item -> SpaceArchiveSnapshot.PublishedItem.builder()
                        .id(item.getId())
                        .spaceId(item.getSpaceId())
                        .itemType(item.getItemType())
                        .itemId(item.getItemId())
                        .revision(item.getRevision())
                        .snapshotJson(item.getSnapshotJson())
                        .publishStatus(item.getPublishStatus())
                        .publishedAt(formatDateTime(item.getPublishedAt()))
                        .unpublishedAt(formatDateTime(item.getUnpublishedAt()))
                        .unpublishReason(item.getUnpublishReason())
                        .createTime(formatDateTime(item.getCreateTime()))
                        .updateTime(formatDateTime(item.getUpdateTime()))
                        .build())
                .collect(Collectors.toList());
    }

    private void addUrl(Set<String> urls, String value) {
        String text = StrUtil.trimToNull(value);
        if (text == null) {
            return;
        }
        // 主页配置里既有图片 URL，也有纯文本（如名字、日期）。只统计看起来像资源引用的值。
        if (text.startsWith("http://") || text.startsWith("https://")) {
            urls.add(text);
        }
    }

    /**
     * 快照里的成员关系应恰好是「创建者一名有效成员」，其余历史关系不该出现在等待绑定阶段。
     * 供调用方在写入留档前做最后一致性断言。
     */
    public boolean hasOnlyCreatorMember(SpaceArchiveSnapshot snapshot, Long creatorUserId) {
        if (snapshot == null || creatorUserId == null) {
            return false;
        }
        List<SpaceArchiveSnapshot.Member> activeMembers = snapshot.membersOrEmpty().stream()
                .filter(member -> Objects.equals(member.getStatus(), 1))
                .collect(Collectors.toList());
        if (activeMembers.size() != 1) {
            return false;
        }
        return Objects.equals(activeMembers.get(0).getUserId(), creatorUserId);
    }

    /**
     * 统计快照内容数量，供后台列表展示与留档摘要使用。
     */
    public SnapshotCounts countContents(SpaceArchiveSnapshot snapshot) {
        if (snapshot == null) {
            return new SnapshotCounts(0, 0, 0, 0, 0);
        }
        return new SnapshotCounts(
                snapshot.membersOrEmpty().size(),
                snapshot.storyNodesOrEmpty().size(),
                snapshot.photosOrEmpty().size(),
                snapshot.messagesOrEmpty().size(),
                snapshot.anniversariesOrEmpty().size());
    }

    /**
     * 快照内容计数。
     */
    public static final class SnapshotCounts {

        private final int members;
        private final int stories;
        private final int photos;
        private final int messages;
        private final int anniversaries;

        SnapshotCounts(int members, int stories, int photos, int messages, int anniversaries) {
            this.members = members;
            this.stories = stories;
            this.photos = photos;
            this.messages = messages;
            this.anniversaries = anniversaries;
        }

        public int getMembers() {
            return members;
        }

        public int getStories() {
            return stories;
        }

        public int getPhotos() {
            return photos;
        }

        public int getMessages() {
            return messages;
        }

        public int getAnniversaries() {
            return anniversaries;
        }
    }

    private String formatDateTime(LocalDateTime time) {
        return time == null ? null : DATE_TIME_FORMATTER.format(time);
    }

    private String formatDate(LocalDate date) {
        return date == null ? null : date.toString();
    }
}
