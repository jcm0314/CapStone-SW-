package kr.co.checkmate.server.domain.evaluation.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EvaluationApprovalRequest {

    @NotBlank(message = "검토관 승인 의견 메모는 필수입니다.")
    private String reviewerNotes;
}
