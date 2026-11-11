package kr.co.checkmate.server.domain.evaluation.dto;

import kr.co.checkmate.server.domain.evaluation.entity.EvaluationResult;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Builder
public class EvaluationResponse {

    private final UUID id;
    private final UUID tenantId;
    private final UUID applicantId;
    private final String summary;
    private final Integer totalScore;
    private final boolean passRecommendation;
    private final Integer fitScore;
    private final Integer competencyScore;
    private final Integer plagiarismScore;
    private final boolean reviewedByHuman;
    private final String reviewerNotes;
    private final List<EvidenceSentenceDto> evidenceSentences;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    public static EvaluationResponse from(EvaluationResult result) {
        List<EvidenceSentenceDto> evidenceDtos = result.getEvidenceSentences().stream()
                .map(EvidenceSentenceDto::from)
                .toList();

        return EvaluationResponse.builder()
                .id(result.getId())
                .tenantId(result.getTenantId())
                .applicantId(result.getApplicantId())
                .summary(result.getSummary())
                .totalScore(result.getTotalScore())
                .passRecommendation(result.isPassRecommendation())
                .fitScore(result.getFitScore())
                .competencyScore(result.getCompetencyScore())
                .plagiarismScore(result.getPlagiarismScore())
                .reviewedByHuman(result.isReviewedByHuman())
                .reviewerNotes(result.getReviewerNotes())
                .evidenceSentences(evidenceDtos)
                .createdAt(result.getCreatedAt())
                .updatedAt(result.getUpdatedAt())
                .build();
    }
}
