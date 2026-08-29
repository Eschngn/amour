package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.chengliuxiang.amour.common.domain.dos.SiteConfigDO;

import java.util.List;

public interface SiteConfigMapper extends BaseMapper<SiteConfigDO> {

    default SiteConfigDO selectValueByKey(String configKey) {
        return selectOne(new LambdaQueryWrapper<SiteConfigDO>()
                .select(SiteConfigDO::getConfigValue)
                .eq(SiteConfigDO::getConfigKey, configKey)
                .last("LIMIT 1"));
    }

    default IPage<SiteConfigDO> selectConfigPage(long current, long size, String valueType, String keyword) {
        Page<SiteConfigDO> page = new Page<>(current, size);
        LambdaQueryWrapper<SiteConfigDO> wrapper = new LambdaQueryWrapper<SiteConfigDO>()
                .eq(valueType != null && !valueType.isEmpty(), SiteConfigDO::getValueType, valueType)
                .and(keyword != null && !keyword.isEmpty(), query -> query
                        .like(SiteConfigDO::getConfigKey, keyword)
                        .or().like(SiteConfigDO::getConfigName, keyword)
                        .or().like(SiteConfigDO::getConfigValue, keyword)
                        .or().like(SiteConfigDO::getRemark, keyword))
                .orderByAsc(SiteConfigDO::getSortOrder)
                .orderByDesc(SiteConfigDO::getId);
        return selectPage(page, wrapper);
    }

    default List<SiteConfigDO> selectByValueType(String valueType) {
        return selectList(new LambdaQueryWrapper<SiteConfigDO>()
                .eq(SiteConfigDO::getValueType, valueType));
    }

    default List<SiteConfigDO> selectLegacyConfigs(String... excludedValueTypes) {
        return selectList(new LambdaQueryWrapper<SiteConfigDO>()
                .notIn(SiteConfigDO::getValueType, excludedValueTypes)
                .orderByAsc(SiteConfigDO::getSortOrder)
                .orderByDesc(SiteConfigDO::getId));
    }

    default SiteConfigDO selectByConfigKey(String configKey) {
        return selectOne(new LambdaQueryWrapper<SiteConfigDO>()
                .eq(SiteConfigDO::getConfigKey, configKey)
                .last("LIMIT 1"));
    }

    default Long countByConfigKey(String configKey, Long excludedId) {
        return selectCount(new LambdaQueryWrapper<SiteConfigDO>()
                .eq(SiteConfigDO::getConfigKey, configKey)
                .ne(excludedId != null, SiteConfigDO::getId, excludedId));
    }

    default SiteConfigDO selectByIdAndValueType(Long id, String valueType) {
        return selectOne(new LambdaQueryWrapper<SiteConfigDO>()
                .eq(SiteConfigDO::getId, id)
                .eq(SiteConfigDO::getValueType, valueType));
    }

    default void insertConfig(SiteConfigDO config) {
        insert(config);
    }

    default void updateConfig(SiteConfigDO config) {
        updateById(config);
    }

    default SiteConfigDO selectConfigById(Long id) {
        return selectById(id);
    }

    default void deleteConfigById(Long id) {
        deleteById(id);
    }
}
