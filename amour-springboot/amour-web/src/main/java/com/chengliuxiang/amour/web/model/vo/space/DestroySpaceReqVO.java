package com.chengliuxiang.amour.web.model.vo.space;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.Positive;

/**
 * 创建者销毁情侣空间的请求体。
 *
 * <p>销毁的目标空间永远由服务端按登录态与数据库成员关系推导，客户端不能指定操作者身份。
 * 这里的 {@code spaceId} 只用于「请求发起时客户端展示的是哪个空间」的一致性校验：
 * 延迟到达的旧请求如果指向的空间已经不是当前空间（例如用户已经销毁旧空间并重新创建），
 * 服务端会拒绝并把最新状态返回给客户端，绝不误操作新空间。</p>
 *
 * <p>字段全部可选：老客户端不传任何参数时保持原有「按登录态推导目标空间」的行为。</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DestroySpaceReqVO {

    /**
     * 客户端发起销毁时展示的空间 ID。
     *
     * <p>只做一致性校验，不作为授权依据；不传则跳过该层校验以兼容旧客户端。</p>
     */
    @Positive(message = "空间 ID 不合法")
    private Long spaceId;

    /**
     * 客户端发起销毁时展示的空间工作版本号。
     *
     * <p>可选。用于识别「同一空间在请求飞行期间被改写」（例如另一半刚加入）的过期请求。</p>
     */
    private Integer expectedRevision;
}
