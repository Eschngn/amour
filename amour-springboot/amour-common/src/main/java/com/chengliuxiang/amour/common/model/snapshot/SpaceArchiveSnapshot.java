package com.chengliuxiang.amour.common.model.snapshot;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * 情侣空间销毁留档的完整快照。
 *
 * <p>用途：创建者在「另一半尚未加入」时销毁空间后，管理员可以据此把空间及其全部依赖业务数据
 * 恢复到销毁前的状态。快照覆盖：空间资料、成员关系、空间配置、故事章节 / 故事 / 故事图片、
 * 相册分类 / 照片、纪念日、留言 / 回复、公开审核提交 / 审核项、已发布版本。</p>
 *
 * <p>约定：</p>
 * <ul>
 *     <li>时间字段统一为 {@code yyyy-MM-dd HH:mm:ss} 字符串，与项目其余快照一致，
 *         便于在 SQLite / MySQL 的 TEXT 字段中保存；</li>
 *     <li>只保存业务字段，不保存密码、openid、邀请明文 token、对象存储密钥；</li>
 *     <li>图片类字段保存可访问 URL 引用，销毁不会触发对象存储物理删除，
 *         恢复后按原引用继续访问。</li>
 * </ul>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
// JsonUtil 使用独立 ObjectMapper，全局 unknown-properties 配置不生效，历史快照必须在此显式兼容。
@JsonIgnoreProperties(ignoreUnknown = true)
public class SpaceArchiveSnapshot {

    /**
     * 快照结构版本，恢复时用于兼容性校验。
     */
    public static final int CURRENT_VERSION = 1;

    private Integer snapshotVersion;

    private Space space;

    private List<Member> members;

    private List<SpaceConfig> configs;

    private List<StoryChapter> storyChapters;

    private List<StoryNode> storyNodes;

    private List<StoryNodeImage> storyNodeImages;

    private List<PhotoCategory> photoCategories;

    private List<Photo> photos;

    private List<Anniversary> anniversaries;

    private List<Message> messages;

    private List<MessageReply> messageReplies;

    private List<ReviewSubmission> reviewSubmissions;

    private List<ReviewItem> reviewItems;

    private List<PublishedItem> publishedItems;

    /**
     * 判断快照是否可用于恢复：版本受支持且空间主体存在。
     *
     * <p>标记 {@link JsonIgnore}：这是派生判断，不应写入快照 JSON，
     * 否则反序列化时会因为多出未知字段而失败。</p>
     */
    @JsonIgnore
    public boolean isRestorable() {
        return snapshotVersion != null
                && snapshotVersion == CURRENT_VERSION
                && space != null
                && space.getSpaceId() != null;
    }

    @JsonIgnore
    public List<Member> membersOrEmpty() {
        return members == null ? new ArrayList<>() : members;
    }

    @JsonIgnore
    public List<SpaceConfig> configsOrEmpty() {
        return configs == null ? new ArrayList<>() : configs;
    }

    @JsonIgnore
    public List<StoryChapter> storyChaptersOrEmpty() {
        return storyChapters == null ? new ArrayList<>() : storyChapters;
    }

    @JsonIgnore
    public List<StoryNode> storyNodesOrEmpty() {
        return storyNodes == null ? new ArrayList<>() : storyNodes;
    }

    @JsonIgnore
    public List<StoryNodeImage> storyNodeImagesOrEmpty() {
        return storyNodeImages == null ? new ArrayList<>() : storyNodeImages;
    }

    @JsonIgnore
    public List<PhotoCategory> photoCategoriesOrEmpty() {
        return photoCategories == null ? new ArrayList<>() : photoCategories;
    }

    @JsonIgnore
    public List<Photo> photosOrEmpty() {
        return photos == null ? new ArrayList<>() : photos;
    }

    @JsonIgnore
    public List<Anniversary> anniversariesOrEmpty() {
        return anniversaries == null ? new ArrayList<>() : anniversaries;
    }

    @JsonIgnore
    public List<Message> messagesOrEmpty() {
        return messages == null ? new ArrayList<>() : messages;
    }

    @JsonIgnore
    public List<MessageReply> messageRepliesOrEmpty() {
        return messageReplies == null ? new ArrayList<>() : messageReplies;
    }

    @JsonIgnore
    public List<ReviewSubmission> reviewSubmissionsOrEmpty() {
        return reviewSubmissions == null ? new ArrayList<>() : reviewSubmissions;
    }

