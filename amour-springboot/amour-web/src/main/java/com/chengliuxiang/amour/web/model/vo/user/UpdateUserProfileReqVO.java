package com.chengliuxiang.amour.web.model.vo.user;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Pattern;
import javax.validation.constraints.Size;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserProfileReqVO {

    @NotBlank(message = "用户名不能为空")
    @Size(min = 2, max = 30, message = "用户名长度需为 2-30 个字符")
    @Pattern(regexp = "^[\\p{L}\\p{N}_.-]+$", message = "用户名只能包含文字、数字、下划线、点和横线")
    private String username;

    @NotBlank(message = "展示名称不能为空")
    @Size(max = 20, message = "展示名称不能超过 20 个字符")
    private String displayName;
}
