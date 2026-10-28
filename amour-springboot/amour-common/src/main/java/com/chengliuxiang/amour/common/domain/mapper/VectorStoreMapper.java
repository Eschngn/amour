package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.chengliuxiang.amour.common.domain.dos.VectorStoreDO;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface VectorStoreMapper extends BaseMapper<VectorStoreDO> {
}
