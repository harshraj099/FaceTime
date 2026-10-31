package com.yoom.stream;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "yoom.stream")
public record StreamProperties(String apiKey, String apiSecret) {
}
