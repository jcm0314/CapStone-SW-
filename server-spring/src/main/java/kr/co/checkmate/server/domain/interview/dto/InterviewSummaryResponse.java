package kr.co.checkmate.server.domain.interview.dto;

import kr.co.checkmate.server.domain.interview.entity.InterviewRecommendation;
import lombok.Builder;
import lombok.Getter;

import java.util.List;
import java.util.UUID;

@Getter
@Builder
public class InterviewSummaryResponse {

    private final UUID applicantId;
    private final int totalInterviewers;
    private final double averageScore;
    private final int passCount;
    private final int failCount;
    private final int holdCount;
    private final InterviewRecommendation consensusRecommendation;
    private final List<InterviewScorecardResponse> scorecards;
}
