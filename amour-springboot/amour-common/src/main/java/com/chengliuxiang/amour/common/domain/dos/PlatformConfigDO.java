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
@AllArgsConstructor
@NoArgsConstructor
@Builder
@TableName("platform_config")
public class PlatformConfigDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String configKey;

    private String configName;

    private String configValue;

    /**
     * 值类型：text-文本 image-图片 number-数字 json-JSON
     */
    private String valueType;

    private Integer sortOrder;

    private String remark;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
