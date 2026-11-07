package com.chengliuxiang.amour.common.domain.dos;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 情侣空间解绑申请。
 *
 * <p>解绑改为「一方发起申请、另一方确认」的双人流程：申请记录只追加不物理删除，
 * 状态变更必须使用条件更新，保证同一申请只会被处理一次。</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName("couple_space_unbind_request")
public class CoupleSpaceUnbindRequestDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long spaceId;

    /**
     * 解绑发起人用户ID，必须是该空间当前有效成员。
     */
    private Long requesterUserId;

    /**
     * 申请状态：0-待同意 1-已同意 2-已拒绝 3-已取消
     */
    private Integer status;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;

    /**
     * 申请被处理（同意/拒绝/取消）的时间。
     */
    private LocalDateTime resolvedAt;

    /**
     * 处理申请的「另一方成员」用户ID；取消时为发起人本人。
     */
    private Long resolvedByUserId;
}
