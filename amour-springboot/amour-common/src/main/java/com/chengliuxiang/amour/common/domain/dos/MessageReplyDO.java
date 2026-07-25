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

    /**
     * 回复留言的 ID
     */
    @TableId(type = IdType.AUTO)
    private String id;

    /**
     * 留言 ID
     */
    private String messageId;

    /**
     * 父回复 ID。为空时表示直接回复留言。
     */
    private String parentReplyId;

    /**
     * 回复人
     */
    private String fromUserId;

    /**
     * 被回复人
     */
    private String toUserId;

    private String content;

    private LocalDateTime createTime;

    private Boolean isDeleted;
}
