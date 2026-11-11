package kr.co.checkmate.server.domain.interview.dto;

import kr.co.checkmate.server.domain.interview.entity.InterviewRecommendation;
import kr.co.checkmate.server.domain.interview.entity.InterviewScorecard;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Builder
public class InterviewScorecardResponse {

    private final UUID id;
    private final UUID tenantId;
    private final UUID applicantId;
    private final String interviewerName;
    private final InterviewRecommendation recommendation;
    private final Integer totalScore;
    private final String overallComment;
    private final List<QuestionEvaluationDto> questionEvaluations;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    public static InterviewScorecardResponse from(InterviewScorecard scorecard) {
        List<QuestionEvaluationDto> questions = scorecard.getQuestionEvaluations().stream()
                .map(QuestionEvaluationDto::from)
                .toList();

        return InterviewScorecardResponse.builder()
                .id(scorecard.getId())
                .tenantId(scorecard.getTenantId())
                .applicantId(scorecard.getApplicantId())
                .interviewerName(scorecard.getInterviewerName())
                .recommendation(scorecard.getRecommendation())
                .totalScore(scorecard.getTotalScore())
                .overallComment(scorecard.getOverallComment())
                .questionEvaluations(questions)
                .createdAt(scorecard.getCreatedAt())
                .updatedAt(scorecard.getUpdatedAt())
                .build();
    }
}
