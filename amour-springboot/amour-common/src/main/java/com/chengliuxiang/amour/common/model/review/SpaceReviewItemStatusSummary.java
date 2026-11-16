package com.chengliuxiang.amour.common.model.review;

import com.chengliuxiang.amour.common.constant.SpaceReviewConstants;
import com.chengliuxiang.amour.common.domain.dos.SpaceReviewItemDO;

import java.util.Collection;

/**
 * 单次审核提交内审核项的当前状态汇总。
 *
 * <p>WITHDRAWN / SUPERSEDED 只是历史记录：它们不参与 total、pending、approved、rejected
 * 的统计，也不参与提交级状态计算。否则某个内容恢复为已发布版本后，剩余审核项通过时
 * 会因为 total 仍包含已撤回项而被错误计算成「部分通过」。</p>
 */
public final class SpaceReviewItemStatusSummary {

    private static final SpaceReviewItemStatusSummary EMPTY =
            new SpaceReviewItemStatusSummary(0, 0, 0, 0, 0);

    /** 当前提交中仍然有效的审核项数量，不含已撤回 / 已被替代的历史项。 */
    private final int total;
    private final int pending;
    private final int approved;
    private final int rejected;
    private final int withdrawn;

    private SpaceReviewItemStatusSummary(int total, int pending, int approved,
                                         int rejected, int withdrawn) {
        this.total = total;
        this.pending = pending;
        this.approved = approved;
        this.rejected = rejected;
        this.withdrawn = withdrawn;
    }

    public static SpaceReviewItemStatusSummary of(Collection<SpaceReviewItemDO> items) {
        if (items == null || items.isEmpty()) {
            return EMPTY;
        }
        int pending = 0;
        int approved = 0;
        int rejected = 0;
        int withdrawn = 0;
        for (SpaceReviewItemDO item : items) {
            String itemStatus = item == null ? null : item.getItemStatus();
            if (SpaceReviewConstants.ITEM_STATUS_PENDING.equals(itemStatus)) {
                pending++;
            } else if (SpaceReviewConstants.ITEM_STATUS_APPROVED.equals(itemStatus)) {
                approved++;
            } else if (SpaceReviewConstants.ITEM_STATUS_REJECTED.equals(itemStatus)) {
                rejected++;
            } else if (SpaceReviewConstants.ITEM_STATUS_WITHDRAWN.equals(itemStatus)) {
                withdrawn++;
            }
            // SUPERSEDED 与未知状态同样不计入当前提交统计。
        }
        return new SpaceReviewItemStatusSummary(pending + approved + rejected,
                pending, approved, rejected, withdrawn);
    }

    /**
     * 按当前有效审核项计算提交级状态。
     *
     * <p>没有有效审核项时提交已经结束，按 WITHDRAWN 收尾，不再满足 pending 查询。</p>
     */
    public String resolveSubmissionStatus() {
        if (pending > 0) {
            return SpaceReviewConstants.STATUS_PENDING;
        }
        if (total == 0) {
            return SpaceReviewConstants.STATUS_WITHDRAWN;
        }
        if (approved == total) {
            return SpaceReviewConstants.STATUS_APPROVED;
        }
        if (approved == 0) {
            return rejected > 0
                    ? SpaceReviewConstants.STATUS_REJECTED
                    : SpaceReviewConstants.STATUS_WITHDRAWN;
        }
        return SpaceReviewConstants.STATUS_PARTIALLY_APPROVED;
    }

    public int getTotal() {
        return total;
    }

    public int getPending() {
        return pending;
    }

    public int getApproved() {
        return approved;
    }

    public int getRejected() {
        return rejected;
    }

    public int getWithdrawn() {
        return withdrawn;
    }
}
