package com.chengliuxiang.amour.common.constant;

/**
 * 内容治理统一语义。
 *
 * <p>故事、照片、纪念日以及空间自身的可见性均使用 0/1/2，后台不得再把
 * 「成员可见」和「公开」压成同一个布尔值。</p>
 */
public final class ContentGovernanceConstants {

    public static final int VISIBILITY_MEMBER_ONLY = 0;
    public static final int VISIBILITY_PUBLIC = 1;
    public static final int VISIBILITY_HIDDEN = 2;

    public static final String TYPE_SPACE = "space";
    public static final String TYPE_STORY = "story";
    public static final String TYPE_PHOTO = "photo";
    public static final String TYPE_ANNIVERSARY = "anniversary";
    public static final String TYPE_MESSAGE = "message";

    private ContentGovernanceConstants() {
    }

    public static boolean isSupportedContentType(String contentType) {
        return TYPE_STORY.equals(contentType)
                || TYPE_PHOTO.equals(contentType)
                || TYPE_ANNIVERSARY.equals(contentType)
                || TYPE_MESSAGE.equals(contentType);
    }

    public static boolean isValidVisibility(Integer visibility) {
        return visibility != null
                && (visibility == VISIBILITY_MEMBER_ONLY
                || visibility == VISIBILITY_PUBLIC
                || visibility == VISIBILITY_HIDDEN);
    }

    public static String visibilityText(Integer visibility) {
        if (visibility == null) {
            return "";
        }
        switch (visibility) {
            case VISIBILITY_MEMBER_ONLY:
                return "仅空间成员可见";
            case VISIBILITY_PUBLIC:
                return "公开";
            case VISIBILITY_HIDDEN:
                return "隐藏";
            default:
                return "未知状态";
        }
    }

    public static String contentTypeText(String contentType) {
        if (TYPE_SPACE.equals(contentType)) {
            return "情侣空间";
        }
        if (TYPE_STORY.equals(contentType)) {
            return "故事";
        }
        if (TYPE_PHOTO.equals(contentType)) {
            return "照片";
        }
        if (TYPE_ANNIVERSARY.equals(contentType)) {
            return "纪念日";
        }
        if (TYPE_MESSAGE.equals(contentType)) {
            return "留言";
        }
        return "未知内容";
    }
}
