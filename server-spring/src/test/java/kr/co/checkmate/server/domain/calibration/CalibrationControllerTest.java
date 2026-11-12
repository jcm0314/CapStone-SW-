package kr.co.checkmate.server.domain.calibration;

import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.checkmate.server.common.exception.GlobalExceptionHandler;
import kr.co.checkmate.server.config.SecurityConfig;
import kr.co.checkmate.server.domain.calibration.controller.CalibrationController;
import kr.co.checkmate.server.domain.calibration.dto.CalibrationRecordRequest;
import kr.co.checkmate.server.domain.calibration.dto.CalibrationResponse;
import kr.co.checkmate.server.domain.calibration.dto.WeightProfileResponse;
import kr.co.checkmate.server.domain.calibration.dto.WeightProfileUpsertRequest;
import kr.co.checkmate.server.domain.calibration.service.CalibrationService;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CalibrationController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
class CalibrationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private CalibrationService calibrationService;

    @Test
    @DisplayName("PUT /weights 호출 시 200 OK와 가중치 프로필을 반환한다")
    void saveOrUpdateWeights_returnsOk() throws Exception {
        // given
        UUID tenantId = UUID.randomUUID();
        WeightProfileUpsertRequest request = WeightProfileUpsertRequest.builder()
                .jobRole("BACKEND")
                .cultureFitWeight(25)
                .jobCompetencyWeight(40)
                .problemSolvingWeight(25)
                .collaborationWeight(10)
                .description("백엔드 가중치")
                .build();

        WeightProfileResponse response = WeightProfileResponse.builder()
                .id(UUID.randomUUID())
                .tenantId(tenantId)
                .jobRole("BACKEND")
                .cultureFitWeight(25)
                .jobCompetencyWeight(40)
                .problemSolvingWeight(25)
                .collaborationWeight(10)
                .totalWeight(100)
                .description("백엔드 가중치")
                .updatedAt(LocalDateTime.now())
                .build();

        given(calibrationService.saveOrUpdateWeightProfile(eq(tenantId), any(WeightProfileUpsertRequest.class)))
                .willReturn(response);

        // when & then
        mockMvc.perform(put("/api/v1/tenants/{tenantId}/weights", tenantId)
                        .with(TestAuth.recruiter(tenantId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.jobRole").value("BACKEND"))
                .andExpect(jsonPath("$.data.totalWeight").value(100))
                .andExpect(jsonPath("$.data.cultureFitWeight").value(25));
    }

    @Test
    @DisplayName("GET /weights 호출 시 200 OK와 가중치 프로필 목록을 반환한다")
    void getWeights_returnsList() throws Exception {
        // given
        UUID tenantId = UUID.randomUUID();
        WeightProfileResponse response = WeightProfileResponse.builder()
                .id(UUID.randomUUID())
                .tenantId(tenantId)
                .jobRole("DEFAULT")
                .cultureFitWeight(30)
                .jobCompetencyWeight(30)
                .problemSolvingWeight(25)
                .collaborationWeight(15)
                .totalWeight(100)
                .build();

        given(calibrationService.getWeightProfiles(tenantId, null))
                .willReturn(List.of(response));

        // when & then
        mockMvc.perform(get("/api/v1/tenants/{tenantId}/weights", tenantId)
                        .with(TestAuth.recruiter(tenantId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].jobRole").value("DEFAULT"))
                .andExpect(jsonPath("$.data[0].totalWeight").value(100));
    }

    @Test
    @DisplayName("POST /calibrations 호출 시 201 Created와 교정 결과를 반환한다")
    void recordCalibration_returnsCreated() throws Exception {
        // given
        UUID tenantId = UUID.randomUUID();
        UUID applicantId = UUID.randomUUID();

        CalibrationRecordRequest request = CalibrationRecordRequest.builder()
                .applicantId(applicantId)
                .correctorEmail("hr_lead@naver.com")
                .originalScore(72)
                .correctedScore(88)
                .originalDecision("HOLD")
                .correctedDecision("PASS")
                .correctionReason("문제 해결력 우수 확인")
                .build();

        CalibrationResponse response = CalibrationResponse.builder()
                .id(UUID.randomUUID())
                .tenantId(tenantId)
                .applicantId(applicantId)
                .correctorEmail("hr_lead@naver.com")
                .originalScore(72)
                .correctedScore(88)
                .scoreDelta(16)
                .originalDecision("HOLD")
                .correctedDecision("PASS")
                .correctionReason("문제 해결력 우수 확인")
                .createdAt(LocalDateTime.now())
                .build();

        given(calibrationService.recordCorrection(eq(tenantId), any(CalibrationRecordRequest.class)))
                .willReturn(response);

        // when & then
        mockMvc.perform(post("/api/v1/tenants/{tenantId}/calibrations", tenantId)
                        .with(TestAuth.recruiter(tenantId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.originalScore").value(72))
                .andExpect(jsonPath("$.data.correctedScore").value(88))
                .andExpect(jsonPath("$.data.scoreDelta").value(16));
    }

    @Test
    @DisplayName("POST /calibrations 유효성 검증 실패(이메일 형식 오류 등) 시 400 Bad Request를 반환한다")
    void recordCalibration_invalidEmail_returnsBadRequest() throws Exception {
        // given
        UUID tenantId = UUID.randomUUID();
        CalibrationRecordRequest request = CalibrationRecordRequest.builder()
                .applicantId(UUID.randomUUID())
                .correctorEmail("not-an-email")
                .originalScore(50)
                .correctedScore(60)
                .correctionReason("사유")
                .build();

        // when & then
        mockMvc.perform(post("/api/v1/tenants/{tenantId}/calibrations", tenantId)
                        .with(TestAuth.recruiter(tenantId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }
}
