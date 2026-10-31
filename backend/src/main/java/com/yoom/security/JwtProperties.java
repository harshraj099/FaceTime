package com.yoom.security;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "yoom.jwt")
public record JwtProperties(String secret, Duration expiration) {
}
