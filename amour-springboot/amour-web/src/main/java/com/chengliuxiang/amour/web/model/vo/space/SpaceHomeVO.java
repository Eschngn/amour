package com.chengliuxiang.amour.web.model.vo.space;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 情侣空间首页数据。
 *
 * <p>空间名、简介、恋爱开始时间以 couple_space 为唯一事实来源；
 * 双方显示名、头像与首页主视觉照片读取 couple_space_config（按 space_id 隔离）。
 * 未显式配置时回退到空间成员的个人资料。</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpaceHomeVO {

    private Long spaceId;

    private String spaceName;

    private String description;

    private LocalDateTime loveStartTime;

    private Integer status;

    private String boyName;

    private String girlName;

    private String boyAvatar;

    private String girlAvatar;

    private String heroPhoto1;

    private String heroPhoto2;

    /**
     * 服务端解析出的实际展示值来源：config-空间配置 member-成员资料 default-默认值。
     * 前端据此提示“未单独设置时将使用个人资料”。
     */
    private String boyNameSource;

    private String girlNameSource;

    private String boyAvatarSource;

    private String girlAvatarSource;

    /**
     * 当前登录用户是否可以编辑该空间首页。
     */
    private Boolean canEdit;

    /**
     * 本次保存是否进入公开审核。
     */
    private Boolean reviewPending;

    /**
     * 保存后的审核提示：已保存 / 等待审核 / 广场仍展示旧版本。
     */
    private String reviewMessage;
}
