package com.chengliuxiang.amour.admin.model.vo.user;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data @Builder
public class UserPageRspVO {
    private Long id;
    private String username;
    private String displayName;
    private String avatar;
    private Boolean status;
    private String wechatOpenid;
    private String createTime;
    private String updateTime;
    private List<Long> roleIds;
    private List<String> roleNames;
}
