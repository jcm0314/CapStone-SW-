package kr.co.checkmate.server.domain.evaluation.service;

import kr.co.checkmate.server.common.exception.EntityNotFoundException;
import kr.co.checkmate.server.domain.applicant.entity.Applicant;
import kr.co.checkmate.server.domain.applicant.repository.ApplicantRepository;
import kr.co.checkmate.server.domain.evaluation.dto.EvaluationApprovalRequest;
import kr.co.checkmate.server.domain.evaluation.dto.EvaluationResponse;
import kr.co.checkmate.server.domain.evaluation.dto.EvaluationSaveRequest;
import kr.co.checkmate.server.domain.evaluation.entity.EvaluationResult;
import kr.co.checkmate.server.domain.evaluation.repository.EvaluationResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EvaluationService {

    private final EvaluationResultRepository evaluationResultRepository;
    private final ApplicantRepository applicantRepository;

    @Transactional
    public EvaluationResponse saveEvaluation(UUID tenantId, UUID applicantId, EvaluationSaveRequest request) {
        Applicant applicant = applicantRepository.findByTenantIdAndId(tenantId, applicantId)
                .orElseThrow(() -> new EntityNotFoundException("해당 지원자를 찾을 수 없습니다: " + applicantId));

        // 기존 평가 결과가 존재하면 삭제 후 재등록 (신규 평가 갱신)
        evaluationResultRepository.findByTenantIdAndApplicantId(tenantId, applicantId)
                .ifPresent(evaluationResultRepository::delete);

        EvaluationResult evaluation = EvaluationResult.builder()
                .tenantId(tenantId)
                .applicantId(applicantId)
                .summary(request.getSummary())
                .totalScore(request.getTotalScore())
                .passRecommendation(request.getPassRecommendation())
                .fitScore(request.getFitScore())
                .competencyScore(request.getCompetencyScore())
                .plagiarismScore(request.getPlagiarismScore())
                .reviewedByHuman(false)
                .build();

        if (request.getEvidenceSentences() != null) {
            request.getEvidenceSentences().forEach(dto -> evaluation.addEvidenceSentence(dto.toEntity()));
        }

        EvaluationResult saved = evaluationResultRepository.save(evaluation);

        // 지원자 상태를 COMPLETED 및 점수 연동
        applicant.completeEvaluation(request.getTotalScore(), request.getPassRecommendation());

        return EvaluationResponse.from(saved);
    }

    public EvaluationResponse getEvaluationByApplicant(UUID tenantId, UUID applicantId) {
        EvaluationResult evaluation = evaluationResultRepository.findByTenantIdAndApplicantId(tenantId, applicantId)
                .orElseThrow(() -> new EntityNotFoundException("해당 지원자의 평가 결과를 찾을 수 없습니다: " + applicantId));
        return EvaluationResponse.from(evaluation);
    }

    @Transactional
    public EvaluationResponse approveEvaluation(UUID tenantId, UUID applicantId, EvaluationApprovalRequest request) {
        EvaluationResult evaluation = evaluationResultRepository.findByTenantIdAndApplicantId(tenantId, applicantId)
                .orElseThrow(() -> new EntityNotFoundException("해당 지원자의 평가 결과를 찾을 수 없습니다: " + applicantId));

        evaluation.approveByHuman(request.getReviewerNotes());
        return EvaluationResponse.from(evaluation);
    }
}

