package kr.co.checkmate.server.domain.auth.dto;

import lombok.Builder;
import lombok.Getter;

/** 명세 #21: { accessToken, expiresIn, user } (+ tokenType) */
@Getter
@Builder
public class LoginResponse {

    private final String accessToken;
    private final String tokenType;
    private final long expiresIn;
    private final AuthUserResponse user;
}
