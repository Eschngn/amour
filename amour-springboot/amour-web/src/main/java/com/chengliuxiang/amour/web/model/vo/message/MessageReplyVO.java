package com.chengliuxiang.amour.web.model.vo.message;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class MessageReplyVO {
    private String replyId;
    private String content;
    private String fromUserName;
    private String fromUserAvatar;
    private String toUserName;
    private Boolean canDelete;
    private LocalDateTime createTime;
}
