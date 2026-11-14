package com.chengliuxiang.amour.web.service;

import com.chengliuxiang.amour.web.model.vo.space.SpaceContentSaveResultVO;
import com.chengliuxiang.amour.web.model.vo.space.SpaceItemReviewStateVO;
import com.chengliuxiang.amour.web.model.vo.space.SpaceReviewStatusVO;
import com.chengliuxiang.amour.common.utils.Response;

import java.util.Map;

/**
 * 情侣空间公开审核（用户端）。
 *
 * <p>所有公开内容都必须经过审核后才会进入恋爱广场；成员可见、隐藏与删除
 * 属于缩小公开范围的操作，立即生效，不需要审核。</p>
 */
public interface SpaceReviewService {

    /**
     * 查询当前空间的公开审核状态。
     */
    Response<SpaceReviewStatusVO> getStatus();

    /**
     * 按空间查询审核摘要，供空间服务组装响应使用；调用方必须先完成成员校验。
     */
    SpaceReviewStatusVO getStatusForSpace(Long spaceId);

    /**
     * 在修改公开空间的数据之前调用：如果这是历史公开空间（没有已发布快照），
     * 先把当前公开数据固化为已发布版本，保证本次修改不会直接改变广场展示。
     */
    void prepareForPublicEdit(Long spaceId);

    /**
     * 申请首次公开或重新公开，生成包含空间信息、主页配置与全部公开内容的待审核提交。
     */
    void submitSpacePublish(Long spaceId, Long userId);

    /**
     * 被驳回或部分通过后，基于当前工作数据重新生成完整公开审核提交。
     */
    Response<SpaceReviewStatusVO> resubmit();

    /**
     * 撤回当前空间的待审核提交（用户取消公开或管理员下架）。
     */
    void withdrawPending(Long spaceId, Long userId, String reason);

    /**
     * 内容保存（故事/照片/纪念日）成功后同步审核状态。
     *
     * <p>服务会按 spaceId + 内容 ID 重新读取工作数据并生成公开快照，
     * 不接受客户端提交的快照内容。</p>
     *
     * @param deleted 是否已删除
     */
    SpaceContentSaveResultVO onContentSaved(Long spaceId, Long userId, String itemType,
                                            Long itemId, boolean deleted);

    /**
     * 空间首页（名称、简介、恋爱开始时间、主页配置）保存成功后同步审核状态。
     */
    SpaceContentSaveResultVO onHomeSaved(Long spaceId, Long userId, String changeSummary);

    /**
     * 加载空间内各内容项的审核状态，key 为 ITEM_TYPE:itemId。
     */
    Map<String, SpaceItemReviewStateVO> loadItemReviewStates(Long spaceId);
}
