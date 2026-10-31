package com.chengliuxiang.amour.common.domain.dos;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@TableName("message_reply")
public class MessageReplyDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long spaceId;

    private Long messageId;

    /**
     * 父回复 ID，为空时表示直接回复留言
     */
    private Long parentReplyId;

    private Long fromUserId;

    private Long toUserId;

    private String content;

    private Boolean isDeleted;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
