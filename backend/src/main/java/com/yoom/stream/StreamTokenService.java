package com.yoom.stream;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

import javax.crypto.spec.SecretKeySpec;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.yoom.common.ApiException;

import io.jsonwebtoken.Jwts;

/**
 * Mints Stream Video user tokens: an HS256 JWT with a "user_id" claim signed with the Stream API secret.
 * Same lifetime as the original server action: valid for 1 hour, issued 60s in the past to absorb clock skew.
 */
@Service
public class StreamTokenService {

    private final StreamProperties properties;

    public StreamTokenService(StreamProperties properties) {
        this.properties = properties;
    }

    public String createToken(String userId) {
        if (isBlank(properties.apiKey())) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Stream API key secret is missing");
        }
        if (isBlank(properties.apiSecret())) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Stream API secret is missing");
        }

        Instant now = Instant.now();
        SecretKeySpec key = new SecretKeySpec(properties.apiSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256");

        return Jwts.builder()
                .claim("user_id", userId)
                .issuedAt(Date.from(now.minusSeconds(60)))
                .expiration(Date.from(now.plusSeconds(3600)))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
