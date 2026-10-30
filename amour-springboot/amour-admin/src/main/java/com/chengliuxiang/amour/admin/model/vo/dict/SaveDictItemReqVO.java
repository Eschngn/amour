package com.chengliuxiang.amour.admin.model.vo.dict;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SaveDictItemReqVO {

    private Long id;

    @NotBlank(message = "字典编码不能为空")
    private String dictType;

    @NotBlank(message = "字典标签不能为空")
    @Size(max = 100, message = "字典标签不能超过100个字符")
    private String itemLabel;

    @NotBlank(message = "字典值不能为空")
    @Size(max = 100, message = "字典值不能超过100个字符")
    private String itemValue;

    private String configValue;

    @Size(max = 32, message = "样式标识不能超过32个字符")
    private String cssClass;

    private Integer sortOrder;

    @NotNull(message = "状态不能为空")
    private Boolean status;

    @Size(max = 255, message = "备注不能超过255个字符")
    private String remark;
}
