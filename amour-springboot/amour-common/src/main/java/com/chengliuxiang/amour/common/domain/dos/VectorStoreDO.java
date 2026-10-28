package com.chengliuxiang.amour.common.domain.dos;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName("t_vector_store")
public class VectorStoreDO {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    private String content;

    /** JSON text stored in PostgreSQL's json column. */
    private String metadata;

    /** Vector text representation, for example: [0.1,0.2,...]. */
    private String embedding;
}
