package com.chengliuxiang.amour.web.controller;

import com.chengliuxiang.amour.common.aspect.ApiOperationLog;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.story.GetStoryByChapterIdReqVO;
import com.chengliuxiang.amour.web.model.vo.story.MilestoneStoryNodeVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryChapterIdReqVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryChapterManageVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryChapterSaveReqVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryDetailReqVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryDetailRspVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryNodeIdReqVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryNodeManageVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryNodeSaveReqVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryNodeVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryOverviewVO;
import com.chengliuxiang.amour.web.service.SpaceStoryManageService;
import com.chengliuxiang.amour.web.service.StoryService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;
import javax.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/story")
public class StoryController {

    @Resource
    private StoryService storyService;

    @Resource
    private SpaceStoryManageService spaceStoryManageService;

    /**
     * 查询所有里程碑节点，按发生时间升序排列
     * @return
     */
    @PostMapping("/milestones")
    @ApiOperationLog(description = "首页获取故事里程碑数据")
    public Response<List<MilestoneStoryNodeVO>> milestones() {
        return storyService.queryMilestoneList();
    }

    /**
     * 获取故事模块全量数据
     * @return
     */
    @PostMapping("/overview")
    @ApiOperationLog(description = "获取故事模块全量数据")
    public Response<StoryOverviewVO> getOverview(){
        return storyService.getOverview();
    }

    @PostMapping("/getStoryByChapterId")
    @ApiOperationLog(description = "根据章节ID获取故事")
    public Response<List<StoryNodeVO>> getStoryByChapterId(@RequestBody @Valid GetStoryByChapterIdReqVO getStoryByChapterIdReqVO){
        return storyService.getStoryByChapterId(getStoryByChapterIdReqVO);
    }

    @PostMapping("/detail")
    @ApiOperationLog(description = "获取故事详情（含前后篇）")
    public Response<StoryDetailRspVO> getStoryDetail(@RequestBody @Valid StoryDetailReqVO reqVO) {
        return storyService.getStoryDetail(reqVO);
    }

    /* ==================== 用户端空间故事管理（等待绑定期间也可使用） ==================== */

    @PostMapping("/manage/chapters")
    @ApiOperationLog(description = "空间故事章节管理列表")
    public Response<List<StoryChapterManageVO>> listManageChapters() {
        return spaceStoryManageService.listChapters();
    }

    @PostMapping("/manage/chapter/save")
    @ApiOperationLog(description = "新增或编辑空间故事章节")
    public Response<Long> saveChapter(@RequestBody @Valid StoryChapterSaveReqVO reqVO) {
        return spaceStoryManageService.saveChapter(reqVO);
    }

    @PostMapping("/manage/chapter/delete")
    @ApiOperationLog(description = "删除空间故事章节")
    public Response<Void> deleteChapter(@RequestBody @Valid StoryChapterIdReqVO reqVO) {
        return spaceStoryManageService.deleteChapter(reqVO);
    }

    @PostMapping("/manage/nodes")
    @ApiOperationLog(description = "空间故事节点管理列表")
    public Response<List<StoryNodeManageVO>> listManageNodes() {
        return spaceStoryManageService.listNodes();
    }

    @PostMapping("/manage/node/save")
    @ApiOperationLog(description = "新增或编辑空间故事节点")
    public Response<Long> saveNode(@RequestBody @Valid StoryNodeSaveReqVO reqVO) {
        return spaceStoryManageService.saveNode(reqVO);
    }

    @PostMapping("/manage/node/delete")
    @ApiOperationLog(description = "删除空间故事节点")
    public Response<Void> deleteNode(@RequestBody @Valid StoryNodeIdReqVO reqVO) {
        return spaceStoryManageService.deleteNode(reqVO);
    }
}
