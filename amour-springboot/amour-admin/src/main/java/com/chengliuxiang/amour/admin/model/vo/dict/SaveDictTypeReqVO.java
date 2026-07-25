package com.chengliuxiang.amour.admin.model.vo.dict;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Pattern;
import javax.validation.constraints.Size;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SaveDictTypeReqVO {

    private Long id;

    @NotBlank(message = "字典名称不能为空")
    @Size(max = 64, message = "字典名称不能超过64个字符")
    private String dictName;

    @NotBlank(message = "字典编码不能为空")
    @Size(max = 64, message = "字典编码不能超过64个字符")
    @Pattern(regexp = "^[a-z][a-z0-9_]*$", message = "字典编码只能包含小写字母、数字和下划线，且必须以字母开头")
    private String dictType;

    @NotNull(message = "状态不能为空")
    private Boolean status;

    private Integer sortOrder;

    @Size(max = 255, message = "备注不能超过255个字符")
    private String remark;
}
