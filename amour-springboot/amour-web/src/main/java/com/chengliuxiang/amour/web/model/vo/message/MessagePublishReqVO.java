package com.chengliuxiang.amour.web.model.vo.message;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotBlank;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class MessagePublishReqVO {
    @NotBlank(message = "留言内容不能为空")
    private String content;
}
