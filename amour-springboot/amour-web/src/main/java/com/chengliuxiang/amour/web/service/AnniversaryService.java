package com.chengliuxiang.amour.web.service;

import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.anniversary.AnniversaryVO;

import java.util.List;

public interface AnniversaryService {

    /**
     * 查询前台可见的纪念日，日期重复与倒计时由前端按当前年份计算。
     */
    Response<List<AnniversaryVO>> listAnniversaries();
}
