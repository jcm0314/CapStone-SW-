package kr.co.checkmate.server.health.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.List;

@Getter
@Builder
public class HealthStatusResponse {
    private final String status;
    private final String service;
    private final String version;
    private final List<String> activeProfiles;
    private final Instant timestamp;
}

