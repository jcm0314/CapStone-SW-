package kr.co.checkmate.server.health.controller;

import kr.co.checkmate.server.common.response.ApiResponse;
import kr.co.checkmate.server.health.dto.HealthStatusResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.core.env.Environment;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/v1/health")
@RequiredArgsConstructor
public class HealthController {

    private final Environment environment;

    @GetMapping
    public ResponseEntity<ApiResponse<HealthStatusResponse>> checkHealth() {
        String[] profiles = environment.getActiveProfiles();
        List<String> activeProfiles = profiles.length > 0 ? Arrays.asList(profiles) : List.of("default");

        HealthStatusResponse status = HealthStatusResponse.builder()
                .status("UP")
                .service("Check-Mate Core API Server")
                .version("v1.0.0")
                .activeProfiles(activeProfiles)
                .timestamp(Instant.now())
                .build();

        return ResponseEntity.ok(ApiResponse.success(status));
    }
}
