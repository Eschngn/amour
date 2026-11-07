package com.chengliuxiang.amour.web.model.vo.anniversary;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.Size;
import java.time.LocalDate;

/**
 * 用户端新增/编辑纪念日。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnniversarySaveReqVO {

    private Long id;

    @Size(max = 100, message = "纪念日名称不能超过 100 个字符")
    private String title;

    @Size(max = 500, message = "纪念日描述不能超过 500 个字符")
    private String description;

    private LocalDate anniversaryDate;

    /**
     * 0-不重复 1-每年重复。
     */
    private Integer repeatType;

    @Size(max = 30, message = "纪念日分类不正确")
    private String category;

    @Size(max = 20, message = "纪念日主题色格式不正确")
    private String colorCode;

    @Size(max = 100, message = "纪念日地点不能超过 100 个字符")
    private String location;

    private Integer sortOrder;

    private Integer visibility;
}
