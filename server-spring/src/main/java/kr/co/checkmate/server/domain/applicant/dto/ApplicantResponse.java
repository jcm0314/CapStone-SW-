package kr.co.checkmate.server.domain.applicant.dto;

import kr.co.checkmate.server.domain.applicant.entity.Applicant;
import kr.co.checkmate.server.domain.applicant.entity.EvaluationStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class ApplicantResponse {

    private final UUID id;
    private final UUID tenantId;
    private final String name;
    private final String email;
    private final String targetRole;
    private final String coverLetterText;
    private final EvaluationStatus status;
    private final Integer finalScore;
    private final Boolean passRecommendation;
    private final boolean anonymized;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    public static ApplicantResponse from(Applicant applicant) {
        return ApplicantResponse.builder()
                .id(applicant.getId())
                .tenantId(applicant.getTenantId())
                .name(applicant.getName())
                .email(applicant.getEmail())
                .targetRole(applicant.getTargetRole())
                .coverLetterText(applicant.getCoverLetterText())
                .status(applicant.getStatus())
                .finalScore(applicant.getFinalScore())
                .passRecommendation(applicant.getPassRecommendation())
                .anonymized(applicant.isAnonymized())
                .createdAt(applicant.getCreatedAt())
                .updatedAt(applicant.getUpdatedAt())
                .build();
    }
}
