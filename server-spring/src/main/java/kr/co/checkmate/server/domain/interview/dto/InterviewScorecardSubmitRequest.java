package kr.co.checkmate.server.domain.interview.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import kr.co.checkmate.server.domain.interview.entity.InterviewRecommendation;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InterviewScorecardSubmitRequest {

    @NotBlank(message = "면접관 이름은 필수입니다.")
    private String interviewerName;

    @NotNull(message = "면접 추천 결과(PASS/FAIL/HOLD)는 필수입니다.")
    private InterviewRecommendation recommendation;

    @NotNull(message = "면접 총점은 필수입니다.")
    private Integer totalScore;

    private String overallComment;

    @Builder.Default
    private List<QuestionEvaluationDto> questionEvaluations = new ArrayList<>();
}
