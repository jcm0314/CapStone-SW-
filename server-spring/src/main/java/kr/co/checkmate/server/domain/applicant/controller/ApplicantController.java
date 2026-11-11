package kr.co.checkmate.server.domain.applicant.controller;

import jakarta.validation.Valid;
import kr.co.checkmate.server.common.response.ApiResponse;
import kr.co.checkmate.server.domain.applicant.dto.ApplicantCreateRequest;
import kr.co.checkmate.server.domain.applicant.dto.ApplicantResponse;
import kr.co.checkmate.server.domain.applicant.dto.ApplicantStatusUpdateRequest;
import kr.co.checkmate.server.domain.applicant.entity.EvaluationStatus;
import kr.co.checkmate.server.domain.applicant.service.ApplicantService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tenants/{tenantId}/applicants")
@RequiredArgsConstructor
public class ApplicantController {

    private final ApplicantService applicantService;

    @PostMapping
    public ResponseEntity<ApiResponse<ApplicantResponse>> createApplicant(
            @PathVariable UUID tenantId,
            @Valid @RequestBody ApplicantCreateRequest request
    ) {
        ApplicantResponse response = applicantService.createApplicant(tenantId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ApplicantResponse>>> getApplicants(
            @PathVariable UUID tenantId,
            @RequestParam(required = false) EvaluationStatus status
    ) {
        List<ApplicantResponse> response = applicantService.getApplicants(tenantId, status);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{applicantId}")
    public ResponseEntity<ApiResponse<ApplicantResponse>> getApplicant(
            @PathVariable UUID tenantId,
            @PathVariable UUID applicantId
    ) {
        ApplicantResponse response = applicantService.getApplicant(tenantId, applicantId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PatchMapping("/{applicantId}/status")
    public ResponseEntity<ApiResponse<ApplicantResponse>> updateStatus(
            @PathVariable UUID tenantId,
            @PathVariable UUID applicantId,
            @Valid @RequestBody ApplicantStatusUpdateRequest request
    ) {
        ApplicantResponse response = applicantService.updateStatus(tenantId, applicantId, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @DeleteMapping("/{applicantId}")
    public ResponseEntity<ApiResponse<Void>> deleteApplicant(
            @PathVariable UUID tenantId,
            @PathVariable UUID applicantId
    ) {
        applicantService.deleteApplicant(tenantId, applicantId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}

