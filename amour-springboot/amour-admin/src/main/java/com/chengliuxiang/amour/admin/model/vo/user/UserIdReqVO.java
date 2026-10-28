package com.chengliuxiang.amour.admin.model.vo.user;

import lombok.Data;
import jakarta.validation.constraints.NotNull;

@Data
public class UserIdReqVO {
    @NotNull private String id;
}
