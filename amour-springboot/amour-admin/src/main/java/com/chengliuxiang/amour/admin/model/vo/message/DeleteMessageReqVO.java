package com.chengliuxiang.amour.admin.model.vo.message;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotBlank;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class DeleteMessageReqVO {

    @NotBlank(message = "留言 ID 不能为空")
    private String messageId;
}
