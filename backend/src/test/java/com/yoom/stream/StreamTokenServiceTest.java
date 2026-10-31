package com.yoom.stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.charset.StandardCharsets;

import javax.crypto.spec.SecretKeySpec;

import org.junit.jupiter.api.Test;

import com.yoom.common.ApiException;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;

class StreamTokenServiceTest {

    private static final String SECRET = "test-stream-secret-that-is-long-enough-for-hs256";

    @Test
    void createsHs256TokenWithUserIdValidForOneHour() {
        StreamTokenService service = new StreamTokenService(new StreamProperties("key", SECRET));

        String token = service.createToken("user-123");

        var jws = Jwts.parser()
                .verifyWith(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"))
                .build()
                .parseSignedClaims(token);
        Claims claims = jws.getPayload();

        assertThat(jws.getHeader().getAlgorithm()).isEqualTo("HS256");
        assertThat(claims.get("user_id", String.class)).isEqualTo("user-123");
        long lifetimeSeconds = (claims.getExpiration().getTime() - claims.getIssuedAt().getTime()) / 1000;
        assertThat(lifetimeSeconds).isEqualTo(3660);
    }

    @Test
    void failsWhenSecretIsMissing() {
        StreamTokenService service = new StreamTokenService(new StreamProperties("key", null));

        assertThatThrownBy(() -> service.createToken("user-123"))
                .isInstanceOf(ApiException.class)
                .hasMessage("Stream API secret is missing");
    }
}
