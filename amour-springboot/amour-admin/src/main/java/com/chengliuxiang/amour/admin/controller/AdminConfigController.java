package com.chengliuxiang.amour.admin.controller;

import com.chengliuxiang.amour.admin.model.vo.config.DeleteSiteConfigReqVO;
import com.chengliuxiang.amour.admin.model.vo.config.FindSiteConfigPageListReqVO;
import com.chengliuxiang.amour.admin.model.vo.config.FindSiteConfigPageListRspVO;
import com.chengliuxiang.amour.admin.model.vo.config.SaveSiteConfigReqVO;
import com.chengliuxiang.amour.admin.model.vo.dict.DeleteDictItemReqVO;
import com.chengliuxiang.amour.admin.model.vo.dict.DeleteDictTypeReqVO;
import com.chengliuxiang.amour.admin.model.vo.dict.FindDictItemListReqVO;
import com.chengliuxiang.amour.admin.model.vo.dict.FindDictItemListRspVO;
import com.chengliuxiang.amour.admin.model.vo.dict.FindDictTypePageListReqVO;
import com.chengliuxiang.amour.admin.model.vo.dict.FindDictTypePageListRspVO;
import com.chengliuxiang.amour.admin.model.vo.dict.SaveDictItemReqVO;
import com.chengliuxiang.amour.admin.model.vo.dict.SaveDictTypeReqVO;
import com.chengliuxiang.amour.admin.service.AdminConfigService;
import com.chengliuxiang.amour.common.aspect.ApiOperationLog;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;
import java.util.List;

@RestController
@RequestMapping("/admin/dict")
public class AdminConfigController {

    @Resource
    private AdminConfigService adminConfigService;

    @PostMapping("/config/list")
    @ApiOperationLog(description = "查询网站配置分页数据")
    public Response<PageResult<FindSiteConfigPageListRspVO>> findSiteConfigPageList(
            @RequestBody FindSiteConfigPageListReqVO reqVO) {
        return adminConfigService.findSiteConfigPageList(reqVO);
    }

    @PostMapping("/config/save")
    @ApiOperationLog(description = "保存网站配置")
    public Response<Void> saveSiteConfig(@RequestBody @Validated SaveSiteConfigReqVO reqVO) {
        return adminConfigService.saveSiteConfig(reqVO);
    }

    @PostMapping("/config/delete")
    @ApiOperationLog(description = "删除网站配置")
    public Response<Void> deleteSiteConfig(@RequestBody @Validated DeleteSiteConfigReqVO reqVO) {
        return adminConfigService.deleteSiteConfig(reqVO);
    }

    @PostMapping("/type/list")
    @ApiOperationLog(description = "查询字典类型分页数据")
    public Response<PageResult<FindDictTypePageListRspVO>> findDictTypePageList(
            @RequestBody FindDictTypePageListReqVO reqVO) {
        return adminConfigService.findDictTypePageList(reqVO);
    }

    @PostMapping("/type/save")
    @ApiOperationLog(description = "保存字典类型")
    public Response<Void> saveDictType(@RequestBody @Validated SaveDictTypeReqVO reqVO) {
        return adminConfigService.saveDictType(reqVO);
    }

    @PostMapping("/type/delete")
    @ApiOperationLog(description = "删除字典类型")
    public Response<Void> deleteDictType(@RequestBody @Validated DeleteDictTypeReqVO reqVO) {
        return adminConfigService.deleteDictType(reqVO);
    }

    @PostMapping("/item/list")
    @ApiOperationLog(description = "查询字典项列表")
    public Response<List<FindDictItemListRspVO>> findDictItemList(
            @RequestBody @Validated FindDictItemListReqVO reqVO) {
        return adminConfigService.findDictItemList(reqVO);
    }

    @PostMapping("/item/save")
    @ApiOperationLog(description = "保存字典项")
    public Response<Void> saveDictItem(@RequestBody @Validated SaveDictItemReqVO reqVO) {
        return adminConfigService.saveDictItem(reqVO);
    }

    @PostMapping("/item/delete")
    @ApiOperationLog(description = "删除字典项")
    public Response<Void> deleteDictItem(@RequestBody @Validated DeleteDictItemReqVO reqVO) {
        return adminConfigService.deleteDictItem(reqVO);
    }
}
