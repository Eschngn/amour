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
@TableName("couple_space")
public class CoupleSpaceDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String spaceCode;

    private String spaceName;

    private String description;

    private String coverImage;

    /**
     * 空间状态：0-等待绑定 1-正常 2-冻结 3-历史归档 4-删除等待期 5-已解绑（逻辑删除）
     */
    private Integer status;

    /**
     * 空间可见性：0-私密 1-公开到恋爱广场
     */
    private Integer visibility;

    private LocalDateTime loveStartTime;

    private LocalDateTime publicAt;

    private LocalDateTime archivedAt;

    private LocalDateTime deleteAfter;

    /**
     * 完成解绑（逻辑删除）时间，status=5 时写入；历史归档(status=3)不写该字段。
     */
    private LocalDateTime deletedAt;

    private Long createdBy;

    /**
     * 空间工作版本号，每次空间基础信息或主页配置保存成功后递增。
     * 审核通过时用于判断待审核快照是否仍是最新版本。
     */
    private Integer revision;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
