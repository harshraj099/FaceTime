package com.yoom.stream;

import java.util.Map;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stream")
public class StreamController {

    private final StreamTokenService streamTokenService;

    public StreamController(StreamTokenService streamTokenService) {
        this.streamTokenService = streamTokenService;
    }

    @GetMapping("/token")
    public Map<String, String> token(@AuthenticationPrincipal String userId) {
        return Map.of("token", streamTokenService.createToken(userId));
    }
}
