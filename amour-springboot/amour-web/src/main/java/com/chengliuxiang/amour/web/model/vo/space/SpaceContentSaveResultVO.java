package com.chengliuxiang.amour.web.model.vo.space;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 用户端保存公开内容后的审核结果。
 *
 * <p>保留 data.id 兼容原有调用方，同时用 reviewStatus / reviewMessage
 * 明确区分「已保存」「等待审核」「广场仍展示旧版本」。</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpaceContentSaveResultVO {

    private Long id;

    /**
     * PUBLISHED / PENDING / REJECTED / UNPUBLISHED / DRAFT，无需审核时为空。
     */
    private String reviewStatus;

    private String reviewMessage;

    /**
     * 该内容当前是否已在恋爱广场展示。
     */
    private Boolean published;
}
