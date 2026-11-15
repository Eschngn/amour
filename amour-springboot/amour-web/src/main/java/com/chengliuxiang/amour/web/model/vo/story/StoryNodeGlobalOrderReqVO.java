package com.chengliuxiang.amour.web.model.vo.story;

import com.chengliuxiang.amour.web.model.vo.space.SortOrderItemVO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.Valid;
import java.util.List;

/**
 * 故事全局排序：不区分章节，按提交顺序重排全部故事。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoryNodeGlobalOrderReqVO {

    @Valid
    private List<SortOrderItemVO> items;
}
