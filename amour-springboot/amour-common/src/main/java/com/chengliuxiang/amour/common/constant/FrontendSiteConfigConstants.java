package com.chengliuxiang.amour.common.constant;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * 前台可公开读取的平台配置键白名单。
 *
 * <p>这些键存放在 platform_config，由管理控制台维护；情侣空间自身的
 * couple_space_config 不会写入这些值，避免把全站默认资源误认为用户上传内容。</p>
 */
public final class FrontendSiteConfigConstants {

    /** 首页发起人默认头像（用户未配置空间头像且个人资料也没有头像时使用）。 */
    public static final String DEFAULT_COUPLE_AVATAR_BOY = "frontend.default_couple_avatar_boy";
    /** 首页另一半默认头像。 */
    public static final String DEFAULT_COUPLE_AVATAR_GIRL = "frontend.default_couple_avatar_girl";
    /** 首页主视觉照片一默认图。 */
    public static final String DEFAULT_COUPLE_HERO_PHOTO_1 = "frontend.default_couple_hero_photo_1";
    /** 首页主视觉照片二默认图。 */
    public static final String DEFAULT_COUPLE_HERO_PHOTO_2 = "frontend.default_couple_hero_photo_2";

    /**
     * 公开接口允许返回的默认图片键；顺序与首页展示顺序一致。
     * 仅限图片类型，且服务端会再次校验 URL 合法性。
     */
    public static final List<String> DEFAULT_IMAGE_KEYS = Collections.unmodifiableList(Arrays.asList(
            DEFAULT_COUPLE_AVATAR_BOY,
            DEFAULT_COUPLE_AVATAR_GIRL,
            DEFAULT_COUPLE_HERO_PHOTO_1,
            DEFAULT_COUPLE_HERO_PHOTO_2));

    private FrontendSiteConfigConstants() {
    }
}