    @JsonIgnore
    public List<ReviewItem> reviewItemsOrEmpty() {
        return reviewItems == null ? new ArrayList<>() : reviewItems;
    }

    @JsonIgnore
    public List<PublishedItem> publishedItemsOrEmpty() {
        return publishedItems == null ? new ArrayList<>() : publishedItems;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Space {
        private Long spaceId;
        private String spaceCode;
        private String spaceName;
        private String description;
        private String coverImage;
        private Integer status;
        private Integer visibility;
        private String loveStartTime;
        private String publicAt;
        private String archivedAt;
        private String deleteAfter;
        private Long createdBy;
        private Integer revision;
        private String createTime;
        private String updateTime;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Member {
        private Long id;
        private Long spaceId;
        private Long userId;
        private Integer memberRole;
        private Integer status;
        private String joinedAt;
        private String leftAt;
        private String createTime;
        private String updateTime;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SpaceConfig {
        private Long id;
        private Long spaceId;
        private String configKey;
        private String configValue;
        private String valueType;
        private Long createdBy;
        private Integer revision;
        private String createTime;
        private String updateTime;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class StoryChapter {
        private Long id;
        private Long spaceId;
        private String name;
        private Integer sortOrder;
        private Boolean isVisible;
        private Long createdBy;
        private String createTime;
        private String updateTime;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class StoryNode {
        private Long id;
        private Long spaceId;
        private Long chapterId;
        private String title;
        private String summary;
        private String content;
        private String happenedTime;
        private Boolean showTime;
        private String location;
        private String coverImage;
        private String tagLabel;
        private Integer sortOrder;
        private Integer globalSortOrder;
        private Boolean isMilestone;
        private Integer visibility;
        private Boolean isDeleted;
        private Long createdBy;
        private Long updatedBy;
        private Integer revision;
        private String createTime;
        private String updateTime;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StoryNodeImage {
        private Long id;
        private Long spaceId;
        private Long nodeId;
        private String url;
        private String altText;
        private Integer sortOrder;
        private Long createdBy;
        private String createTime;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PhotoCategory {
        private Long id;
        private Long spaceId;
        private String categoryName;
        private Integer sortOrder;
        private Boolean isEnabled;
        private String remark;
        private Long createdBy;
        private String createTime;
        private String updateTime;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Photo {
        private Long id;
        private Long spaceId;
        private Long photoCategoryId;
        private String title;
        private String description;
        private String url;
        private String takenTime;
        private Boolean showTime;
        private String location;
        private Integer sortOrder;
        private Integer globalSortOrder;
        private Boolean isCover;
        private Integer visibility;
        private Boolean isDeleted;
        private Long createdBy;
        private Long updatedBy;
        private Integer revision;
        private String createTime;
        private String updateTime;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Anniversary {
        private Long id;
        private Long spaceId;
        private String title;
        private String description;
        private String anniversaryDate;
        private Integer repeatType;
        private String category;
        private String location;
        private Integer sortOrder;
        private Integer visibility;
        private Boolean isDeleted;
        private Long createdBy;
        private Long updatedBy;
        private Integer revision;
        private String createTime;
        private String updateTime;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Message {
        private Long id;
        private Long spaceId;
        private Long userId;
        private String content;
        private Boolean isDeleted;
        private String createTime;
        private String updateTime;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MessageReply {
        private Long id;
        private Long spaceId;
        private Long messageId;
        private Long parentReplyId;
        private Long fromUserId;
        private Long toUserId;
        private String content;
        private Boolean isDeleted;
        private String createTime;
        private String updateTime;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReviewSubmission {
        private Long id;
        private Long spaceId;
        private Long submittedBy;
        private String status;
        private String reviewType;
        private Integer baseRevision;
        private Integer pendingFlag;
        private String changeSummary;
        private Long handledBy;
        private String handledAt;
        private String rejectReason;
        private String createTime;
        private String updateTime;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReviewItem {
        private Long id;
        private Long submissionId;
        private Long spaceId;
        private String itemType;
        private Long itemId;
        private String action;
        private Integer baseRevision;
        private String snapshotJson;
        private String itemStatus;
        private String rejectReason;
        private Long handledBy;
        private String handledAt;
        private String createTime;
        private String updateTime;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PublishedItem {
        private Long id;
        private Long spaceId;
        private String itemType;
        private Long itemId;
        private Integer revision;
        private String snapshotJson;
        private Integer publishStatus;
        private String publishedAt;
        private String unpublishedAt;
        private String unpublishReason;
        private String createTime;
        private String updateTime;
    }
}
