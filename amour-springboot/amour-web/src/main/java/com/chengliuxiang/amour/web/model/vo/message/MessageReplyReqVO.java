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
public class MessageReplyReqVO {

    @NotBlank(message = "留言 ID 不能为空")
    private String messageId;

    /**
     * 可选。传入时表示回复某条已有回复，否则回复留言作者。
     */
    private String replyId;

    @NotBlank(message = "回复内容不能为空")
    private String content;
}
