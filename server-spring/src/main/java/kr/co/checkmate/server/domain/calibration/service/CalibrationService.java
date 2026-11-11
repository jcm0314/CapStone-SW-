package kr.co.checkmate.server.domain.calibration.service;

import kr.co.checkmate.server.common.exception.BusinessException;
import kr.co.checkmate.server.domain.calibration.dto.CalibrationRecordRequest;
import kr.co.checkmate.server.domain.calibration.dto.CalibrationResponse;
import kr.co.checkmate.server.domain.calibration.dto.WeightProfileResponse;
import kr.co.checkmate.server.domain.calibration.dto.WeightProfileUpsertRequest;
import kr.co.checkmate.server.domain.calibration.entity.CalibrationCorrection;
import kr.co.checkmate.server.domain.calibration.entity.TenantWeightProfile;
import kr.co.checkmate.server.domain.calibration.repository.CalibrationCorrectionRepository;
import kr.co.checkmate.server.domain.calibration.repository.TenantWeightProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CalibrationService {

    private final TenantWeightProfileRepository weightProfileRepository;
    private final CalibrationCorrectionRepository calibrationCorrectionRepository;

    @Transactional
    public WeightProfileResponse saveOrUpdateWeightProfile(UUID tenantId, WeightProfileUpsertRequest request) {
        String role = (request.getJobRole() != null && !request.getJobRole().isBlank())
                ? request.getJobRole().toUpperCase().trim()
                : "DEFAULT";

        int totalWeight = request.getCultureFitWeight()
                + request.getJobCompetencyWeight()
                + request.getProblemSolvingWeight()
                + request.getCollaborationWeight();

        if (totalWeight <= 0) {
            throw new BusinessException("INVALID_WEIGHT", "가중치 합계는 0보다 커야 합니다.");
        }

        TenantWeightProfile profile = weightProfileRepository.findByTenantIdAndJobRole(tenantId, role)
                .map(existing -> {
                    existing.update(
                            request.getCultureFitWeight(),
                            request.getJobCompetencyWeight(),
                            request.getProblemSolvingWeight(),
                            request.getCollaborationWeight(),
                            request.getDescription()
                    );
                    log.info("Updated weight profile for tenant: {}, role: {}", tenantId, role);
                    return existing;
                })
                .orElseGet(() -> {
                    TenantWeightProfile newProfile = TenantWeightProfile.builder()
                            .tenantId(tenantId)
                            .jobRole(role)
                            .cultureFitWeight(request.getCultureFitWeight())
                            .jobCompetencyWeight(request.getJobCompetencyWeight())
                            .problemSolvingWeight(request.getProblemSolvingWeight())
                            .collaborationWeight(request.getCollaborationWeight())
                            .description(request.getDescription())
                            .build();
                    log.info("Created new weight profile for tenant: {}, role: {}", tenantId, role);
                    return weightProfileRepository.save(newProfile);
                });

        return WeightProfileResponse.from(profile);
    }

    public List<WeightProfileResponse> getWeightProfiles(UUID tenantId, String jobRole) {
        if (jobRole != null && !jobRole.isBlank()) {
            String role = jobRole.toUpperCase().trim();
            return weightProfileRepository.findByTenantIdAndJobRole(tenantId, role)
                    .map(p -> List.of(WeightProfileResponse.from(p)))
                    .orElseGet(List::of);
        }
        return weightProfileRepository.findAllByTenantId(tenantId)
                .stream()
                .map(WeightProfileResponse::from)
                .toList();
    }

    @Transactional
    public CalibrationResponse recordCorrection(UUID tenantId, CalibrationRecordRequest request) {
        CalibrationCorrection correction = CalibrationCorrection.builder()
                .tenantId(tenantId)
                .applicantId(request.getApplicantId())
                .evaluationResultId(request.getEvaluationResultId())
                .correctorEmail(request.getCorrectorEmail())
                .originalScore(request.getOriginalScore())
                .correctedScore(request.getCorrectedScore())
                .originalDecision(request.getOriginalDecision())
                .correctedDecision(request.getCorrectedDecision())
                .correctionReason(request.getCorrectionReason())
                .fewShotContextText(request.getFewShotContextText())
                .build();

        CalibrationCorrection saved = calibrationCorrectionRepository.save(correction);
        log.info("Recorded HITL calibration for tenant: {}, applicant: {}, original: {}, corrected: {}",
                tenantId, request.getApplicantId(), request.getOriginalScore(), request.getCorrectedScore());

        return CalibrationResponse.from(saved);
    }

    public List<CalibrationResponse> getCalibrations(UUID tenantId, UUID applicantId) {
        if (applicantId != null) {
            return calibrationCorrectionRepository.findAllByTenantIdAndApplicantIdOrderByCreatedAtDesc(tenantId, applicantId)
                    .stream()
                    .map(CalibrationResponse::from)
                    .toList();
        }
        return calibrationCorrectionRepository.findAllByTenantIdOrderByCreatedAtDesc(tenantId)
                .stream()
                .map(CalibrationResponse::from)
                .toList();
    }
}
