package com.chengliuxiang.amour.web.model.vo.space;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * 保存情侣空间首页。
 *
 * <p>空间名、简介、恋爱开始时间写入 couple_space；
 * configs 只允许写入服务端白名单中的空间级配置键，禁止客户端任意读写配置表。</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpaceHomeSaveReqVO {

    @Size(max = 30, message = "空间名称不能超过 30 个字符")
    private String spaceName;

    @Size(max = 500, message = "空间简介不能超过 500 个字符")
    private String description;

    private LocalDateTime loveStartTime;

    /**
     * 空间级首页配置，允许的键见 SpaceHomeServiceImpl 中的白名单：
     * boy_name / girl_name / boy_avatar / girl_avatar / home.hero_photo_1 / home.hero_photo_2。
     */
    @Size(max = 16, message = "首页配置项过多")
    private Map<String, String> configs;
}
