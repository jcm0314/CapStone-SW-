package kr.co.checkmate.server.domain.feedback;

import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.checkmate.server.common.exception.GlobalExceptionHandler;
import kr.co.checkmate.server.config.SecurityConfig;
import kr.co.checkmate.server.domain.feedback.controller.FeedbackController;
import kr.co.checkmate.server.domain.feedback.controller.PublicFeedbackController;
import kr.co.checkmate.server.domain.feedback.dto.FeedbackReportCreateRequest;
import kr.co.checkmate.server.domain.feedback.dto.FeedbackReportResponse;
import kr.co.checkmate.server.domain.feedback.dto.PublicFeedbackReportResponse;
import kr.co.checkmate.server.domain.feedback.service.FeedbackService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({FeedbackController.class, PublicFeedbackController.class})
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
class FeedbackControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private FeedbackService feedbackService;

    @Test
    @DisplayName("POST /feedback 호출 시 201 Created와 피드백 리포트를 반환한다")
    void createFeedbackReport_returnsCreated() throws Exception {
        // given
        UUID tenantId = UUID.randomUUID();
        UUID applicantId = UUID.randomUUID();

        FeedbackReportCreateRequest request = FeedbackReportCreateRequest.builder()
                .strengthsSummary("구체적 수치 제시 우수")
                .improvementPoints("협업 갈등 해결 사례 보강")
                .recommendedActions("STAR 모델 적용")
                .overallCoachingComment("우수한 역량을 보유함")
                .build();

        FeedbackReportResponse response = FeedbackReportResponse.builder()
                .id(UUID.randomUUID())
                .tenantId(tenantId)
                .applicantId(applicantId)
                .feedbackToken("token-abc-123")
                .shareUrl("http://localhost:5173/feedback/token-abc-123")
                .strengthsSummary("구체적 수치 제시 우수")
                .improvementPoints("협업 갈등 해결 사례 보강")
                .recommendedActions("STAR 모델 적용")
                .overallCoachingComment("우수한 역량을 보유함")
                .isSent(false)
                .viewCount(0)
                .createdAt(LocalDateTime.now())
                .build();

        given(feedbackService.createOrUpdateFeedbackReport(eq(tenantId), eq(applicantId), any(FeedbackReportCreateRequest.class)))
                .willReturn(response);

        // when & then
        mockMvc.perform(post("/api/v1/tenants/{tenantId}/applicants/{applicantId}/feedback", tenantId, applicantId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.feedbackToken").value("token-abc-123"))
                .andExpect(jsonPath("$.data.isSent").value(false))
                .andExpect(jsonPath("$.data.strengthsSummary").value("구체적 수치 제시 우수"));
    }

    @Test
    @DisplayName("POST /feedback/send 호출 시 200 OK와 발송 완료 상태를 반환한다")
    void sendFeedbackReport_returnsOk() throws Exception {
        // given
        UUID tenantId = UUID.randomUUID();
        UUID applicantId = UUID.randomUUID();

        FeedbackReportResponse response = FeedbackReportResponse.builder()
                .id(UUID.randomUUID())
                .tenantId(tenantId)
                .applicantId(applicantId)
                .feedbackToken("token-abc-123")
                .isSent(true)
                .sentAt(LocalDateTime.now())
                .build();

        given(feedbackService.markFeedbackAsSent(tenantId, applicantId))
                .willReturn(response);

        // when & then
        mockMvc.perform(post("/api/v1/tenants/{tenantId}/applicants/{applicantId}/feedback/send", tenantId, applicantId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.isSent").value(true));
    }

    @Test
    @DisplayName("GET /api/v1/public/feedback/{token} 호출 시 200 OK와 구직자 공개 리포트를 반환한다")
    void getPublicFeedback_returnsOk() throws Exception {
        // given
        String token = "public-view-token-999";
        PublicFeedbackReportResponse response = PublicFeedbackReportResponse.builder()
                .feedbackToken(token)
                .strengthsSummary("문제 해결력 우수")
                .improvementPoints("논리성 보완")
                .recommendedActions("문단 재배치")
                .overallCoachingComment("합격을 응원합니다.")
                .generatedAt(LocalDateTime.now())
                .build();

        given(feedbackService.getPublicFeedbackReport(token))
                .willReturn(response);

        // when & then
        mockMvc.perform(get("/api/v1/public/feedback/{token}", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.feedbackToken").value(token))
                .andExpect(jsonPath("$.data.strengthsSummary").value("문제 해결력 우수"));
    }
}
