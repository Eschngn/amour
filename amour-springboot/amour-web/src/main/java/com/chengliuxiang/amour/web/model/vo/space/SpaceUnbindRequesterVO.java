package com.chengliuxiang.amour.web.model.vo.space;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 解绑申请发起人的公开资料，不暴露内部 userId。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpaceUnbindRequesterVO {

    private String amourId;

    private String displayName;

    private String avatar;
}
