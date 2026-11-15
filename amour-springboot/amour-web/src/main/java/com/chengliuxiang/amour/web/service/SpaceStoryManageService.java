package com.chengliuxiang.amour.web.service;

import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.space.SpaceContentSaveResultVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryChapterIdReqVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryChapterManageVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryChapterOrderReqVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryChapterSaveReqVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryNodeGlobalOrderReqVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryNodeIdReqVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryNodeManageVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryNodeOrderReqVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryNodeSaveReqVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryNodeSortItemVO;

import java.util.List;

public interface SpaceStoryManageService {

    Response<List<StoryChapterManageVO>> listChapters();

    Response<Long> saveChapter(StoryChapterSaveReqVO reqVO);

    Response<Void> deleteChapter(StoryChapterIdReqVO reqVO);

    Response<Void> saveChapterOrder(StoryChapterOrderReqVO reqVO);

    Response<List<StoryNodeManageVO>> listNodes();

    Response<SpaceContentSaveResultVO> saveNode(StoryNodeSaveReqVO reqVO);

    /** 章节内排序：只更新指定章节的 sort_order，返回该章节最新顺序。 */
    Response<List<StoryNodeSortItemVO>> saveNodeOrder(StoryNodeOrderReqVO reqVO);

    /** 全局排序：只更新 global_sort_order，返回全部故事最新顺序。 */
    Response<List<StoryNodeSortItemVO>> saveNodeGlobalOrder(StoryNodeGlobalOrderReqVO reqVO);

    Response<Void> deleteNode(StoryNodeIdReqVO reqVO);
}
