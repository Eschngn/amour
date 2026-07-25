package com.chengliuxiang.amour.web.service.impl;

import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.chengliuxiang.amour.common.domain.dos.PhotoCategoryDO;
import com.chengliuxiang.amour.common.domain.dos.PhotoDO;
import com.chengliuxiang.amour.common.domain.mapper.PhotoCategoryMapper;
import com.chengliuxiang.amour.common.domain.mapper.PhotoMapper;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoPageItemVO;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoPageQueryReqVO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PhotoServiceImplTest {

    @Mock
    private PhotoMapper photoMapper;

    @Mock
    private PhotoCategoryMapper photoCategoryMapper;

    @InjectMocks
    private PhotoServiceImpl photoService;

    @Test
    void shouldReturnVisiblePhotoPageData() {
        PhotoDO photo = PhotoDO.builder()
                .id(1L)
                .title("海风里的拥抱")
                .description("一起去看海。")
                .photoCategoryId(1L)
                .url("https://example.com/photo.png")
                .takenTime(LocalDateTime.of(2025, 5, 2, 17, 20))
                .location("海边")
                .build();

        Page<PhotoDO> resultPage = new Page<>(1, 8, 1);
        resultPage.setRecords(Collections.singletonList(photo));
        when(photoMapper.selectPage(any(IPage.class), any(Wrapper.class))).thenReturn(resultPage);
        when(photoCategoryMapper.selectBatchIds(any()))
                .thenReturn(Collections.singletonList(PhotoCategoryDO.builder()
                        .id(1L)
                        .categoryName("一起旅行")
                        .build()));

        PhotoPageQueryReqVO reqVO = new PhotoPageQueryReqVO();
        reqVO.setCurrent(1L);
        reqVO.setSize(8L);
        reqVO.setPhotoCategoryId(1L);

        Response<PageResult<PhotoPageItemVO>> response = photoService.pagePhotos(reqVO);

        assertNotNull(response.getData());
        assertEquals(1L, response.getData().getTotal());
        assertEquals(1, response.getData().getRecords().size());
        assertEquals("海风里的拥抱", response.getData().getRecords().get(0).getTitle());
        assertEquals("一起旅行", response.getData().getRecords().get(0).getCategoryName());
    }

    @Test
    void shouldReturnVisibleCoverPhoto() {
        PhotoDO cover = PhotoDO.builder()
                .id(8L)
                .title("我们的夏天")
                .description("首页相册封面")
                .photoCategoryId(3L)
                .url("https://example.com/cover.png")
                .isCover(true)
                .isVisible(true)
                .isDeleted(false)
                .build();
        when(photoMapper.selectOne(any(Wrapper.class))).thenReturn(cover);
        when(photoCategoryMapper.selectById(3L)).thenReturn(PhotoCategoryDO.builder()
                .id(3L)
                .categoryName("特别纪念")
                .build());

        Response<PhotoPageItemVO> response = photoService.findCoverPhoto();

        assertNotNull(response.getData());
        assertEquals(8L, response.getData().getId());
        assertEquals("我们的夏天", response.getData().getTitle());
        assertEquals("https://example.com/cover.png", response.getData().getUrl());
    }
}
