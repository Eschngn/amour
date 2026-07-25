package com.chengliuxiang.amour.admin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.chengliuxiang.amour.admin.model.vo.chapter.FindChapterListRspVO;
import com.chengliuxiang.amour.admin.service.AdminChapterService;
import com.chengliuxiang.amour.common.domain.dos.StoryChapterDO;
import com.chengliuxiang.amour.common.domain.mapper.StoryChapterMapper;
import com.chengliuxiang.amour.common.enums.VisibleEnum;
import com.chengliuxiang.amour.common.utils.Response;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
public class AdminChapterServiceImpl implements AdminChapterService {

    @Resource
    private StoryChapterMapper storyChapterMapper;

    @Override
    public Response<List<FindChapterListRspVO>> findChapterList() {
        List<StoryChapterDO> chapterDOS = storyChapterMapper.selectList(
                new LambdaQueryWrapper<StoryChapterDO>()
                        .eq(StoryChapterDO::getIsVisible, VisibleEnum.PUBLIC.getCode())
                        .orderByAsc(StoryChapterDO::getSortOrder));

        List<FindChapterListRspVO> voList = chapterDOS.stream()
                .map(chapter -> FindChapterListRspVO.builder()
                        .id(chapter.getId())
                        .name(chapter.getName())
                        .colorCode(chapter.getColorCode())
                        .sortOrder(chapter.getSortOrder())
                        .isVisible(chapter.getIsVisible())
                        .build())
                .collect(Collectors.toList());

        return Response.success(voList);
    }
}
