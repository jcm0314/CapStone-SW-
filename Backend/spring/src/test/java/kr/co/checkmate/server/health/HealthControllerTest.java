package kr.co.checkmate.server.health;

import kr.co.checkmate.server.config.SecurityConfig;
import kr.co.checkmate.server.health.controller.HealthController;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(HealthController.class)
@Import(SecurityConfig.class)
class HealthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("GET /api/v1/health 호출 시 200 OK와 정상 헬스 상태 JSON을 반환한다")
    void checkHealth_returnsSuccessResponse() throws Exception {
        mockMvc.perform(get("/api/v1/health")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("UP"))
                .andExpect(jsonPath("$.data.service").value("Check-Mate Core API Server"))
                .andExpect(jsonPath("$.data.version").value("v1.0.0"))
                .andExpect(jsonPath("$.data.activeProfiles").isArray())
                .andExpect(jsonPath("$.data.timestamp").exists())
                .andExpect(jsonPath("$.error").doesNotExist());
    }
}

