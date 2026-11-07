package com.chengliuxiang.amour.web.service;

import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.space.SpaceHomeSaveReqVO;
import com.chengliuxiang.amour.web.model.vo.space.SpaceHomeVO;

public interface SpaceHomeService {

    /**
     * 查询当前登录用户所在空间的首页数据。
     */
    Response<SpaceHomeVO> queryHome();

    /**
     * 保存当前空间首页：空间基础信息写入 couple_space，展示配置写入 couple_space_config。
     */
    Response<SpaceHomeVO> saveHome(SpaceHomeSaveReqVO reqVO);
}
