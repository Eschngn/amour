package com.chengliuxiang.amour.common.model.snapshot;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 空间主页展示配置快照（双方展示名、头像与首页主视觉照片）。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HomeConfigPublicSnapshot {

    @Builder.Default
    private Map<String, String> configs = new LinkedHashMap<>();
}
