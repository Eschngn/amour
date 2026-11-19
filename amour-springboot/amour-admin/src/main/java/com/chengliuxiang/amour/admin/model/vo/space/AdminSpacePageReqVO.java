package com.chengliuxiang.amour.admin.model.vo.space;

import lombok.Data;

/**
 * 后台情侣空间分页查询请求。
 *
 * <p>status/visibility 为空表示不限制；后台页面默认传 status=5，用于查看双方已解绑空间。</p>
 */
@Data
public class AdminSpacePageReqVO {

    private Long current;

    private Long size;

    /**
     * 空间名称 / 空间编码关键字。
     */
    private String keyword;

    /**
     * 空间状态：0-等待绑定 1-正常 2-冻结 3-已归档 4-删除等待期 5-已解绑 6-已销毁。
     *
     * <p>已销毁（status=6）的空间同样出现在空间列表中，管理员可据此排障；
     * 从留档恢复请使用 /admin/space/archive/restore。</p>
     */
    private Integer status;

    /**
     * 空间可见性：0-私密 1-公开。
     */
    private Integer visibility;
}
