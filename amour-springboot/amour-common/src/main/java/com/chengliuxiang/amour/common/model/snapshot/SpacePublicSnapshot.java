package com.chengliuxiang.amour.common.model.snapshot;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 空间级公开快照。
 *
 * <p>只保存允许公开展示的字段；时间统一格式化为字符串，
 * 便于在 SQLite / MySQL 的 TEXT 字段中保存并做差异比较。</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpacePublicSnapshot {

    private Long spaceId;

    private String spaceCode;

    private String spaceName;

    private String description;

    private String coverImage;

    private String loveStartTime;

    private String publicAt;
}
