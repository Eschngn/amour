package com.chengliuxiang.amour.admin.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
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
import com.chengliuxiang.amour.common.domain.dos.SiteConfigDO;
import com.chengliuxiang.amour.common.domain.mapper.SiteConfigMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
public class AdminConfigServiceImpl implements AdminConfigService {

    private static final String DICT_TYPE_VALUE_TYPE = "dict_type";
    private static final String DICT_ITEM_VALUE_TYPE = "dict_item";
    private static final String LEGACY_DICT_TYPE = "__site_config__";
    private static final long LEGACY_DICT_TYPE_ID = 0L;
    private static final String DICT_TYPE_KEY_PREFIX = "dict_type_";
    private static final String DICT_ITEM_KEY_PREFIX = "dict_item_";
    private static final DateTimeFormatter DATE_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Resource
    private SiteConfigMapper siteConfigMapper;

    @Resource
    private ObjectMapper objectMapper;

    @Override
    public Response<PageResult<FindSiteConfigPageListRspVO>> findSiteConfigPageList(FindSiteConfigPageListReqVO reqVO) {
        String keyword = StrUtil.nullToEmpty(reqVO.getKeyword()).trim();
        String requestedValueType = StrUtil.nullToEmpty(reqVO.getValueType()).trim();
        Page<SiteConfigDO> page = new Page<>(
                normalizePageNumber(reqVO.getCurrent(), 1L),
                normalizePageNumber(reqVO.getSize(), 10L));
        LambdaQueryWrapper<SiteConfigDO> wrapper = new LambdaQueryWrapper<SiteConfigDO>()
                .eq(StrUtil.isNotBlank(requestedValueType), SiteConfigDO::getValueType, requestedValueType)
                .and(StrUtil.isNotBlank(keyword), query -> query
                        .like(SiteConfigDO::getConfigKey, keyword)
                        .or().like(SiteConfigDO::getConfigName, keyword)
                        .or().like(SiteConfigDO::getConfigValue, keyword)
                        .or().like(SiteConfigDO::getRemark, keyword))
                .orderByAsc(SiteConfigDO::getSortOrder)
                .orderByDesc(SiteConfigDO::getId);
        IPage<SiteConfigDO> result = siteConfigMapper.selectPage(page, wrapper);
        List<FindSiteConfigPageListRspVO> records = result.getRecords().stream()
                .map(config -> FindSiteConfigPageListRspVO.builder()
                        .id(config.getId())
                        .configKey(config.getConfigKey())
                        .configName(config.getConfigName())
                        .configValue(config.getConfigValue())
                        .valueType(config.getValueType())
                        .sortOrder(defaultSortOrder(config.getSortOrder()))
                        .remark(config.getRemark())
                        .updateTime(formatDateTime(config.getUpdateTime()))
                        .build())
                .collect(Collectors.toList());
        return Response.success(PageResult.<FindSiteConfigPageListRspVO>builder()
                .current(result.getCurrent())
                .size(result.getSize())
                .total(result.getTotal())
                .records(records)
                .build());
    }

