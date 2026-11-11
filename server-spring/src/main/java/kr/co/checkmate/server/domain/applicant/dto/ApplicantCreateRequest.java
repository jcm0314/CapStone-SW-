package kr.co.checkmate.server.domain.applicant.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApplicantCreateRequest {

    @NotBlank(message = "지원자 이름은 필수입니다.")
    private String name;

    private String email;

    @NotBlank(message = "지원 직무는 필수입니다.")
    private String targetRole;

    @NotBlank(message = "자기소개서 본문은 필수입니다.")
    private String coverLetterText;

    private Boolean anonymized;
}
