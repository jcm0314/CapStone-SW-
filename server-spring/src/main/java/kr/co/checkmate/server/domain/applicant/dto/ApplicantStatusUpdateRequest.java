package kr.co.checkmate.server.domain.applicant.dto;

import jakarta.validation.constraints.NotNull;
import kr.co.checkmate.server.domain.applicant.entity.EvaluationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApplicantStatusUpdateRequest {

    @NotNull(message = "평가 상태는 필수입니다.")
    private EvaluationStatus status;

    private Integer finalScore;

    private Boolean passRecommendation;
}