    @Override
    public Response<Void> saveSiteConfig(SaveSiteConfigReqVO reqVO) {
        String configKey = reqVO.getConfigKey().trim();
        Long duplicateCount = siteConfigMapper.selectCount(new LambdaQueryWrapper<SiteConfigDO>()
                .eq(SiteConfigDO::getConfigKey, configKey)
                .ne(reqVO.getId() != null, SiteConfigDO::getId, reqVO.getId()));
        if (duplicateCount != null && duplicateCount > 0) {
            throw new BizException(ResponseCodeEnum.SITE_CONFIG_DUPLICATE);
        }

        LocalDateTime now = LocalDateTime.now();
        if (reqVO.getId() == null) {
            siteConfigMapper.insert(SiteConfigDO.builder()
                    .configKey(configKey)
                    .configName(reqVO.getConfigName().trim())
                    .configValue(StrUtil.nullToEmpty(reqVO.getConfigValue()))
                    .valueType(reqVO.getValueType().trim())
                    .sortOrder(defaultSortOrder(reqVO.getSortOrder()))
                    .remark(StrUtil.nullToEmpty(reqVO.getRemark()).trim())
                    .createTime(now)
                    .updateTime(now)
                    .build());
            return Response.success();
        }

        SiteConfigDO current = siteConfigMapper.selectById(reqVO.getId());
        if (current == null) {
            throw new BizException(ResponseCodeEnum.SITE_CONFIG_NOT_EXIST);
        }
        current.setConfigKey(configKey);
        current.setConfigName(reqVO.getConfigName().trim());
        current.setConfigValue(StrUtil.nullToEmpty(reqVO.getConfigValue()));
        current.setValueType(reqVO.getValueType().trim());
        current.setSortOrder(defaultSortOrder(reqVO.getSortOrder()));
        current.setRemark(StrUtil.nullToEmpty(reqVO.getRemark()).trim());
        current.setUpdateTime(now);
        siteConfigMapper.updateById(current);
        return Response.success();
    }

    @Override
    public Response<Void> deleteSiteConfig(DeleteSiteConfigReqVO reqVO) {
        if (siteConfigMapper.selectById(reqVO.getId()) == null) {
            throw new BizException(ResponseCodeEnum.SITE_CONFIG_NOT_EXIST);
        }
        siteConfigMapper.deleteById(reqVO.getId());
        return Response.success();
    }

