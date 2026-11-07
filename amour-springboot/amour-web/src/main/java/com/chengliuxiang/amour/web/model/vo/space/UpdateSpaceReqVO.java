package com.chengliuxiang.amour.web.model.vo.space;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.Size;
import java.time.LocalDateTime;

/**
 * 编辑情侣空间基础信息。
 *
 * <p>只允许在等待另一半加入（status=0 且只有一名有效成员）时使用。</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateSpaceReqVO {

    @Size(max = 30, message = "空间名称不能超过 30 个字符")
    private String spaceName;

    @Size(max = 500, message = "空间简介不能超过 500 个字符")
    private String description;

    /**
     * 恋爱开始时间，可为空。
     */
    private LocalDateTime loveStartTime;
}
