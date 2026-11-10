package com.chengliuxiang.amour.admin.model.vo.chapter;

import lombok.Data;

@Data
public class FindChapterListReqVO {

    /**
     * 目标空间。缺少时要求 admin:content:cross-space。
     */
    private Long spaceId;
}
