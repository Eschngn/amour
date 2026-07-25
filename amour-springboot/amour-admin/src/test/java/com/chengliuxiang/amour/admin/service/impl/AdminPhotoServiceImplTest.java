package com.chengliuxiang.amour.admin.service.impl;

import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.chengliuxiang.amour.admin.model.vo.photo.DeletePhotoCategoryReqVO;
import com.chengliuxiang.amour.admin.model.vo.photo.DeletePhotoReqVO;
import com.chengliuxiang.amour.admin.model.vo.photo.FindPhotoPageListReqVO;
import com.chengliuxiang.amour.admin.model.vo.photo.FindPhotoPageListRspVO;
import com.chengliuxiang.amour.admin.model.vo.photo.SavePhotoCategoryReqVO;
import com.chengliuxiang.amour.common.domain.dos.PhotoCategoryDO;
import com.chengliuxiang.amour.common.domain.dos.PhotoDO;
import com.chengliuxiang.amour.common.domain.mapper.PhotoCategoryMapper;
import com.chengliuxiang.amour.common.domain.mapper.PhotoMapper;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminPhotoServiceImplTest {

    @Mock
    private PhotoMapper photoMapper;

    @Mock
    private PhotoCategoryMapper photoCategoryMapper;

    @InjectMocks
    private AdminPhotoServiceImpl adminPhotoService;

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void shouldReturnPhotoPageAndClampPageSize() {
        PhotoDO photo = PhotoDO.builder()
                .id(1L)
                .title("海边日落")
                .photoCategoryId(1L)
                .url("https://example.com/sunset.jpg")
                .takenTime(LocalDateTime.of(2026, 7, 1, 18, 30))
                .sortOrder(10)
                .isCover(true)
                .isVisible(true)
                .isDeleted(false)
                .build();
        Page<PhotoDO> resultPage = new Page<>(1, 100, 1);
        resultPage.setRecords(Collections.singletonList(photo));
        when(photoMapper.selectPage(any(IPage.class), any(Wrapper.class))).thenReturn(resultPage);
        when(photoCategoryMapper.selectBatchIds(any()))
                .thenReturn(Collections.singletonList(PhotoCategoryDO.builder()
                        .id(1L)
                        .categoryName("一起旅行")
                        .build()));

        FindPhotoPageListReqVO reqVO = new FindPhotoPageListReqVO();
        reqVO.setCurrent(0L);
        reqVO.setSize(1000L);
        reqVO.setTitle("日落");
        Response<PageResult<FindPhotoPageListRspVO>> response = adminPhotoService.findPhotoPageList(reqVO);

        assertTrue(response.isSuccess());
        assertEquals(1L, response.getData().getTotal());
        assertEquals("海边日落", response.getData().getRecords().get(0).getTitle());
        assertEquals("一起旅行", response.getData().getRecords().get(0).getCategoryName());
        assertTrue(response.getData().getRecords().get(0).getIsCover());

        ArgumentCaptor<IPage> pageCaptor = ArgumentCaptor.forClass(IPage.class);
        verify(photoMapper).selectPage(pageCaptor.capture(), any(Wrapper.class));
        assertEquals(1L, pageCaptor.getValue().getCurrent());
        assertEquals(100L, pageCaptor.getValue().getSize());
    }

    @Test
    void shouldRejectDeletingMissingPhoto() {
        when(photoMapper.selectOne(any(Wrapper.class))).thenReturn(null);
        DeletePhotoReqVO reqVO = new DeletePhotoReqVO();
        reqVO.setId(99L);

        BizException exception = assertThrows(BizException.class, () -> adminPhotoService.deletePhoto(reqVO));

        assertEquals("20021", exception.getErrorCode());
    }

    @Test
    void shouldRejectDeletingCategoryInUse() {
        when(photoCategoryMapper.selectById(3L)).thenReturn(PhotoCategoryDO.builder()
                .id(3L)
                .categoryName("特别纪念")
                .build());
        when(photoMapper.selectCount(any(Wrapper.class))).thenReturn(1L);
        DeletePhotoCategoryReqVO reqVO = new DeletePhotoCategoryReqVO();
        reqVO.setId(3L);

        BizException exception = assertThrows(BizException.class,
                () -> adminPhotoService.deletePhotoCategory(reqVO));

        assertEquals("20024", exception.getErrorCode());
        verify(photoCategoryMapper, never()).deleteById(3L);
    }

    @Test
    void shouldDeleteUnusedCategory() {
        when(photoCategoryMapper.selectById(4L)).thenReturn(PhotoCategoryDO.builder()
                .id(4L)
                .categoryName("待整理")
                .build());
        when(photoMapper.selectCount(any(Wrapper.class))).thenReturn(0L);
        DeletePhotoCategoryReqVO reqVO = new DeletePhotoCategoryReqVO();
        reqVO.setId(4L);

        Response<Void> response = adminPhotoService.deletePhotoCategory(reqVO);

        assertTrue(response.isSuccess());
        verify(photoCategoryMapper).deleteById(4L);
    }

    @Test
    void shouldUpdatePhotoCategoryEnabledStatus() {
        PhotoCategoryDO category = PhotoCategoryDO.builder()
                .id(5L)
                .categoryName("暂时隐藏")
                .isEnabled(true)
                .build();
        when(photoCategoryMapper.selectCount(any(Wrapper.class))).thenReturn(0L);
        when(photoCategoryMapper.selectById(5L)).thenReturn(category);

        SavePhotoCategoryReqVO reqVO = new SavePhotoCategoryReqVO();
        reqVO.setId(5L);
        reqVO.setCategoryName("暂时隐藏");
        reqVO.setIsEnabled(false);

        Response<Long> response = adminPhotoService.savePhotoCategory(reqVO);

        assertTrue(response.isSuccess());
        assertFalse(category.getIsEnabled());
        verify(photoCategoryMapper).updateById(category);
    }
}
