package com.chengliuxiang.amour.common.exception;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class BizException extends RuntimeException{
    // 异常码
    private String errorCode;
    // 错误信息
    private String errorMessage;

    public BizException(BaseExceptionInterface baseExceptionInterface) {
        this.errorCode = baseExceptionInterface.getErrorCode();
        this.errorMessage = baseExceptionInterface.getErrorMessage();
    }

    /**
     * 带上下文的业务异常：用于需要把冲突空间标识等信息告诉调用方的场景。
     * 错误信息会直接返回前端，调用方不得拼接密码、openid 或邀请明文 token。
     */
    public BizException(String errorCode, String errorMessage) {
        this.errorCode = errorCode;
        this.errorMessage = errorMessage;
    }
}
