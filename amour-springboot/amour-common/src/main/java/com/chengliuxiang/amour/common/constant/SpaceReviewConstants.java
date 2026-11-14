package com.chengliuxiang.amour.common.constant;

/**
 * 情侣空间公开审核的统一语义。
 *
 * <p>审核提交（space_review_submission）聚合一次保存产生的多个审核项
 * （space_review_item）；只有审核通过后，审核项快照才会写入
 * space_published_item，恋爱广场也只读取这张已发布快照表。</p>
 */
public final class SpaceReviewConstants {

    /* -------------------- 审核提交状态 -------------------- */

    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_APPROVED = "APPROVED";
    public static final String STATUS_REJECTED = "REJECTED";
    /**
     * 部分通过：本次提交已经没有待审核项，且同时存在已通过项与已驳回项。
     * 该状态下空间不一定会变为公开，是否公开仍由空间级 visibility 独立决定。
     */
    public static final String STATUS_PARTIALLY_APPROVED = "PARTIALLY_APPROVED";
    public static final String STATUS_WITHDRAWN = "WITHDRAWN";
    public static final String STATUS_SUPERSEDED = "SUPERSEDED";

    /* -------------------- 审核类型 -------------------- */

    public static final String REVIEW_TYPE_FIRST_PUBLISH = "FIRST_PUBLISH";
    public static final String REVIEW_TYPE_CONTENT_UPDATE = "CONTENT_UPDATE";
    public static final String REVIEW_TYPE_REPUBLISH = "REPUBLISH";

    /* -------------------- 审核项类型 -------------------- */

    public static final String ITEM_TYPE_SPACE = "SPACE";
    public static final String ITEM_TYPE_HOME_CONFIG = "HOME_CONFIG";
    public static final String ITEM_TYPE_STORY = "STORY";
    public static final String ITEM_TYPE_PHOTO = "PHOTO";
    public static final String ITEM_TYPE_ANNIVERSARY = "ANNIVERSARY";

    /**
     * 空间级审核项（SPACE / HOME_CONFIG）没有具体内容 ID，统一使用 0，
     * 以便在 SQLite 与 MySQL 上都能建立唯一索引。
     */
    public static final long SINGLE_ITEM_ID = 0L;

    /* -------------------- 审核项动作 -------------------- */

    public static final String ACTION_FIRST_PUBLISH = "FIRST_PUBLISH";
    public static final String ACTION_CREATE = "CREATE";
    public static final String ACTION_UPDATE = "UPDATE";
    public static final String ACTION_REPUBLISH = "REPUBLISH";

    /* -------------------- 审核项状态 -------------------- */

    public static final String ITEM_STATUS_PENDING = "PENDING";
    public static final String ITEM_STATUS_APPROVED = "APPROVED";
    public static final String ITEM_STATUS_REJECTED = "REJECTED";
    public static final String ITEM_STATUS_WITHDRAWN = "WITHDRAWN";
    public static final String ITEM_STATUS_SUPERSEDED = "SUPERSEDED";

    /* -------------------- 已发布快照状态 -------------------- */

    public static final int PUBLISHED = 1;
    public static final int UNPUBLISHED = 0;

    /* -------------------- 用户端审核状态展示 -------------------- */

    public static final String USER_STATE_PUBLISHED = "PUBLISHED";
    public static final String USER_STATE_PENDING = "PENDING";
    public static final String USER_STATE_REJECTED = "REJECTED";
    public static final String USER_STATE_UNPUBLISHED = "UNPUBLISHED";
    public static final String USER_STATE_DRAFT = "DRAFT";

    private SpaceReviewConstants() {
    }

    public static boolean isSubmissionStatus(String status) {
        return STATUS_PENDING.equals(status)
                || STATUS_APPROVED.equals(status)
                || STATUS_REJECTED.equals(status)
                || STATUS_PARTIALLY_APPROVED.equals(status)
                || STATUS_WITHDRAWN.equals(status)
                || STATUS_SUPERSEDED.equals(status);
    }

    public static boolean isReviewType(String reviewType) {
        return REVIEW_TYPE_FIRST_PUBLISH.equals(reviewType)
                || REVIEW_TYPE_CONTENT_UPDATE.equals(reviewType)
                || REVIEW_TYPE_REPUBLISH.equals(reviewType);
    }

    public static boolean isContentItemType(String itemType) {
        return ITEM_TYPE_STORY.equals(itemType)
                || ITEM_TYPE_PHOTO.equals(itemType)
                || ITEM_TYPE_ANNIVERSARY.equals(itemType);
    }

    public static String statusText(String status) {
        if (status == null) {
            return "";
        }
        switch (status) {
            case STATUS_PENDING:
                return "待审核";
            case STATUS_APPROVED:
                return "已通过";
            case STATUS_REJECTED:
                return "已驳回";
            case STATUS_PARTIALLY_APPROVED:
                return "部分通过";
            case STATUS_WITHDRAWN:
                return "已撤回";
            case STATUS_SUPERSEDED:
                return "已被新版本替代";
            default:
                return "未知状态";
        }
    }

    public static String reviewTypeText(String reviewType) {
        if (reviewType == null) {
            return "";
        }
        switch (reviewType) {
            case REVIEW_TYPE_FIRST_PUBLISH:
                return "首次公开";
            case REVIEW_TYPE_CONTENT_UPDATE:
                return "公开内容修改";
            case REVIEW_TYPE_REPUBLISH:
                return "重新公开";
            default:
                return reviewType;
        }
    }

    public static String itemTypeText(String itemType) {
        if (itemType == null) {
            return "";
        }
        switch (itemType) {
            case ITEM_TYPE_SPACE:
                return "空间信息";
            case ITEM_TYPE_HOME_CONFIG:
                return "主页配置";
            case ITEM_TYPE_STORY:
                return "故事";
            case ITEM_TYPE_PHOTO:
                return "照片";
            case ITEM_TYPE_ANNIVERSARY:
                return "纪念日";
            default:
                return itemType;
        }
    }

    public static String actionText(String action) {
        if (action == null) {
            return "";
        }
        switch (action) {
            case ACTION_FIRST_PUBLISH:
                return "首次公开";
            case ACTION_CREATE:
                return "新增公开内容";
            case ACTION_UPDATE:
                return "修改公开内容";
            case ACTION_REPUBLISH:
                return "重新公开";
            default:
                return action;
        }
    }

    public static String itemStatusText(String itemStatus) {
        if (itemStatus == null) {
            return "";
        }
        switch (itemStatus) {
            case ITEM_STATUS_PENDING:
                return "待审核";
            case ITEM_STATUS_APPROVED:
                return "已通过";
            case ITEM_STATUS_REJECTED:
                return "审核未通过";
            case ITEM_STATUS_WITHDRAWN:
                return "已撤回";
            case ITEM_STATUS_SUPERSEDED:
                return "已被新版本替代";
            default:
                return itemStatus;
        }
    }
}
