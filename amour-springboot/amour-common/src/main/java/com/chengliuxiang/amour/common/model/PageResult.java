package com.chengliuxiang.amour.common.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class PageResult<T> {
    private Long current;
    private Long size;
    private Long total;
    private List<T> records;
}