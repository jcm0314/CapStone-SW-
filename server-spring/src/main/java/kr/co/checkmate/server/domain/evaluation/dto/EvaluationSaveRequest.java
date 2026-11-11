package kr.co.checkmate.server.domain.evaluation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class EvaluationSaveRequest {

    @NotBlank(message = "종합 요약은 필수입니다.")
    private String summary;

    @NotNull(message = "총점은 필수입니다.")
    private Integer totalScore;

    @NotNull(message = "합격 추천 여부는 필수입니다.")
    private Boolean passRecommendation;

    private Integer fitScore;
    private Integer competencyScore;
    private Integer plagiarismScore;

    @Builder.Default
    private List<EvidenceSentenceDto> evidenceSentences = new ArrayList<>();
}
