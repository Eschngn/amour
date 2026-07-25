package com.chengliuxiang.amour.web.service;

import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.story.GetStoryByChapterIdReqVO;
import com.chengliuxiang.amour.web.model.vo.story.MilestoneStoryNodeVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryDetailReqVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryDetailRspVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryNodeVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryOverviewVO;

import java.util.List;

public interface StoryService {

    /**
     * 查询所有里程碑节点，按发生时间升序排列
     */
    Response<List<MilestoneStoryNodeVO>> queryMilestoneList();

    /**
     * 获取故事模块全量数据
     *
     * @return
     */
    Response<StoryOverviewVO> getOverview();

    /**
     * 根据章节 ID 获取故事
     * @param getStoryByChapterIdReqVO
     * @return
     */
    Response<List<StoryNodeVO>> getStoryByChapterId(GetStoryByChapterIdReqVO getStoryByChapterIdReqVO);

    /**
     * 获取故事详情（含前后篇）
     */
    Response<StoryDetailRspVO> getStoryDetail(StoryDetailReqVO reqVO);
}
