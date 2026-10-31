package com.chengliuxiang.amour.common.domain.dos;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName("couple_member")
public class CoupleMemberDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long spaceId;

    private Long userId;

    /**
     * 成员身份：1-空间发起人 2-另一半
     */
    private Integer memberRole;

    /**
     * 成员状态：0-邀请中 1-有效 2-暂停 3-已退出 4-已移除
     */
    private Integer status;

    private LocalDateTime joinedAt;

    private LocalDateTime leftAt;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
