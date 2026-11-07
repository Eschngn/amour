package com.chengliuxiang.amour.web.model.vo.space;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 空间整体公开/隐藏结果。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpaceVisibilityVO {

    private Long spaceId;

    /**
     * 空间状态：0-等待绑定 1-正常 2-冻结 3-已归档。
     */
    private Integer status;

    private String statusText;

    /**
     * 空间可见性：0-私密 1-公开到恋爱广场。
     */
    private Integer visibility;

    /**
     * 首次公开时间，隐藏、恢复或再次公开都不会刷新。
     */
    private LocalDateTime publicAt;

    /**
     * 当前是否具备公开资格：status=1 且有效成员数为 2。
     */
    private Boolean canSetVisibility;
}
