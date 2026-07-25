package com.chengliuxiang.amour.web;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@ComponentScan({"com.chengliuxiang.amour.*"})
public class AmourWebApplication {

    public static void main(String[] args) {
        SpringApplication.run(AmourWebApplication.class, args);
    }

}
