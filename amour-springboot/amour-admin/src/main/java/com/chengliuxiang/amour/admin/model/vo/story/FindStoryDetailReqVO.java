package com.chengliuxiang.amour.admin.model.vo.story;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotNull;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class FindStoryDetailReqVO {

    @NotNull(message = "故事 ID 不能为空")
    private Long id;

    /**
     * 目标空间；缺少时要求跨空间权限，服务端绝不由管理员账号推导空间。
     */
    private Long spaceId;
}
