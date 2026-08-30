package com.chengliuxiang.amour.admin.model.vo.user;

import lombok.Data;
import javax.validation.constraints.NotNull;

@Data
public class UserIdReqVO {
    @NotNull private Long id;
}
