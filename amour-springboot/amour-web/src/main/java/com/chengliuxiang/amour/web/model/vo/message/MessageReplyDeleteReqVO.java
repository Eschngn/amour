package com.chengliuxiang.amour.web.model.vo.message;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotBlank;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageReplyDeleteReqVO {

    @NotBlank(message = "回复 ID 不能为空")
    private String replyId;
}
