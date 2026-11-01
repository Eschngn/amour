package com.chengliuxiang.amour.web.model.vo.space;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.Size;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateSpaceReqVO {

    @Size(max = 30, message = "空间名称不能超过 30 个字符")
    private String spaceName;

    @Size(max = 500, message = "空间简介不能超过 500 个字符")
    private String description;

    /**
     * 恋爱开始时间，可为空。
     */
    private LocalDateTime loveStartTime;
}
