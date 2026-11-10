package com.chengliuxiang.amour.admin.service;

import com.chengliuxiang.amour.admin.model.vo.story.DeleteStoryReqVO;
import com.chengliuxiang.amour.admin.model.vo.story.FindStoryDetailReqVO;
import com.chengliuxiang.amour.admin.model.vo.story.FindStoryDetailRspVO;
import com.chengliuxiang.amour.admin.model.vo.story.FindStoryPageListReqVO;
import com.chengliuxiang.amour.admin.model.vo.story.FindStoryPageListRspVO;
import com.chengliuxiang.amour.admin.model.vo.story.UpdateStoryVisibleStatusReqVO;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;

/**
 * 兼容旧路径的故事治理接口：只保留查询、隐藏/恢复展示和逻辑删除。
 */
public interface AdminStoryService {

    Response<PageResult<FindStoryPageListRspVO>> findStoryPageList(FindStoryPageListReqVO reqVO);

    Response<FindStoryDetailRspVO> findStoryDetail(FindStoryDetailReqVO findStoryDetailReqVO);

    Response<Void> updatePublishStatus(UpdateStoryVisibleStatusReqVO reqVO);

    Response<Void> deleteStory(DeleteStoryReqVO reqVO);
}
