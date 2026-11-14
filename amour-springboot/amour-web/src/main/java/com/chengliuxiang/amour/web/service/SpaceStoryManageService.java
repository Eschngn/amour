package com.chengliuxiang.amour.web.service;

import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.space.SpaceContentSaveResultVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryChapterIdReqVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryChapterManageVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryChapterSaveReqVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryNodeIdReqVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryNodeManageVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryNodeSaveReqVO;

import java.util.List;

public interface SpaceStoryManageService {

    Response<List<StoryChapterManageVO>> listChapters();

    Response<Long> saveChapter(StoryChapterSaveReqVO reqVO);

    Response<Void> deleteChapter(StoryChapterIdReqVO reqVO);

    Response<List<StoryNodeManageVO>> listNodes();

    Response<SpaceContentSaveResultVO> saveNode(StoryNodeSaveReqVO reqVO);

    Response<Void> deleteNode(StoryNodeIdReqVO reqVO);
}
