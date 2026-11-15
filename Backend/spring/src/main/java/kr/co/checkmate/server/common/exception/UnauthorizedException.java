package kr.co.checkmate.server.common.exception;

/** 인증 실패(로그인 실패, 토큰 사용자 없음 등) → 401 */
public class UnauthorizedException extends BusinessException {

    public UnauthorizedException(String message) {
        super("UNAUTHORIZED", message);
    }
}
