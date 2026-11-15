package com.chengliuxiang.amour.web.model.vo.story;

import com.chengliuxiang.amour.web.model.vo.space.SortOrderItemVO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.Valid;
import javax.validation.constraints.NotNull;
import java.util.List;

/**
 * 故事批量排序：必须指定章节，只允许调整该章节内部的故事顺序。
 *
 * <p>items 允许为空：空列表表示无需调整，接口直接返回当前章节顺序。</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoryNodeOrderReqVO {

    @NotNull(message = "章节 ID 不能为空")
    private Long chapterId;

    @Valid
    private List<SortOrderItemVO> items;
}
