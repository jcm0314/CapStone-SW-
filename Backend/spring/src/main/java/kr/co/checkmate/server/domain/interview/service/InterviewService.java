package kr.co.checkmate.server.domain.interview.service;

import kr.co.checkmate.server.common.exception.EntityNotFoundException;
import kr.co.checkmate.server.domain.applicant.repository.ApplicantRepository;
import kr.co.checkmate.server.domain.interview.dto.InterviewScorecardResponse;
import kr.co.checkmate.server.domain.interview.dto.InterviewScorecardSubmitRequest;
import kr.co.checkmate.server.domain.interview.dto.InterviewSummaryResponse;
import kr.co.checkmate.server.domain.interview.entity.InterviewRecommendation;
import kr.co.checkmate.server.domain.interview.entity.InterviewScorecard;
import kr.co.checkmate.server.domain.interview.repository.InterviewScorecardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InterviewService {

    private final InterviewScorecardRepository scorecardRepository;
    private final ApplicantRepository applicantRepository;

    @Transactional
    public InterviewScorecardResponse submitScorecard(
            UUID tenantId, UUID applicantId, InterviewScorecardSubmitRequest request
    ) {
        applicantRepository.findByTenantIdAndId(tenantId, applicantId)
                .orElseThrow(() -> new EntityNotFoundException("해당 지원자를 찾을 수 없습니다: " + applicantId));

        Optional<InterviewScorecard> existingOpt = scorecardRepository
                .findByTenantIdAndApplicantIdAndInterviewerName(tenantId, applicantId, request.getInterviewerName());

        InterviewScorecard scorecard;
        if (existingOpt.isPresent()) {
            // Upsert: 기존 면접관 채점표 갱신
            scorecard = existingOpt.get();
            scorecard.updateScorecard(request.getRecommendation(), request.getTotalScore(), request.getOverallComment());
            scorecard.clearQuestionEvaluations();
        } else {
            scorecard = InterviewScorecard.builder()
                    .tenantId(tenantId)
                    .applicantId(applicantId)
                    .interviewerName(request.getInterviewerName())
                    .recommendation(request.getRecommendation())
                    .totalScore(request.getTotalScore())
                    .overallComment(request.getOverallComment())
                    .build();
        }

        if (request.getQuestionEvaluations() != null) {
            request.getQuestionEvaluations().forEach(dto -> scorecard.addQuestionEvaluation(dto.toEntity()));
        }

        InterviewScorecard saved = scorecardRepository.save(scorecard);
        return InterviewScorecardResponse.from(saved);
    }

    public InterviewSummaryResponse getInterviewSummary(UUID tenantId, UUID applicantId) {
        applicantRepository.findByTenantIdAndId(tenantId, applicantId)
                .orElseThrow(() -> new EntityNotFoundException("해당 지원자를 찾을 수 없습니다: " + applicantId));

        List<InterviewScorecard> scorecards = scorecardRepository.findByTenantIdAndApplicantId(tenantId, applicantId);

        if (scorecards.isEmpty()) {
            return InterviewSummaryResponse.builder()
                    .applicantId(applicantId)
                    .totalInterviewers(0)
                    .averageScore(0.0)
                    .passCount(0)
                    .failCount(0)
                    .holdCount(0)
                    .consensusRecommendation(InterviewRecommendation.HOLD)
                    .scorecards(List.of())
                    .build();
        }

        int totalCount = scorecards.size();
        double avgScore = scorecards.stream()
                .mapToInt(InterviewScorecard::getTotalScore)
                .average()
                .orElse(0.0);

        int passCount = (int) scorecards.stream().filter(s -> s.getRecommendation() == InterviewRecommendation.PASS).count();
        int failCount = (int) scorecards.stream().filter(s -> s.getRecommendation() == InterviewRecommendation.FAIL).count();
        int holdCount = (int) scorecards.stream().filter(s -> s.getRecommendation() == InterviewRecommendation.HOLD).count();

        InterviewRecommendation consensus;
        if (passCount > failCount && passCount >= (totalCount / 2.0)) {
            consensus = InterviewRecommendation.PASS;
        } else if (failCount > passCount) {
            consensus = InterviewRecommendation.FAIL;
        } else {
            consensus = InterviewRecommendation.HOLD;
        }

        List<InterviewScorecardResponse> responses = scorecards.stream()
                .map(InterviewScorecardResponse::from)
                .toList();

        return InterviewSummaryResponse.builder()
                .applicantId(applicantId)
                .totalInterviewers(totalCount)
                .averageScore(Math.round(avgScore * 10.0) / 10.0)
                .passCount(passCount)
                .failCount(failCount)
                .holdCount(holdCount)
                .consensusRecommendation(consensus)
                .scorecards(responses)
                .build();
    }
}