    @Override
    public Response<PageResult<FindDictTypePageListRspVO>> findDictTypePageList(FindDictTypePageListReqVO reqVO) {
        String keyword = StrUtil.nullToEmpty(reqVO.getKeyword()).trim().toLowerCase();
        Map<String, Long> itemCountMap = countItemsByType();

        List<FindDictTypePageListRspVO> allTypes = loadConfigs(DICT_TYPE_VALUE_TYPE).stream()
                .map(config -> toTypeResponse(config, itemCountMap))
                .filter(type -> type != null)
                .filter(type -> StrUtil.isBlank(keyword)
                        || type.getDictName().toLowerCase().contains(keyword)
                        || type.getDictType().toLowerCase().contains(keyword))
                .sorted(Comparator.comparing(FindDictTypePageListRspVO::getSortOrder)
                        .thenComparing(FindDictTypePageListRspVO::getId, Comparator.reverseOrder()))
                .collect(Collectors.toList());

        List<SiteConfigDO> legacyConfigs = loadLegacyConfigs();
        if (!legacyConfigs.isEmpty() && shouldIncludeLegacyType(keyword, legacyConfigs)) {
            allTypes.add(FindDictTypePageListRspVO.builder()
                    .id(LEGACY_DICT_TYPE_ID)
                    .dictName("已有网站配置")
                    .dictType(LEGACY_DICT_TYPE)
                    .status(true)
                    .sortOrder(-1)
                    .remark("兼容现有 site_config 数据")
                    .itemCount((long) legacyConfigs.size())
                    .updateTime(formatDateTime(legacyConfigs.stream()
                            .map(SiteConfigDO::getUpdateTime)
                            .filter(java.util.Objects::nonNull)
                            .max(LocalDateTime::compareTo)
                            .orElse(null)))
                    .build());
            allTypes.sort(Comparator.comparing(FindDictTypePageListRspVO::getSortOrder)
                    .thenComparing(FindDictTypePageListRspVO::getId, Comparator.reverseOrder()));
        }

        long current = normalizePageNumber(reqVO.getCurrent(), 1L);
        long size = normalizePageNumber(reqVO.getSize(), 10L);
        int fromIndex = (int) Math.min((current - 1) * size, allTypes.size());
        int toIndex = (int) Math.min(fromIndex + size, allTypes.size());

        return Response.success(PageResult.<FindDictTypePageListRspVO>builder()
                .current(current)
                .size(size)
                .total((long) allTypes.size())
                .records(new ArrayList<>(allTypes.subList(fromIndex, toIndex)))
                .build());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Void> saveDictType(SaveDictTypeReqVO reqVO) {
        String dictName = reqVO.getDictName().trim();
        String dictType = reqVO.getDictType().trim();
        ensureTypeCodeUnique(dictType, reqVO.getId());

        LocalDateTime now = LocalDateTime.now();
        DictTypeConfig value = new DictTypeConfig(dictType, reqVO.getStatus());
        if (reqVO.getId() == null) {
            siteConfigMapper.insert(SiteConfigDO.builder()
                    .configKey(generateConfigKey(DICT_TYPE_KEY_PREFIX))
                    .configName(dictName)
                    .configValue(writeJson(value))
                    .valueType(DICT_TYPE_VALUE_TYPE)
                    .sortOrder(defaultSortOrder(reqVO.getSortOrder()))
                    .remark(StrUtil.nullToEmpty(reqVO.getRemark()).trim())
                    .createTime(now)
                    .updateTime(now)
                    .build());
            return Response.success();
        }

        SiteConfigDO current = findConfig(reqVO.getId(), DICT_TYPE_VALUE_TYPE,
                ResponseCodeEnum.DICT_TYPE_NOT_EXIST);
        DictTypeConfig previousValue = readTypeValue(current);
        current.setConfigName(dictName);
        current.setConfigValue(writeJson(value));
        current.setSortOrder(defaultSortOrder(reqVO.getSortOrder()));
        current.setRemark(StrUtil.nullToEmpty(reqVO.getRemark()).trim());
        current.setUpdateTime(now);
        siteConfigMapper.updateById(current);

        if (previousValue != null && StrUtil.isNotBlank(previousValue.getDictType())
                && !previousValue.getDictType().equals(dictType)) {
            updateItemTypeCode(previousValue.getDictType(), dictType, now);
        }
        return Response.success();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Void> deleteDictType(DeleteDictTypeReqVO reqVO) {
        SiteConfigDO typeConfig = findConfig(reqVO.getId(), DICT_TYPE_VALUE_TYPE,
                ResponseCodeEnum.DICT_TYPE_NOT_EXIST);
        DictTypeConfig typeValue = readTypeValue(typeConfig);
        if (typeValue == null) {
            throw new BizException(ResponseCodeEnum.DICT_TYPE_NOT_EXIST);
        }

        for (SiteConfigDO itemConfig : loadConfigs(DICT_ITEM_VALUE_TYPE)) {
            DictItemConfig itemValue = readItemValue(itemConfig);
            if (itemValue != null && typeValue.getDictType().equals(itemValue.getDictType())) {
                siteConfigMapper.deleteById(itemConfig.getId());
            }
        }
        siteConfigMapper.deleteById(typeConfig.getId());
        return Response.success();
    }

    @Override
    public Response<List<FindDictItemListRspVO>> findDictItemList(FindDictItemListReqVO reqVO) {
        String dictType = reqVO.getDictType().trim();
        if (LEGACY_DICT_TYPE.equals(dictType)) {
            return Response.success(loadLegacyConfigs().stream()
                    .map(this::toLegacyItemResponse)
                    .collect(Collectors.toList()));
        }
        findTypeByCode(dictType);

        List<FindDictItemListRspVO> items = loadConfigs(DICT_ITEM_VALUE_TYPE).stream()
                .map(this::toItemResponse)
                .filter(item -> item != null && dictType.equals(item.getDictType()))
                .sorted(Comparator.comparing(FindDictItemListRspVO::getSortOrder)
                        .thenComparing(FindDictItemListRspVO::getId, Comparator.reverseOrder()))
                .collect(Collectors.toList());
        return Response.success(items);
    }

    @Override
    public Response<Void> saveDictItem(SaveDictItemReqVO reqVO) {
        String dictType = reqVO.getDictType().trim();
        String itemValue = reqVO.getItemValue().trim();
        if (LEGACY_DICT_TYPE.equals(dictType)) {
            return saveLegacyConfig(reqVO, itemValue);
        }
        findTypeByCode(dictType);
        ensureItemValueUnique(dictType, itemValue, reqVO.getId());

        LocalDateTime now = LocalDateTime.now();
        DictItemConfig value = new DictItemConfig(
                dictType,
                itemValue,
                StrUtil.nullToEmpty(reqVO.getCssClass()).trim(),
                reqVO.getStatus());
        if (reqVO.getId() == null) {
            siteConfigMapper.insert(SiteConfigDO.builder()
                    .configKey(generateConfigKey(DICT_ITEM_KEY_PREFIX))
                    .configName(reqVO.getItemLabel().trim())
                    .configValue(writeJson(value))
                    .valueType(DICT_ITEM_VALUE_TYPE)
                    .sortOrder(defaultSortOrder(reqVO.getSortOrder()))
                    .remark(StrUtil.nullToEmpty(reqVO.getRemark()).trim())
                    .createTime(now)
                    .updateTime(now)
                    .build());
            return Response.success();
        }

        SiteConfigDO current = findConfig(reqVO.getId(), DICT_ITEM_VALUE_TYPE,
                ResponseCodeEnum.DICT_ITEM_NOT_EXIST);
        current.setConfigName(reqVO.getItemLabel().trim());
        current.setConfigValue(writeJson(value));
        current.setSortOrder(defaultSortOrder(reqVO.getSortOrder()));
        current.setRemark(StrUtil.nullToEmpty(reqVO.getRemark()).trim());
        current.setUpdateTime(now);
        siteConfigMapper.updateById(current);
        return Response.success();
    }

    @Override
    public Response<Void> deleteDictItem(DeleteDictItemReqVO reqVO) {
        SiteConfigDO legacyConfig = siteConfigMapper.selectById(reqVO.getId());
        if (legacyConfig != null && isLegacyConfig(legacyConfig)) {
            siteConfigMapper.deleteById(legacyConfig.getId());
            return Response.success();
        }
        SiteConfigDO item = findConfig(reqVO.getId(), DICT_ITEM_VALUE_TYPE,
                ResponseCodeEnum.DICT_ITEM_NOT_EXIST);
        siteConfigMapper.deleteById(item.getId());
        return Response.success();
    }

    private List<SiteConfigDO> loadConfigs(String valueType) {
        return siteConfigMapper.selectList(new LambdaQueryWrapper<SiteConfigDO>()
                .eq(SiteConfigDO::getValueType, valueType));
    }

    private List<SiteConfigDO> loadLegacyConfigs() {
        return siteConfigMapper.selectList(new LambdaQueryWrapper<SiteConfigDO>()
                .notIn(SiteConfigDO::getValueType, DICT_TYPE_VALUE_TYPE, DICT_ITEM_VALUE_TYPE)
                .orderByAsc(SiteConfigDO::getSortOrder)
                .orderByDesc(SiteConfigDO::getId));
    }

    private boolean shouldIncludeLegacyType(String keyword, List<SiteConfigDO> legacyConfigs) {
        if (StrUtil.isBlank(keyword)
                || "已有网站配置".contains(keyword)
                || LEGACY_DICT_TYPE.contains(keyword)) {
            return true;
        }
        return legacyConfigs.stream().anyMatch(config ->
                StrUtil.nullToEmpty(config.getConfigKey()).toLowerCase().contains(keyword)
                        || StrUtil.nullToEmpty(config.getConfigName()).toLowerCase().contains(keyword));
    }

    private boolean isLegacyConfig(SiteConfigDO config) {
        return config != null
                && !DICT_TYPE_VALUE_TYPE.equals(config.getValueType())
                && !DICT_ITEM_VALUE_TYPE.equals(config.getValueType());
    }

    private FindDictItemListRspVO toLegacyItemResponse(SiteConfigDO config) {
        return FindDictItemListRspVO.builder()
                .id(config.getId())
                .dictType(LEGACY_DICT_TYPE)
                .itemLabel(config.getConfigName())
                .itemValue(config.getConfigKey())
                .configValue(config.getConfigValue())
                .cssClass(config.getValueType())
                .sortOrder(defaultSortOrder(config.getSortOrder()))
                .status(true)
                .remark(config.getRemark())
                .updateTime(formatDateTime(config.getUpdateTime()))
                .build();
    }

    private Response<Void> saveLegacyConfig(SaveDictItemReqVO reqVO, String configKey) {
        SiteConfigDO duplicate = siteConfigMapper.selectOne(new LambdaQueryWrapper<SiteConfigDO>()
                .eq(SiteConfigDO::getConfigKey, configKey)
                .last("LIMIT 1"));
        if (duplicate != null && !duplicate.getId().equals(reqVO.getId())) {
            throw new BizException(ResponseCodeEnum.DICT_ITEM_DUPLICATE);
        }

        LocalDateTime now = LocalDateTime.now();
        String valueType = StrUtil.isBlank(reqVO.getCssClass()) ? "text" : reqVO.getCssClass().trim();
        if (reqVO.getId() == null) {
            siteConfigMapper.insert(SiteConfigDO.builder()
                    .configKey(configKey)
                    .configName(reqVO.getItemLabel().trim())
                    .configValue(StrUtil.nullToEmpty(reqVO.getConfigValue()))
                    .valueType(valueType)
                    .sortOrder(defaultSortOrder(reqVO.getSortOrder()))
                    .remark(StrUtil.nullToEmpty(reqVO.getRemark()).trim())
                    .createTime(now)
                    .updateTime(now)
                    .build());
            return Response.success();
        }

        SiteConfigDO current = siteConfigMapper.selectById(reqVO.getId());
        if (!isLegacyConfig(current)) {
            throw new BizException(ResponseCodeEnum.DICT_ITEM_NOT_EXIST);
        }
        current.setConfigKey(configKey);
        current.setConfigName(reqVO.getItemLabel().trim());
        current.setConfigValue(StrUtil.nullToEmpty(reqVO.getConfigValue()));
        current.setValueType(valueType);
        current.setSortOrder(defaultSortOrder(reqVO.getSortOrder()));
        current.setRemark(StrUtil.nullToEmpty(reqVO.getRemark()).trim());
        current.setUpdateTime(now);
        siteConfigMapper.updateById(current);
        return Response.success();
    }

    private SiteConfigDO findConfig(Long id, String valueType, ResponseCodeEnum notExistCode) {
        SiteConfigDO config = siteConfigMapper.selectOne(new LambdaQueryWrapper<SiteConfigDO>()
                .eq(SiteConfigDO::getId, id)
                .eq(SiteConfigDO::getValueType, valueType));
        if (config == null) {
            throw new BizException(notExistCode);
        }
        return config;
    }

    private SiteConfigDO findTypeByCode(String dictType) {
        for (SiteConfigDO config : loadConfigs(DICT_TYPE_VALUE_TYPE)) {
            DictTypeConfig value = readTypeValue(config);
            if (value != null && dictType.equals(value.getDictType())) {
                return config;
            }
        }
        throw new BizException(ResponseCodeEnum.DICT_TYPE_NOT_EXIST);
    }

    private void ensureTypeCodeUnique(String dictType, Long currentId) {
        for (SiteConfigDO config : loadConfigs(DICT_TYPE_VALUE_TYPE)) {
            DictTypeConfig value = readTypeValue(config);
            if (value != null && dictType.equals(value.getDictType())
                    && !config.getId().equals(currentId)) {
                throw new BizException(ResponseCodeEnum.DICT_TYPE_DUPLICATE);
            }
        }
    }

    private void ensureItemValueUnique(String dictType, String itemValue, Long currentId) {
        for (SiteConfigDO config : loadConfigs(DICT_ITEM_VALUE_TYPE)) {
            DictItemConfig value = readItemValue(config);
            if (value != null && dictType.equals(value.getDictType())
                    && itemValue.equals(value.getItemValue())
                    && !config.getId().equals(currentId)) {
                throw new BizException(ResponseCodeEnum.DICT_ITEM_DUPLICATE);
            }
        }
    }

    private void updateItemTypeCode(String previousType, String nextType, LocalDateTime updateTime) {
        for (SiteConfigDO config : loadConfigs(DICT_ITEM_VALUE_TYPE)) {
            DictItemConfig value = readItemValue(config);
            if (value != null && previousType.equals(value.getDictType())) {
                value.setDictType(nextType);
                config.setConfigValue(writeJson(value));
                config.setUpdateTime(updateTime);
                siteConfigMapper.updateById(config);
            }
        }
    }

    private Map<String, Long> countItemsByType() {
        Map<String, Long> result = new HashMap<>();
        for (SiteConfigDO config : loadConfigs(DICT_ITEM_VALUE_TYPE)) {
            DictItemConfig value = readItemValue(config);
            if (value != null && StrUtil.isNotBlank(value.getDictType())) {
                result.put(value.getDictType(), result.getOrDefault(value.getDictType(), 0L) + 1L);
            }
        }
        return result;
    }

    private FindDictTypePageListRspVO toTypeResponse(SiteConfigDO config, Map<String, Long> itemCountMap) {
        DictTypeConfig value = readTypeValue(config);
        if (value == null || StrUtil.isBlank(value.getDictType())) {
            return null;
        }
        return FindDictTypePageListRspVO.builder()
                .id(config.getId())
                .dictName(config.getConfigName())
                .dictType(value.getDictType())
                .status(Boolean.TRUE.equals(value.getStatus()))
                .sortOrder(defaultSortOrder(config.getSortOrder()))
                .remark(config.getRemark())
                .itemCount(itemCountMap.getOrDefault(value.getDictType(), 0L))
                .updateTime(formatDateTime(config.getUpdateTime()))
                .build();
    }

    private FindDictItemListRspVO toItemResponse(SiteConfigDO config) {
        DictItemConfig value = readItemValue(config);
        if (value == null || StrUtil.isBlank(value.getDictType()) || StrUtil.isBlank(value.getItemValue())) {
            return null;
        }
        return FindDictItemListRspVO.builder()
                .id(config.getId())
                .dictType(value.getDictType())
                .itemLabel(config.getConfigName())
                .itemValue(value.getItemValue())
                .configValue(null)
                .cssClass(value.getCssClass())
                .sortOrder(defaultSortOrder(config.getSortOrder()))
                .status(Boolean.TRUE.equals(value.getStatus()))
                .remark(config.getRemark())
                .updateTime(formatDateTime(config.getUpdateTime()))
                .build();
    }

    private DictTypeConfig readTypeValue(SiteConfigDO config) {
        try {
            return objectMapper.readValue(config.getConfigValue(), DictTypeConfig.class);
        } catch (Exception exception) {
            log.warn("Ignore invalid dict type config, id: {}", config.getId(), exception);
            return null;
        }
    }

    private DictItemConfig readItemValue(SiteConfigDO config) {
        try {
            return objectMapper.readValue(config.getConfigValue(), DictItemConfig.class);
        } catch (Exception exception) {
            log.warn("Ignore invalid dict item config, id: {}", config.getId(), exception);
            return null;
        }
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("字典配置序列化失败", exception);
        }
    }

    private String generateConfigKey(String prefix) {
        return prefix + UUID.randomUUID().toString().replace("-", "");
    }

    private int defaultSortOrder(Integer sortOrder) {
        return sortOrder == null ? 0 : sortOrder;
    }

    private long normalizePageNumber(Long value, long defaultValue) {
        return value == null || value < 1 ? defaultValue : value;
    }

    private String formatDateTime(LocalDateTime dateTime) {
        return dateTime == null ? null : dateTime.format(DATE_TIME_FORMATTER);
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    private static class DictTypeConfig {
        private String dictType;
        private Boolean status;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    private static class DictItemConfig {
        private String dictType;
        private String itemValue;
        private String cssClass;
        private Boolean status;
    }
}
