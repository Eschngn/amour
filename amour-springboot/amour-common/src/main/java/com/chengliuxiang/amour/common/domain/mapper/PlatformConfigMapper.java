package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.chengliuxiang.amour.common.domain.dos.PlatformConfigDO;

import java.util.List;

public interface PlatformConfigMapper extends BaseMapper<PlatformConfigDO> {

    default PlatformConfigDO selectValueByKey(String configKey) {
        return selectOne(new LambdaQueryWrapper<PlatformConfigDO>()
                .select(PlatformConfigDO::getConfigValue)
                .eq(PlatformConfigDO::getConfigKey, configKey)
                .last("LIMIT 1"));
    }

    default IPage<PlatformConfigDO> selectConfigPage(long current, long size, String valueType, String keyword) {
        return selectPage(new Page<>(current, size), new LambdaQueryWrapper<PlatformConfigDO>()
                .eq(valueType != null && !valueType.isEmpty(), PlatformConfigDO::getValueType, valueType)
                .and(keyword != null && !keyword.isEmpty(), query -> query
                        .like(PlatformConfigDO::getConfigKey, keyword)
                        .or().like(PlatformConfigDO::getConfigName, keyword)
                        .or().like(PlatformConfigDO::getConfigValue, keyword)
                        .or().like(PlatformConfigDO::getRemark, keyword))
                .orderByAsc(PlatformConfigDO::getSortOrder)
                .orderByDesc(PlatformConfigDO::getId));
    }

    default List<PlatformConfigDO> selectByValueType(String valueType) {
        return selectList(new LambdaQueryWrapper<PlatformConfigDO>()
                .eq(PlatformConfigDO::getValueType, valueType)
                .orderByAsc(PlatformConfigDO::getSortOrder));
    }

    default PlatformConfigDO selectByConfigKey(String configKey) {
        return selectOne(new LambdaQueryWrapper<PlatformConfigDO>()
                .eq(PlatformConfigDO::getConfigKey, configKey)
                .last("LIMIT 1"));
    }

    default Long countByConfigKey(String configKey, Long excludedId) {
        return selectCount(new LambdaQueryWrapper<PlatformConfigDO>()
                .eq(PlatformConfigDO::getConfigKey, configKey)
                .ne(excludedId != null, PlatformConfigDO::getId, excludedId));
    }

    default PlatformConfigDO selectConfigById(Long id) {
        return selectById(id);
    }

    default int insertConfig(PlatformConfigDO config) {
        return insert(config);
    }

    default int updateConfig(PlatformConfigDO config) {
        return updateById(config);
    }

    default int deleteConfigById(Long id) {
        return deleteById(id);
    }
}
