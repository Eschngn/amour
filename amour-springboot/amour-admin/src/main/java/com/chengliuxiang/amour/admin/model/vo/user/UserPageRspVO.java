package com.chengliuxiang.amour.admin.model.vo.user;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserPageRspVO {
    private Long id;
    private String amourId;
    private String username;
    private String displayName;
    private String avatar;
    private Boolean status;
    private Boolean platformAdmin;
    private String createTime;
    private String updateTime;
}
