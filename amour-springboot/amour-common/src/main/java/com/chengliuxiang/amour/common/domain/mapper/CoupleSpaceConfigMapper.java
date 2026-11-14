package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.chengliuxiang.amour.common.domain.dos.CoupleSpaceConfigDO;

import java.time.LocalDateTime;
import java.util.List;

public interface CoupleSpaceConfigMapper extends BaseMapper<CoupleSpaceConfigDO> {

    default List<CoupleSpaceConfigDO> selectBySpaceId(Long spaceId) {
        return selectList(new LambdaQueryWrapper<CoupleSpaceConfigDO>()
                .eq(CoupleSpaceConfigDO::getSpaceId, spaceId)
                .orderByAsc(CoupleSpaceConfigDO::getId));
    }

    default CoupleSpaceConfigDO selectBySpaceAndKey(Long spaceId, String configKey) {
        return selectOne(new LambdaQueryWrapper<CoupleSpaceConfigDO>()
                .eq(CoupleSpaceConfigDO::getSpaceId, spaceId)
                .eq(CoupleSpaceConfigDO::getConfigKey, configKey));
    }

    default CoupleSpaceConfigDO selectValueBySpaceAndKey(Long spaceId, String configKey) {
        return selectOne(new LambdaQueryWrapper<CoupleSpaceConfigDO>()
                .select(CoupleSpaceConfigDO::getConfigValue)
                .eq(CoupleSpaceConfigDO::getSpaceId, spaceId)
                .eq(CoupleSpaceConfigDO::getConfigKey, configKey)
                .last("LIMIT 1"));
    }

    default List<CoupleSpaceConfigDO> selectBySpaceAndKeys(Long spaceId, List<String> configKeys) {
        return selectList(new LambdaQueryWrapper<CoupleSpaceConfigDO>()
                .eq(CoupleSpaceConfigDO::getSpaceId, spaceId)
                .in(CoupleSpaceConfigDO::getConfigKey, configKeys));
    }

    default int insertConfig(CoupleSpaceConfigDO config) {
        return insert(config);
    }

    default int updateConfig(CoupleSpaceConfigDO config) {
        return update(config, new LambdaUpdateWrapper<CoupleSpaceConfigDO>()
                .eq(CoupleSpaceConfigDO::getId, config.getId())
                .eq(CoupleSpaceConfigDO::getSpaceId, config.getSpaceId()));
    }

    default int updateValue(Long spaceId, String configKey, String configValue, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<CoupleSpaceConfigDO>()
                .eq(CoupleSpaceConfigDO::getSpaceId, spaceId)
                .eq(CoupleSpaceConfigDO::getConfigKey, configKey)
                .set(CoupleSpaceConfigDO::getConfigValue, configValue)
                .setSql("revision = revision + 1")
                .set(CoupleSpaceConfigDO::getUpdateTime, updateTime));
    }

    default int deleteBySpaceId(Long spaceId) {
        return delete(new LambdaQueryWrapper<CoupleSpaceConfigDO>()
                .eq(CoupleSpaceConfigDO::getSpaceId, spaceId));
    }
}
