package com.chengliuxiang.amour.web.utils;

import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.web.model.vo.space.SortOrderItemVO;
import org.springframework.util.CollectionUtils;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 批量排序的公共校验与规范化逻辑。
 *
 * <p>排序值由服务端统一生成 10、20、30……；客户端提交的排序值只用于确定提交顺序，
 * 必须为 1 到 1,000,000 之间的整数。重复 ID、缺失排序值或越界值都会被拒绝。</p>
 */
public final class SpaceSortOrderUtils {

    private static final int SORT_STEP = 10;

    private SpaceSortOrderUtils() {
    }

    /**
     * 校验排序项并返回按目标顺序排列的内容 ID。
     *
     * @throws BizException 排序项为空、ID 为空或存在重复 ID 时抛出参数错误
     */
    public static List<Long> orderedDistinctIds(List<SortOrderItemVO> items) {
        if (CollectionUtils.isEmpty(items)) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        Set<Long> seen = new HashSet<>();
        for (SortOrderItemVO item : items) {
            // 排序值由前端按 10、20… 生成，缺失、非正数或越界值一律拒绝。
            if (item == null || item.getId() == null
                    || item.getSortOrder() == null
                    || item.getSortOrder() < 1
                    || item.getSortOrder() > 1_000_000
                    || !seen.add(item.getId())) {
                throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
            }
        }
        List<SortOrderItemVO> sorted = new ArrayList<>(items);
        // List.sort 是稳定排序：同值项保持客户端提交的先后顺序。
        sorted.sort(Comparator.comparingInt(item -> item.getSortOrder() == null
                ? Integer.MAX_VALUE : item.getSortOrder()));
        return sorted.stream().map(SortOrderItemVO::getId).collect(Collectors.toList());
    }

    /** 第 index 项（从 0 开始）的规范化排序值：10、20、30…… */
    public static int sortOrderAt(int index) {
        return (index + 1) * SORT_STEP;
    }
}
