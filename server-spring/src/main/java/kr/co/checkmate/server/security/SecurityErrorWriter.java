package kr.co.checkmate.server.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import kr.co.checkmate.server.common.response.ApiResponse;
import org.springframework.http.MediaType;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * 시큐리티 필터 단계(컨트롤러 진입 전)에서 발생한 401/403/404 를
 * GlobalExceptionHandler 와 동일한 ApiResponse JSON 형식으로 내려줍니다.
 */
public final class SecurityErrorWriter {

    private SecurityErrorWriter() {
    }

    public static void write(ObjectMapper objectMapper, HttpServletResponse response,
                             int status, String code, String message) throws IOException {
        response.setStatus(status);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), ApiResponse.failure(code, message));
    }
}
