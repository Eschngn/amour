package com.chengliuxiang.amour.web.service.impl;

import cn.dev33.satoken.stp.StpUtil;
import com.chengliuxiang.amour.common.domain.dos.AnniversaryDO;
import com.chengliuxiang.amour.common.domain.dos.CoupleMemberDO;
import com.chengliuxiang.amour.common.domain.mapper.AnniversaryMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleMemberMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
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

    @Resource
    private CoupleMemberMapper coupleMemberMapper;

    @Override
    public Response<List<AnniversaryVO>> listAnniversaries() {
        Long spaceId = requireCurrentSpaceId();
        List<AnniversaryVO> records = anniversaryMapper.selectSpaceList(spaceId)
                .stream()
                .map(this::toVO)
                .collect(Collectors.toList());
        return Response.success(records);
    }

    private Long requireCurrentSpaceId() {
        List<CoupleMemberDO> memberships = coupleMemberMapper.selectActiveByUserId(StpUtil.getLoginIdAsLong());
        if (memberships == null || memberships.isEmpty()) {
            throw new BizException(ResponseCodeEnum.SPACE_NOT_EXIST);
        }
        return memberships.get(0).getSpaceId();
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
