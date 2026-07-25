package com.chengliuxiang.amour.web.model.vo.message;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class MessagePageItemVO {
    private String messageId;
    private String content;
    private String userName;
    private String userAvatar;
    private Boolean canDelete;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    private List<MessageReplyVO> replies;
}
