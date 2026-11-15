package com.chengliuxiang.amour.common.domain.dos;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName("photo")
public class PhotoDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long spaceId;

    private Long photoCategoryId;

    private String title;

    private String description;

    private String url;

    private LocalDateTime takenTime;

    private String location;

    /**
     * 分类内排序值：只在所属相册分类内生效。
     */
    private Integer sortOrder;

    /**
     * 全局排序值：跨分类生效，仅在未筛选分类时使用。
     *
     * <p>与 sortOrder 分离后，分类内拖拽不会改变照片在全部照片视图中的位置。</p>
     */
    private Integer globalSortOrder;

    private Boolean isCover;

    /**
     * 可见性：0-仅空间成员 1-公开到恋爱广场 2-隐藏
     */
    private Integer visibility;

    private Boolean isDeleted;

    private Long createdBy;

    private Long updatedBy;

    /**
     * 内容工作版本号，每次保存成功后递增；审核快照记录生成时的版本。
     */
    private Integer revision;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
