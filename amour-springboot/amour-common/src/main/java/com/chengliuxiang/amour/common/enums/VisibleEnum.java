package com.chengliuxiang.amour.common.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum VisibleEnum {
    PUBLIC(1),
    PRIVATE(0);

    private final Integer code;
}
