package com.chengliuxiang.amour.admin.service;

import com.chengliuxiang.amour.admin.model.vo.story.*;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;

public interface AdminStoryService {

    /**
     * 分页查询故事列表
     */
    Response<PageResult<FindStoryPageListRspVO>> findStoryPageList(FindStoryPageListReqVO reqVO);

    /**
     * 根据故事节点 ID 查询详情
     */
    Response<FindStoryDetailRspVO> findStoryDetail(FindStoryDetailReqVO findStoryDetailReqVO);

    /**
     * 新增故事
     */
    Response<Long> addStory(AddStoryReqVO reqVO);

    /**
     * 更新故事
     */
    Response<Void> updateStory(UpdateStoryReqVO reqVO);

    /**
     * 更新故事发布状态
     */
    Response<Void> updatePublishStatus(UpdateStoryVisibleStatusReqVO reqVO);

    /**
     * 删除故事（逻辑删除）
     */
    Response<Void> deleteStory(DeleteStoryReqVO reqVO);
}
