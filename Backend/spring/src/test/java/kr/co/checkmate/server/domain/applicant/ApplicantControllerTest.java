package kr.co.checkmate.server.domain.applicant;

import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.checkmate.server.common.exception.EntityNotFoundException;
import kr.co.checkmate.server.common.exception.GlobalExceptionHandler;
import kr.co.checkmate.server.config.SecurityConfig;
import kr.co.checkmate.server.domain.applicant.controller.ApplicantController;
import kr.co.checkmate.server.domain.applicant.dto.ApplicantCreateRequest;
import kr.co.checkmate.server.domain.applicant.dto.ApplicantResponse;
import kr.co.checkmate.server.domain.applicant.dto.ApplicantStatusUpdateRequest;
import kr.co.checkmate.server.domain.applicant.entity.EvaluationStatus;
import kr.co.checkmate.server.domain.applicant.service.ApplicantService;
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
import static org.mockito.BDDMockito.willDoNothing;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ApplicantController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
class ApplicantControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ApplicantService applicantService;

    @Test
    @DisplayName("POST /api/v1/tenants/{tenantId}/applicants 호출 시 201 Created와 생성된 지원자 정보를 반환한다")
    void createApplicant_returnsCreated() throws Exception {
        // given
        UUID tenantId = UUID.randomUUID();
        UUID applicantId = UUID.randomUUID();

        ApplicantCreateRequest request = ApplicantCreateRequest.builder()
                .name("박민수")
                .email("park@toss.im")
                .targetRole("백엔드 엔지니어")
                .coverLetterText("동시성 제어와 분산 락을 연구했습니다.")
                .anonymized(true)
                .build();

        ApplicantResponse response = ApplicantResponse.builder()
                .id(applicantId)
                .tenantId(tenantId)
                .name("박민수")
                .email("park@toss.im")
                .targetRole("백엔드 엔지니어")
                .coverLetterText("동시성 제어와 분산 락을 연구했습니다.")
                .status(EvaluationStatus.PENDING)
                .anonymized(true)
                .createdAt(LocalDateTime.now())
                .build();

        given(applicantService.createApplicant(eq(tenantId), any(ApplicantCreateRequest.class)))
                .willReturn(response);

        // when & then
        mockMvc.perform(post("/api/v1/tenants/{tenantId}/applicants", tenantId)
                        .with(TestAuth.recruiter(tenantId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(applicantId.toString()))
                .andExpect(jsonPath("$.data.name").value("박민수"))
                .andExpect(jsonPath("$.data.status").value("PENDING"));
    }

    @Test
    @DisplayName("지원자 생성 시 필수 필드(name) 누락 시 400 Bad Request를 반환한다")
    void createApplicant_validationFailure_returnsBadRequest() throws Exception {
        // given
        UUID tenantId = UUID.randomUUID();
        ApplicantCreateRequest invalidRequest = ApplicantCreateRequest.builder()
                .name("") // 빈 이름
                .targetRole("서버")
                .coverLetterText("자소서")
                .build();

        // when & then
        mockMvc.perform(post("/api/v1/tenants/{tenantId}/applicants", tenantId)
                        .with(TestAuth.recruiter(tenantId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT_VALUE"));
    }

    @Test
    @DisplayName("GET /api/v1/tenants/{tenantId}/applicants 호출 시 지원자 목록을 200 OK로 반환한다")
    void getApplicants_returnsList() throws Exception {
        // given
        UUID tenantId = UUID.randomUUID();
        ApplicantResponse res = ApplicantResponse.builder()
                .id(UUID.randomUUID())
                .tenantId(tenantId)
                .name("지원자1")
                .targetRole("서버")
                .coverLetterText("본문")
                .status(EvaluationStatus.PENDING)
                .build();

        given(applicantService.getApplicants(eq(tenantId), any())).willReturn(List.of(res));

        // when & then
        mockMvc.perform(get("/api/v1/tenants/{tenantId}/applicants", tenantId)
                        .with(TestAuth.recruiter(tenantId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].name").value("지원자1"));
    }

    @Test
    @DisplayName("GET /api/v1/tenants/{tenantId}/applicants/{applicantId} 조회 시 없으면 404 Not Found를 반환한다")
    void getApplicant_notFound_returnsNotFound() throws Exception {
        // given
        UUID tenantId = UUID.randomUUID();
        UUID applicantId = UUID.randomUUID();

        given(applicantService.getApplicant(tenantId, applicantId))
                .willThrow(new EntityNotFoundException("해당 지원자를 찾을 수 없습니다: " + applicantId));

        // when & then
        mockMvc.perform(get("/api/v1/tenants/{tenantId}/applicants/{applicantId}", tenantId, applicantId)
                        .with(TestAuth.recruiter(tenantId)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("ENTITY_NOT_FOUND"));
    }

    @Test
    @DisplayName("PATCH /api/v1/tenants/{tenantId}/applicants/{applicantId}/status 호출 시 상태가 갱신된다")
    void updateStatus_returnsUpdatedApplicant() throws Exception {
        // given
        UUID tenantId = UUID.randomUUID();
        UUID applicantId = UUID.randomUUID();

        ApplicantStatusUpdateRequest updateRequest = ApplicantStatusUpdateRequest.builder()
                .status(EvaluationStatus.COMPLETED)
                .finalScore(88)
                .passRecommendation(true)
                .build();

        ApplicantResponse response = ApplicantResponse.builder()
                .id(applicantId)
                .tenantId(tenantId)
                .name("지원자1")
                .targetRole("서버")
                .coverLetterText("본문")
                .status(EvaluationStatus.COMPLETED)
                .finalScore(88)
                .passRecommendation(true)
                .build();

        given(applicantService.updateStatus(eq(tenantId), eq(applicantId), any(ApplicantStatusUpdateRequest.class)))
                .willReturn(response);

        // when & then
        mockMvc.perform(patch("/api/v1/tenants/{tenantId}/applicants/{applicantId}/status", tenantId, applicantId)
                        .with(TestAuth.recruiter(tenantId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("COMPLETED"))
                .andExpect(jsonPath("$.data.finalScore").value(88))
                .andExpect(jsonPath("$.data.passRecommendation").value(true));
    }

    @Test
    @DisplayName("DELETE /api/v1/tenants/{tenantId}/applicants/{applicantId} 호출 시 200 OK를 반환한다")
    void deleteApplicant_returnsSuccess() throws Exception {
        // given
        UUID tenantId = UUID.randomUUID();
        UUID applicantId = UUID.randomUUID();

        willDoNothing().given(applicantService).deleteApplicant(tenantId, applicantId);

        // when & then
        mockMvc.perform(delete("/api/v1/tenants/{tenantId}/applicants/{applicantId}", tenantId, applicantId)
                        .with(TestAuth.recruiter(tenantId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}

