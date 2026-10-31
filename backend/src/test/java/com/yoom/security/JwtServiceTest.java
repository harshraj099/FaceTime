package com.yoom.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;

import org.junit.jupiter.api.Test;

class JwtServiceTest {

    private final JwtService jwtService =
            new JwtService(new JwtProperties("a-test-secret-that-is-at-least-32-chars", Duration.ofDays(7)));

    @Test
    void roundTripsUserId() {
        assertThat(jwtService.parseUserId(jwtService.createToken("abc"))).contains("abc");
    }

    @Test
    void rejectsTamperedToken() {
        assertThat(jwtService.parseUserId(jwtService.createToken("abc") + "x")).isEmpty();
        assertThat(jwtService.parseUserId("not-a-jwt")).isEmpty();
    }

    @Test
    void rejectsShortSecret() {
        assertThatThrownBy(() -> new JwtService(new JwtProperties("short", Duration.ofDays(7))))
                .isInstanceOf(IllegalStateException.class);
    }
}
