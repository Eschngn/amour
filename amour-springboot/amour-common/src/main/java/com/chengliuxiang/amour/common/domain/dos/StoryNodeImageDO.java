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
@TableName("story_node_image")
public class StoryNodeImageDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long nodeId;

    private String url;

    private String altText;

    private Integer sortOrder;

    private LocalDateTime createTime;
}
