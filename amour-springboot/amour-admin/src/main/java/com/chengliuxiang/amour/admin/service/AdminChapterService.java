package com.chengliuxiang.amour.admin.service;

import com.chengliuxiang.amour.admin.model.vo.chapter.FindChapterListReqVO;
import com.chengliuxiang.amour.admin.model.vo.chapter.FindChapterListRspVO;
import com.chengliuxiang.amour.common.utils.Response;

import java.util.List;

public interface AdminChapterService {

    /**
     * 按空间获取故事章节；无空间过滤需要跨空间权限。
     */
    Response<List<FindChapterListRspVO>> findChapterList(FindChapterListReqVO reqVO);
}
