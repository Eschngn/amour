package com.chengliuxiang.amour.admin.model.vo.message;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class FindMessagePageListRspVO {
    private String messageId;
    private String userName;
    private String content;
    private Long replyCount;
    private String createTime;
}
