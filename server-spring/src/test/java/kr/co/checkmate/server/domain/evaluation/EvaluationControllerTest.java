package kr.co.checkmate.server.domain.evaluation;

import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.checkmate.server.common.exception.EntityNotFoundException;
import kr.co.checkmate.server.common.exception.GlobalExceptionHandler;
import kr.co.checkmate.server.config.SecurityConfig;
import kr.co.checkmate.server.domain.evaluation.controller.EvaluationController;
import kr.co.checkmate.server.domain.evaluation.dto.EvaluationApprovalRequest;
import kr.co.checkmate.server.domain.evaluation.dto.EvaluationResponse;
import kr.co.checkmate.server.domain.evaluation.dto.EvaluationSaveRequest;
import kr.co.checkmate.server.domain.evaluation.dto.EvidenceSentenceDto;
import kr.co.checkmate.server.domain.evaluation.service.EvaluationService;
import kr.co.checkmate.server.support.TestAuth;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(EvaluationController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
class EvaluationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private EvaluationService evaluationService;

    @Test
    @DisplayName("POST /evaluation 호출 시 201 Created와 저장된 평가 응답을 반환한다")
    void saveEvaluation_returnsCreated() throws Exception {
        // given
        UUID tenantId = UUID.randomUUID();
        UUID applicantId = UUID.randomUUID();

        EvidenceSentenceDto evidenceDto = EvidenceSentenceDto.builder()
                .category("문제해결")
                .sentence("Kafka 분산 큐 도입")
                .quoteOffsetStart(10)
                .quoteOffsetEnd(30)
                .confidenceScore(0.95)
                .rationale("기술 설명 명확")
                .interviewQuestion("리밸런싱 대응은?")
                .build();

        EvaluationSaveRequest saveRequest = EvaluationSaveRequest.builder()
                .summary("종합 우수 평가")
                .totalScore(92)
                .passRecommendation(true)
                .fitScore(90)
                .competencyScore(94)
                .plagiarismScore(1)
                .evidenceSentences(List.of(evidenceDto))
                .build();

        EvaluationResponse response = EvaluationResponse.builder()
                .id(UUID.randomUUID())
                .tenantId(tenantId)
                .applicantId(applicantId)
                .summary("종합 우수 평가")
                .totalScore(92)
                .passRecommendation(true)
                .fitScore(90)
                .competencyScore(94)
                .plagiarismScore(1)
                .reviewedByHuman(false)
                .evidenceSentences(List.of(evidenceDto))
                .createdAt(LocalDateTime.now())
                .build();

        given(evaluationService.saveEvaluation(eq(tenantId), eq(applicantId), any(EvaluationSaveRequest.class)))
                .willReturn(response);

        // when & then
        mockMvc.perform(post("/api/v1/tenants/{tenantId}/applicants/{applicantId}/evaluation", tenantId, applicantId)
                        .with(TestAuth.recruiter(tenantId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(saveRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalScore").value(92))
                .andExpect(jsonPath("$.data.passRecommendation").value(true))
                .andExpect(jsonPath("$.data.evidenceSentences").isArray())
                .andExpect(jsonPath("$.data.evidenceSentences[0].category").value("문제해결"))
                .andExpect(jsonPath("$.data.reviewedByHuman").value(false));
    }

    @Test
    @DisplayName("GET /evaluation 호출 시 평가 결과를 200 OK로 반환한다")
    void getEvaluation_returnsSuccess() throws Exception {
        // given
        UUID tenantId = UUID.randomUUID();
        UUID applicantId = UUID.randomUUID();

        EvaluationResponse response = EvaluationResponse.builder()
                .id(UUID.randomUUID())
                .tenantId(tenantId)
                .applicantId(applicantId)
                .summary("기존 평가 결과")
                .totalScore(88)
                .passRecommendation(true)
                .reviewedByHuman(true)
                .reviewerNotes("팀장 승인 완료")
                .evidenceSentences(List.of())
                .build();

        given(evaluationService.getEvaluationByApplicant(tenantId, applicantId)).willReturn(response);

        // when & then
        mockMvc.perform(get("/api/v1/tenants/{tenantId}/applicants/{applicantId}/evaluation", tenantId, applicantId)
                        .with(TestAuth.recruiter(tenantId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalScore").value(88))
                .andExpect(jsonPath("$.data.reviewedByHuman").value(true));
    }

    @Test
    @DisplayName("GET /evaluation 조회 시 미존재 시 404 Not Found를 반환한다")
    void getEvaluation_notFound_returnsNotFound() throws Exception {
        // given
        UUID tenantId = UUID.randomUUID();
        UUID applicantId = UUID.randomUUID();

        given(evaluationService.getEvaluationByApplicant(tenantId, applicantId))
                .willThrow(new EntityNotFoundException("해당 지원자의 평가 결과를 찾을 수 없습니다: " + applicantId));

        // when & then
        mockMvc.perform(get("/api/v1/tenants/{tenantId}/applicants/{applicantId}/evaluation", tenantId, applicantId)
                        .with(TestAuth.recruiter(tenantId)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("ENTITY_NOT_FOUND"));
    }

    @Test
    @DisplayName("PATCH /evaluation/approve 호출 시 200 OK와 승인 완료 응답을 반환한다")
    void approveEvaluation_returnsSuccess() throws Exception {
        // given
        UUID tenantId = UUID.randomUUID();
        UUID applicantId = UUID.randomUUID();

        EvaluationApprovalRequest approvalRequest = EvaluationApprovalRequest.builder()
                .reviewerNotes("최종 면접관 서명 확인")
                .build();

        EvaluationResponse response = EvaluationResponse.builder()
                .id(UUID.randomUUID())
                .tenantId(tenantId)
                .applicantId(applicantId)
                .summary("평가")
                .totalScore(85)
                .passRecommendation(true)
                .reviewedByHuman(true)
                .reviewerNotes("최종 면접관 서명 확인")
                .evidenceSentences(List.of())
                .build();

        given(evaluationService.approveEvaluation(eq(tenantId), eq(applicantId), any(EvaluationApprovalRequest.class)))
                .willReturn(response);

        // when & then
        mockMvc.perform(patch("/api/v1/tenants/{tenantId}/applicants/{applicantId}/evaluation/approve", tenantId, applicantId)
                        .with(TestAuth.recruiter(tenantId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(approvalRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.reviewedByHuman").value(true))
                .andExpect(jsonPath("$.data.reviewerNotes").value("최종 면접관 서명 확인"));
    }
}

