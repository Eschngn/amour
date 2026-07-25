package com.chengliuxiang.amour.admin.service;

import com.chengliuxiang.amour.admin.model.vo.chapter.FindChapterListRspVO;
import com.chengliuxiang.amour.common.utils.Response;

import java.util.List;

public interface AdminChapterService {

    /**
     * 获取所有故事章节
     */
    Response<List<FindChapterListRspVO>> findChapterList();
}
