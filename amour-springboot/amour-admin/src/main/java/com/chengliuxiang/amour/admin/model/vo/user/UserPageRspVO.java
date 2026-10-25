package com.chengliuxiang.amour.admin.model.vo.user;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data @Builder
public class UserPageRspVO {
    private String id;
    private String username;
    private String displayName;
    private String avatar;
    private Boolean status;
    private String wechatOpenid;
    private String createTime;
    private String updateTime;
    private List<String> roleIds;
    private List<String> roleNames;
}
