package kr.co.checkmate.server.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.checkmate.server.common.tenant.TenantContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * 실제 JWT 발급 → 검증 → 테넌트 격리 → RBAC 까지 전 구간 통합 테스트 (Issue #23).
 * local 프로필의 LocalDataSeeder 가 만든 toss / daangn 테넌트 계정을 사용합니다.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local")
class AuthTenantIsolationIntegrationTest {

    private static final String PASSWORD = "checkmate1234!";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private Session tossRecruiter;
    private Session tossInterviewer;
    private Session daangnRecruiter;

    private record Session(String token, String tenantId) {
        String bearer() {
            return "Bearer " + token;
        }
    }

    @BeforeEach
    void setUp() throws Exception {
        tossRecruiter = login("recruiter@toss.test");
        tossInterviewer = login("interviewer@toss.test");
        daangnRecruiter = login("recruiter@daangn.test");
    }

    private Session login(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", email, "password", PASSWORD))))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode data = objectMapper.readTree(result.getResponse().getContentAsString()).get("data");
        return new Session(data.get("accessToken").asText(), data.get("user").get("tenantId").asText());
    }

    private String createApplicant(Session session, String name) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/tenants/{tenantId}/applicants", session.tenantId())
                        .header(HttpHeaders.AUTHORIZATION, session.bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", name,
                                "targetRole", "백엔드 엔지니어",
                                "coverLetterText", "분산 락을 설계했습니다."))))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("data").get("id").asText();
    }

    // ───────────────────────── 로그인 / me ─────────────────────────

    @Test
    @DisplayName("로그인 성공 시 accessToken, expiresIn, user{id,name,email,role,tenantId,tenantName}을 반환한다")
    void login_success_returnsTokenAndUser() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("email", "Recruiter@Toss.test", "password", PASSWORD))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.data.expiresIn").value(3600))
                .andExpect(jsonPath("$.data.user.id").isNotEmpty())
                .andExpect(jsonPath("$.data.user.email").value("recruiter@toss.test"))
                .andExpect(jsonPath("$.data.user.role").value("RECRUITER"))
                .andExpect(jsonPath("$.data.user.tenantId").value(tossRecruiter.tenantId()))
                .andExpect(jsonPath("$.data.user.tenantName").value("토스페이먼츠"))
                .andExpect(jsonPath("$.data.user.passwordHash").doesNotExist());
    }

    @Test
    @DisplayName("비밀번호가 틀리거나 없는 이메일이면 같은 메시지로 401을 반환한다")
    void login_failure_returnsSameUnauthorizedMessage() throws Exception {
        String wrongPassword = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("email", "recruiter@toss.test", "password", "wrong-password"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"))
                .andReturn().getResponse().getContentAsString();

        String unknownEmail = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("email", "nobody@toss.test", "password", PASSWORD))))
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString();

        assertThat(unknownEmail).isEqualTo(wrongPassword);
    }

    @Test
    @DisplayName("GET /auth/me 는 토큰의 사용자 정보를 반환하고, 토큰이 없으면 401")
    void me_returnsCurrentUser() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me").header(HttpHeaders.AUTHORIZATION, tossInterviewer.bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value("interviewer@toss.test"))
                .andExpect(jsonPath("$.data.role").value("INTERVIEWER"))
                .andExpect(jsonPath("$.data.tenantName").value("토스페이먼츠"));

        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }

    // ───────────────────────── 401 ─────────────────────────

    @Test
    @DisplayName("토큰 없이 테넌트 API를 호출하면 401 (이전에는 permitAll 이라 누구나 접근 가능했음)")
    void tenantApi_withoutToken_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/tenants/{tenantId}/applicants", tossRecruiter.tenantId()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));

        mockMvc.perform(post("/api/v1/tenants/{tenantId}/applicants", tossRecruiter.tenantId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"x\",\"targetRole\":\"x\",\"coverLetterText\":\"x\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("위조/변조된 토큰은 401")
    void tamperedToken_returns401() throws Exception {
        String token = tossRecruiter.token();
        String tampered = token.substring(0, token.length() - 4) + (token.endsWith("AAAA") ? "BBBB" : "AAAA");

        mockMvc.perform(get("/api/v1/tenants/{tenantId}/applicants", tossRecruiter.tenantId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tampered))
                .andExpect(status().isUnauthorized());
    }

    // ───────────────────────── 테넌트 격리 (404) ─────────────────────────

    @Test
    @DisplayName("A사 토큰으로 B사 경로를 호출하면 존재 여부를 숨기고 404")
    void crossTenantPath_returns404() throws Exception {
        String daangnApplicantId = createApplicant(daangnRecruiter, "당근 지원자");

        // 목록 조회
        mockMvc.perform(get("/api/v1/tenants/{tenantId}/applicants", daangnRecruiter.tenantId())
                        .header(HttpHeaders.AUTHORIZATION, tossRecruiter.bearer()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("ENTITY_NOT_FOUND"));

        // 실제로 존재하는 B사 지원자 단건 조회
        mockMvc.perform(get("/api/v1/tenants/{tenantId}/applicants/{id}", daangnRecruiter.tenantId(), daangnApplicantId)
                        .header(HttpHeaders.AUTHORIZATION, tossRecruiter.bearer()))
                .andExpect(status().isNotFound());

        // B사 경로에 쓰기/삭제
        mockMvc.perform(delete("/api/v1/tenants/{tenantId}/applicants/{id}", daangnRecruiter.tenantId(), daangnApplicantId)
                        .header(HttpHeaders.AUTHORIZATION, tossRecruiter.bearer()))
                .andExpect(status().isNotFound());

        // 면접관(쓰기 권한 없음)도 403 이 아닌 404 — 역할 검사보다 테넌트 검사가 먼저
        mockMvc.perform(post("/api/v1/tenants/{tenantId}/applicants", daangnRecruiter.tenantId())
                        .header(HttpHeaders.AUTHORIZATION, tossInterviewer.bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"x\",\"targetRole\":\"x\",\"coverLetterText\":\"x\"}"))
                .andExpect(status().isNotFound());

        // 삭제 시도 후에도 B사 데이터는 그대로
        mockMvc.perform(get("/api/v1/tenants/{tenantId}/applicants/{id}", daangnRecruiter.tenantId(), daangnApplicantId)
                        .header(HttpHeaders.AUTHORIZATION, daangnRecruiter.bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("당근 지원자"));
    }

    @Test
    @DisplayName("자기 테넌트 경로에 B사 지원자 ID를 넣어도 404 (저장소 쿼리도 tenantId 로 한정)")
    void otherTenantsApplicantIdUnderOwnPath_returns404() throws Exception {
        String daangnApplicantId = createApplicant(daangnRecruiter, "당근 지원자2");

        mockMvc.perform(get("/api/v1/tenants/{tenantId}/applicants/{id}", tossRecruiter.tenantId(), daangnApplicantId)
                        .header(HttpHeaders.AUTHORIZATION, tossRecruiter.bearer()))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("경로 tenantId 가 UUID 형식이 아니어도 404")
    void malformedTenantId_returns404() throws Exception {
        mockMvc.perform(get("/api/v1/tenants/not-a-uuid/applicants")
                        .header(HttpHeaders.AUTHORIZATION, tossRecruiter.bearer()))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("요청이 끝나면 TenantContext 가 비워진다")
    void tenantContext_isClearedAfterRequest() throws Exception {
        mockMvc.perform(get("/api/v1/tenants/{tenantId}/applicants", tossRecruiter.tenantId())
                        .header(HttpHeaders.AUTHORIZATION, tossRecruiter.bearer()))
                .andExpect(status().isOk());

        assertThat(TenantContext.getCurrentTenant()).isNull();
    }

    // ───────────────────────── RBAC (403) ─────────────────────────

    @Test
    @DisplayName("INTERVIEWER 는 지원자 등록/삭제·평가 저장·공유링크 생성·가중치 수정 시 403")
    void interviewer_writeOperations_return403() throws Exception {
        String applicantId = createApplicant(tossRecruiter, "토스 지원자");
        String tenantId = tossInterviewer.tenantId();

        mockMvc.perform(post("/api/v1/tenants/{tenantId}/applicants", tenantId)
                        .header(HttpHeaders.AUTHORIZATION, tossInterviewer.bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"x\",\"targetRole\":\"x\",\"coverLetterText\":\"x\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));

        mockMvc.perform(delete("/api/v1/tenants/{tenantId}/applicants/{id}", tenantId, applicantId)
                        .header(HttpHeaders.AUTHORIZATION, tossInterviewer.bearer()))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/tenants/{tenantId}/applicants/{id}/evaluation", tenantId, applicantId)
                        .header(HttpHeaders.AUTHORIZATION, tossInterviewer.bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/tenants/{tenantId}/applicants/{id}/feedback/send", tenantId, applicantId)
                        .header(HttpHeaders.AUTHORIZATION, tossInterviewer.bearer()))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/v1/tenants/{tenantId}/weights", tenantId)
                        .header(HttpHeaders.AUTHORIZATION, tossInterviewer.bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("INTERVIEWER 는 조회와 면접 스코어카드 제출은 가능하다")
    void interviewer_canReadAndSubmitScorecard() throws Exception {
        String applicantId = createApplicant(tossRecruiter, "토스 지원자3");
        String tenantId = tossInterviewer.tenantId();

        mockMvc.perform(get("/api/v1/tenants/{tenantId}/applicants", tenantId)
                        .header(HttpHeaders.AUTHORIZATION, tossInterviewer.bearer()))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/tenants/{tenantId}/applicants/{id}/interviews", tenantId, applicantId)
                        .header(HttpHeaders.AUTHORIZATION, tossInterviewer.bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "interviewerName", "토스 면접관",
                                "recommendation", "PASS",
                                "totalScore", 85))))
                .andExpect(status().isCreated());
    }

    // ───────────────────────── 공개 엔드포인트 ─────────────────────────

    @Test
    @DisplayName("health 와 /api/v1/public/** 는 토큰 없이 접근 가능하다")
    void publicEndpoints_doNotRequireToken() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk());

        // 없는 공유 토큰 → 401 이 아니라 404 (인증 단계를 통과했음을 의미)
        mockMvc.perform(get("/api/v1/public/feedback/{token}", "no-such-token"))
                .andExpect(status().isNotFound());
    }
}
