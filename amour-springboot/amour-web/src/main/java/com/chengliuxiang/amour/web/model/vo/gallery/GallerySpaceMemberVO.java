package com.chengliuxiang.amour.web.model.vo.gallery;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 恋爱广场公开空间成员信息。
 * 仅暴露公开展示所需字段，不包含用户 ID、恋语 ID、加入时间等内部信息。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GallerySpaceMemberVO {

    private String displayName;

    private String avatar;

    /**
     * 成员身份：1-空间发起人 2-另一半
     */
    private Integer memberRole;
}
