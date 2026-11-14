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
@TableName("couple_space_config")
public class CoupleSpaceConfigDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long spaceId;

    private String configKey;

    private String configValue;

    /**
     * 值类型：text-文本 datetime-日期时间 image-图片 json-JSON
     */
    private String valueType;

    private Long createdBy;

    /**
     * 配置工作版本号，每次保存成功后递增。
     */
    private Integer revision;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
