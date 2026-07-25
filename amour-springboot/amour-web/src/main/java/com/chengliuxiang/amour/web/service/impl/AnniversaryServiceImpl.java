package com.chengliuxiang.amour.web.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.chengliuxiang.amour.common.domain.dos.AnniversaryDO;
import com.chengliuxiang.amour.common.domain.mapper.AnniversaryMapper;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.anniversary.AnniversaryVO;
import com.chengliuxiang.amour.web.service.AnniversaryService;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AnniversaryServiceImpl implements AnniversaryService {

    @Resource
    private AnniversaryMapper anniversaryMapper;

    @Override
    public Response<List<AnniversaryVO>> listAnniversaries() {
        List<AnniversaryVO> records = anniversaryMapper.selectList(
                        new LambdaQueryWrapper<AnniversaryDO>()
                                .eq(AnniversaryDO::getIsDeleted, false)
                                .eq(AnniversaryDO::getIsVisible, true)
                                .orderByAsc(AnniversaryDO::getSortOrder)
                                .orderByAsc(AnniversaryDO::getAnniversaryDate)
                                .orderByAsc(AnniversaryDO::getId))
                .stream()
                .map(this::toVO)
                .collect(Collectors.toList());
        return Response.success(records);
    }

    private AnniversaryVO toVO(AnniversaryDO anniversary) {
        return AnniversaryVO.builder()
                .id(anniversary.getId())
                .title(anniversary.getTitle())
                .description(anniversary.getDescription())
                .anniversaryDate(anniversary.getAnniversaryDate())
                .repeatType(anniversary.getRepeatType())
                .category(anniversary.getCategory())
                .colorCode(anniversary.getColorCode())
                .location(anniversary.getLocation())
                .sortOrder(anniversary.getSortOrder())
                .build();
    }
}
