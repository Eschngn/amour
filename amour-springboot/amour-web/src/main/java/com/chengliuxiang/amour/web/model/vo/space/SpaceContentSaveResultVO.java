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

    /**
     * 本次保存是否真正改变了内容。false 表示服务端识别为重复保存，
     * 未递增版本号、未创建或更新待审核项。
     */
    private Boolean changed;

    /**
     * 保存后的工作数据与当前已发布快照完全一致：原先的待审核项已被撤回，
     * 本次没有产生新的审核项。前端据此展示「已恢复为当前公开版本」。
     */
    private Boolean restoredToPublished;
}
