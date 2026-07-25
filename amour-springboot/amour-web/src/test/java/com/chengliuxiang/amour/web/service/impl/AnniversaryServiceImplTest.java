package com.chengliuxiang.amour.web.service.impl;

import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.chengliuxiang.amour.common.domain.dos.AnniversaryDO;
import com.chengliuxiang.amour.common.domain.mapper.AnniversaryMapper;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.anniversary.AnniversaryVO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnniversaryServiceImplTest {

    @Mock
    private AnniversaryMapper anniversaryMapper;

    @InjectMocks
    private AnniversaryServiceImpl anniversaryService;

    @Test
    void shouldMapVisibleAnniversaryRecords() {
        AnniversaryDO anniversary = AnniversaryDO.builder()
                .id(1001L)
                .title("第一次一起做饭")
                .description("一起完成的第一顿饭。")
                .anniversaryDate(LocalDate.of(2024, 10, 19))
                .repeatType(1)
                .category("memory")
                .colorCode("#4579AD")
                .location("我们的小厨房")
                .sortOrder(40)
                .isVisible(true)
                .isDeleted(false)
                .build();
        when(anniversaryMapper.selectList(any(Wrapper.class)))
                .thenReturn(Collections.singletonList(anniversary));

        Response<java.util.List<AnniversaryVO>> response = anniversaryService.listAnniversaries();

        assertNotNull(response.getData());
        assertEquals(1, response.getData().size());
        assertEquals("第一次一起做饭", response.getData().get(0).getTitle());
        assertEquals(LocalDate.of(2024, 10, 19), response.getData().get(0).getAnniversaryDate());
        assertEquals("memory", response.getData().get(0).getCategory());
        assertEquals("#4579AD", response.getData().get(0).getColorCode());
    }
}
