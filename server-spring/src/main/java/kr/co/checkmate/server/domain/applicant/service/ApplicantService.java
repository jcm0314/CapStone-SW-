package kr.co.checkmate.server.domain.applicant.service;

import kr.co.checkmate.server.common.exception.EntityNotFoundException;
import kr.co.checkmate.server.domain.applicant.dto.ApplicantCreateRequest;
import kr.co.checkmate.server.domain.applicant.dto.ApplicantResponse;
import kr.co.checkmate.server.domain.applicant.dto.ApplicantStatusUpdateRequest;
import kr.co.checkmate.server.domain.applicant.entity.Applicant;
import kr.co.checkmate.server.domain.applicant.entity.EvaluationStatus;
import kr.co.checkmate.server.domain.applicant.repository.ApplicantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ApplicantService {

    private final ApplicantRepository applicantRepository;

    @Transactional
    public ApplicantResponse createApplicant(UUID tenantId, ApplicantCreateRequest request) {
        Applicant applicant = Applicant.builder()
                .tenantId(tenantId)
                .name(request.getName())
                .email(request.getEmail())
                .targetRole(request.getTargetRole())
                .coverLetterText(request.getCoverLetterText())
                .status(EvaluationStatus.PENDING)
                .anonymized(request.getAnonymized())
                .build();

        Applicant saved = applicantRepository.save(applicant);
        return ApplicantResponse.from(saved);
    }

    public ApplicantResponse getApplicant(UUID tenantId, UUID applicantId) {
        Applicant applicant = applicantRepository.findByTenantIdAndId(tenantId, applicantId)
                .orElseThrow(() -> new EntityNotFoundException("해당 지원자를 찾을 수 없습니다: " + applicantId));
        return ApplicantResponse.from(applicant);
    }

    public List<ApplicantResponse> getApplicants(UUID tenantId, EvaluationStatus status) {
        List<Applicant> applicants = (status != null)
                ? applicantRepository.findByTenantIdAndStatus(tenantId, status)
                : applicantRepository.findByTenantId(tenantId);

        return applicants.stream()
                .map(ApplicantResponse::from)
                .toList();
    }

    @Transactional
    public ApplicantResponse updateStatus(UUID tenantId, UUID applicantId, ApplicantStatusUpdateRequest request) {
        Applicant applicant = applicantRepository.findByTenantIdAndId(tenantId, applicantId)
                .orElseThrow(() -> new EntityNotFoundException("해당 지원자를 찾을 수 없습니다: " + applicantId));

        if (request.getStatus() == EvaluationStatus.EVALUATING) {
            applicant.startEvaluation();
        } else if (request.getStatus() == EvaluationStatus.COMPLETED) {
            int score = request.getFinalScore() != null ? request.getFinalScore() : 0;
            boolean pass = Boolean.TRUE.equals(request.getPassRecommendation());
            applicant.completeEvaluation(score, pass);
        } else if (request.getStatus() == EvaluationStatus.FAILED) {
            applicant.markFailed();
        }

        return ApplicantResponse.from(applicant);
    }

    @Transactional
    public void deleteApplicant(UUID tenantId, UUID applicantId) {
        Applicant applicant = applicantRepository.findByTenantIdAndId(tenantId, applicantId)
                .orElseThrow(() -> new EntityNotFoundException("해당 지원자를 찾을 수 없습니다: " + applicantId));
        applicantRepository.delete(applicant);
    }
}
