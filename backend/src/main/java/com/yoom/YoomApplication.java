package com.yoom;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class YoomApplication {

    public static void main(String[] args) {
        SpringApplication.run(YoomApplication.class, args);
    }
}
