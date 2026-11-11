package kr.co.checkmate.server.domain.evaluation.controller;

import jakarta.validation.Valid;
import kr.co.checkmate.server.common.response.ApiResponse;
import kr.co.checkmate.server.domain.evaluation.dto.EvaluationApprovalRequest;
import kr.co.checkmate.server.domain.evaluation.dto.EvaluationResponse;
import kr.co.checkmate.server.domain.evaluation.dto.EvaluationSaveRequest;
import kr.co.checkmate.server.domain.evaluation.service.EvaluationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tenants/{tenantId}/applicants/{applicantId}/evaluation")
@RequiredArgsConstructor
public class EvaluationController {

    private final EvaluationService evaluationService;

    @PostMapping
    public ResponseEntity<ApiResponse<EvaluationResponse>> saveEvaluation(
            @PathVariable UUID tenantId,
            @PathVariable UUID applicantId,
            @Valid @RequestBody EvaluationSaveRequest request
    ) {
        EvaluationResponse response = evaluationService.saveEvaluation(tenantId, applicantId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<EvaluationResponse>> getEvaluation(
            @PathVariable UUID tenantId,
            @PathVariable UUID applicantId
    ) {
        EvaluationResponse response = evaluationService.getEvaluationByApplicant(tenantId, applicantId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PatchMapping("/approve")
    public ResponseEntity<ApiResponse<EvaluationResponse>> approveEvaluation(
            @PathVariable UUID tenantId,
            @PathVariable UUID applicantId,
            @Valid @RequestBody EvaluationApprovalRequest request
    ) {
        EvaluationResponse response = evaluationService.approveEvaluation(tenantId, applicantId, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}

