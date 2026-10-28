package com.chengliuxiang.amour.admin.model.vo.dict;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotNull;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeleteDictTypeReqVO {

    @NotNull(message = "字典类型ID不能为空")
    private String id;
}
