package kr.co.checkmate.server.domain.interview;

import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.checkmate.server.common.exception.GlobalExceptionHandler;
import kr.co.checkmate.server.config.SecurityConfig;
import kr.co.checkmate.server.domain.interview.controller.InterviewController;
import kr.co.checkmate.server.domain.interview.dto.InterviewScorecardResponse;
import kr.co.checkmate.server.domain.interview.dto.InterviewScorecardSubmitRequest;
import kr.co.checkmate.server.domain.interview.dto.InterviewSummaryResponse;
import kr.co.checkmate.server.domain.interview.dto.QuestionEvaluationDto;
import kr.co.checkmate.server.domain.interview.entity.InterviewRecommendation;
import kr.co.checkmate.server.domain.interview.service.InterviewService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(InterviewController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
class InterviewControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private InterviewService interviewService;

    @Test
    @DisplayName("POST /interviews 호출 시 201 Created와 채점표 결과를 반환한다")
    void submitScorecard_returnsCreated() throws Exception {
        // given
        UUID tenantId = UUID.randomUUID();
        UUID applicantId = UUID.randomUUID();

        QuestionEvaluationDto q1 = QuestionEvaluationDto.builder()
                .questionText("분산 락 구현 경험은?")
                .category("기술")
                .checked(true)
                .score(5)
                .interviewerNote("Redis Redlock 상세 설명")
                .build();

        InterviewScorecardSubmitRequest request = InterviewScorecardSubmitRequest.builder()
                .interviewerName("이수석")
                .recommendation(InterviewRecommendation.PASS)
                .totalScore(90)
                .overallComment("매우 우수")
                .questionEvaluations(List.of(q1))
                .build();

        InterviewScorecardResponse response = InterviewScorecardResponse.builder()
                .id(UUID.randomUUID())
                .tenantId(tenantId)
                .applicantId(applicantId)
                .interviewerName("이수석")
                .recommendation(InterviewRecommendation.PASS)
                .totalScore(90)
                .overallComment("매우 우수")
                .questionEvaluations(List.of(q1))
                .createdAt(LocalDateTime.now())
                .build();

        given(interviewService.submitScorecard(eq(tenantId), eq(applicantId), any(InterviewScorecardSubmitRequest.class)))
                .willReturn(response);

        // when & then
        mockMvc.perform(post("/api/v1/tenants/{tenantId}/applicants/{applicantId}/interviews", tenantId, applicantId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.interviewerName").value("이수석"))
                .andExpect(jsonPath("$.data.recommendation").value("PASS"))
                .andExpect(jsonPath("$.data.totalScore").value(90))
                .andExpect(jsonPath("$.data.questionEvaluations").isArray());
    }

    @Test
    @DisplayName("GET /interviews 호출 시 200 OK와 다중 면접관 집계 요약을 반환한다")
    void getInterviewSummary_returnsSuccess() throws Exception {
        // given
        UUID tenantId = UUID.randomUUID();
        UUID applicantId = UUID.randomUUID();

        InterviewSummaryResponse summaryResponse = InterviewSummaryResponse.builder()
                .applicantId(applicantId)
                .totalInterviewers(2)
                .averageScore(87.5)
                .passCount(2)
                .failCount(0)
                .holdCount(0)
                .consensusRecommendation(InterviewRecommendation.PASS)
                .scorecards(List.of())
                .build();

        given(interviewService.getInterviewSummary(tenantId, applicantId)).willReturn(summaryResponse);

        // when & then
        mockMvc.perform(get("/api/v1/tenants/{tenantId}/applicants/{applicantId}/interviews", tenantId, applicantId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalInterviewers").value(2))
                .andExpect(jsonPath("$.data.averageScore").value(87.5))
                .andExpect(jsonPath("$.data.consensusRecommendation").value("PASS"));
    }
}
