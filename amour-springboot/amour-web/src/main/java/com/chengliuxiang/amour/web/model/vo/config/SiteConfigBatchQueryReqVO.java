package com.chengliuxiang.amour.web.model.vo.config;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.Size;
import java.util.List;

/**
 * 批量查询前台公开配置。只允许白名单键，超出白名单的键由服务端忽略。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SiteConfigBatchQueryReqVO {

    @Size(max = 20, message = "一次最多查询20个配置键")
    private List<String> configKeys;
}
