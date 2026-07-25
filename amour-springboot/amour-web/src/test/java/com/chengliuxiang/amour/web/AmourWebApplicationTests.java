package com.chengliuxiang.amour.web;

import com.chengliuxiang.amour.common.domain.dos.StoryNodeDO;
import com.chengliuxiang.amour.common.domain.mapper.StoryNodeMapper;
import com.chengliuxiang.amour.common.domain.mapper.UserMapper;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.RedisTemplate;

import javax.annotation.Resource;

@SpringBootTest
@Slf4j
public class AmourWebApplicationTests {

    @Resource
    private UserMapper userMapper;
    @Resource
    private RedisTemplate<String,Object> redisTemplate;
    @Resource
    private StoryNodeMapper storyNodeMapper;

    @Test
    void testLog() {
        log.info("这是一行 Info 级别日志");
        log.warn("这是一行 Warn 级别日志");
        log.error("这是一行 Error 级别日志");

        // 占位符
        String author = "橙留香";
        log.info("这是一行带有占位符日志，作者：{}", author);
    }

    @Test
    void mysqlTest() {
        StoryNodeDO storyNodeDO = storyNodeMapper.selectById(1);
        log.info("查询到的数据:{}",storyNodeDO);
    }

    @Test
    void redisTest(){
        redisTemplate.opsForValue().set("name","橙留香");
    }
}
